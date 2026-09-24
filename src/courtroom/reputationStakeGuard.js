/**
 * Epistemic Credit Score & Reputation Stake Guard.
 * Enforces policy gates for:
 * 1. Interaction weighting (likes and votes discounted based on epistemic credit score).
 * 2. Low-reputation stake-to-post and stake-to-repost (anti-spam / Sybil protection).
 * 3. Influencer broadcast bonds scaled by audience reach.
 * 4. Exponential disinformation penalties with no cost floor/ceiling.
 * 5. Case initiation wagers and surcharge scaling.
 */

import { getGovernancePolicy } from '../config/governancePolicy.js';

export class ReputationStakeGuard {
  /**
   * Calculates the weighted value of an interaction (e.g. like, vote) based on author credit score.
   * Low-reputation or bot-like actors have their likes/votes discounted.
   * @param {Object} params
   * @param {string} params.userDid
   * @param {number} [params.rep=50.0]
   * @param {'LIKE'|'VOTE'} [params.interactionType='LIKE']
   * @returns {Object}
   */
  calculateInteractionWeight({ userDid, rep = 50.0, interactionType = 'LIKE' }) {
    if (!userDid) {
      throw new Error('userDid is required to calculate interaction weight');
    }

    const policy = getGovernancePolicy();

    if (!policy.CREDIT_SCORE_WEIGHTING_ENABLED) {
      return {
        weight: 1.0,
        currentRep: rep,
        discounted: false,
        reason: 'Credit score weighting is disabled'
      };
    }

    const baseline = policy.BASELINE_REPUTATION || 50.0;
    let weight = 1.0;

    if (interactionType === 'LIKE') {
      if (rep >= baseline) {
        // High-reputation boost up to 2.0x
        weight = Math.min(2.0, Math.round((rep / baseline) * 100) / 100);
      } else {
        // Quadratic discounting for low reputation / astroturf accounts
        const ratio = Math.max(0, rep / baseline);
        weight = Math.max(0.01, Math.round(Math.pow(ratio, 2) * 100) / 100);
      }
    } else if (interactionType === 'VOTE') {
      if (rep >= baseline) {
        weight = Math.min(2.0, Math.round((rep / baseline) * 100) / 100);
      } else {
        // Linear down-scaling for juror voting with 0.05 floor
        const ratio = Math.max(0, rep / baseline);
        weight = Math.max(0.05, Math.round(ratio * 100) / 100);
      }
    }

    return {
      weight,
      currentRep: rep,
      discounted: weight < 1.0,
      reason: weight < 1.0
        ? `Interaction discounted to ${weight}x due to low epistemic credit score (${rep} < ${baseline})`
        : `Interaction assigned full credit score weight (${weight}x)`
    };
  }

  /**
   * Computes the exact stake required for an action using exponential disinformation scaling and reach multipliers.
   * Unbounded: There is no ceiling to the cost, making sustained disinformation exponentially ruinous.
   * @param {Object} params
   * @param {number} params.rep
   * @param {number} params.baseStake
   * @param {number} [params.threshold=40.0]
   * @param {number} [params.followers=0]
   * @param {number} [params.disinfoStrikes=0]
   * @param {boolean} [params.isInfluencer=false]
   * @returns {number}
   */
  calculateExponentialStake({
    rep,
    baseStake,
    threshold = 40.0,
    followers = 0,
    disinfoStrikes = 0,
    isInfluencer = false
  }) {
    const policy = getGovernancePolicy();

    if (!policy.EXPONENTIAL_DISINFO_PENALTY_ENABLED) {
      return baseStake;
    }

    // 1. Audience Reach Multiplier (Influencers carry systemic broadcast risk)
    let reachMultiplier = 1.0;
    if (isInfluencer || followers >= policy.INFLUENCER_FOLLOWER_THRESHOLD) {
      const excessFollowers = Math.max(1, followers / policy.INFLUENCER_FOLLOWER_THRESHOLD);
      reachMultiplier = 1.0 + Math.log10(excessFollowers);
    }

    // 2. Reputation Deficit Multiplier (scales exponentially with distance below threshold)
    let repMultiplier = 1.0;
    if (rep < threshold) {
      const deficit = threshold - rep;
      const steps = deficit / (policy.EXPONENTIAL_STEP_POINTS || 5.0);
      repMultiplier = Math.pow(policy.EXPONENTIAL_PENALTY_BASE || 2.0, steps);
    }

    // 3. Disinformation Strike Multiplier (doubles per strike, unbounded)
    const strikeMultiplier = Math.pow(policy.EXPONENTIAL_PENALTY_BASE || 2.0, Math.max(0, disinfoStrikes));

    const totalStake = baseStake * repMultiplier * strikeMultiplier * reachMultiplier;
    return Math.round(totalStake * 100) / 100;
  }

  /**
   * Evaluates whether a post author is permitted to publish based on reputation, reach, and stake.
   * @param {Object} params
   * @param {string} params.authorDid
   * @param {number} params.rep Current reputation score (0.0 to 100.0)
   * @param {number} [params.followers=0]
   * @param {number} [params.disinfoStrikes=0]
   * @param {number} [params.stakeDeposit=0] Amount staked in USDC
   * @returns {Object} Guard verdict and status
   */
  evaluateStakeToPost({
    authorDid,
    rep,
    followers = 0,
    disinfoStrikes = 0,
    stakeDeposit = 0
  }) {
    if (!authorDid) {
      throw new Error('authorDid is required to evaluate stake-to-post');
    }

    const policy = getGovernancePolicy();
    const isInfluencer = followers >= policy.INFLUENCER_FOLLOWER_THRESHOLD;

    // Check influencer requirement
    const influencerNeedsStake =
      policy.INFLUENCER_STAKE_ENABLED &&
      isInfluencer &&
      rep < policy.INFLUENCER_MIN_REP_THRESHOLD;

    // Check general low-rep requirement
    const lowRepNeedsStake =
      policy.STAKE_TO_POST_ENABLED &&
      rep < policy.LOW_REP_THRESHOLD;

    const requiresStake = influencerNeedsStake || lowRepNeedsStake;

    if (!requiresStake) {
      const isVerified = rep >= policy.LOW_REP_THRESHOLD;
      return {
        allowed: true,
        requiresStake: false,
        isExempt: true,
        status: isVerified ? 'PUBLISHED_REPUTATION_VERIFIED' : 'PUBLISHED_UNRESTRICTED',
        currentRep: rep,
        reason: isVerified
          ? 'Author reputation satisfies verified threshold'
          : 'Stake-to-post policy is currently inactive'
      };
    }

    // Determine baseline stake and threshold
    const baseStake = influencerNeedsStake
      ? policy.INFLUENCER_BASE_STAKE_USDC
      : policy.REQUIRED_POST_STAKE_USDC;

    const targetThreshold = influencerNeedsStake
      ? policy.INFLUENCER_MIN_REP_THRESHOLD
      : policy.LOW_REP_THRESHOLD;

    const requiredStake = this.calculateExponentialStake({
      rep,
      baseStake,
      threshold: targetThreshold,
      followers,
      disinfoStrikes,
      isInfluencer
    });

    const deposit = Math.max(0, Number(stakeDeposit || 0));

    if (deposit >= requiredStake) {
      return {
        allowed: true,
        requiresStake: true,
        isExempt: false,
        stakeHeld: deposit,
        requiredStake,
        currentRep: rep,
        threshold: targetThreshold,
        status: 'PUBLISHED_STAKED_PROVISIONAL',
        reason: influencerNeedsStake
          ? `Influencer post approved under audience reach stake bond (${deposit} USDC)`
          : 'Post approved under low-reputation staked bond'
      };
    }

    return {
      allowed: false,
      requiresStake: true,
      isExempt: false,
      currentRep: rep,
      threshold: targetThreshold,
      requiredStake,
      depositProvided: deposit,
      deficit: Math.round((requiredStake - deposit) * 100) / 100,
      reason: influencerNeedsStake
        ? `Influencer reach (${followers} followers) and reputation (${rep} < ${targetThreshold}) requires an escrow bond of at least ${requiredStake} USDC`
        : `Low author reputation (${rep} < ${targetThreshold}) requires a stake bond of at least ${requiredStake} USDC to publish`
    };
  }

  /**
   * Evaluates whether a user can amplify/repost content based on their credit score and reach.
   * @param {Object} params
   * @param {string} params.reposterDid
   * @param {string} params.originalPostId
   * @param {number} params.rep
   * @param {number} [params.followers=0]
   * @param {number} [params.disinfoStrikes=0]
   * @param {number} [params.stakeDeposit=0]
   * @returns {Object}
   */
  evaluateStakeToRepost({
    reposterDid,
    originalPostId,
    rep,
    followers = 0,
    disinfoStrikes = 0,
    stakeDeposit = 0
  }) {
    if (!reposterDid || !originalPostId) {
      throw new Error('reposterDid and originalPostId are required to evaluate stake-to-repost');
    }

    const policy = getGovernancePolicy();

    if (!policy.STAKE_TO_REPOST_ENABLED) {
      return {
        allowed: true,
        requiresStake: false,
        isExempt: true,
        status: 'REPOSTED_UNRESTRICTED',
        reason: 'Stake-to-repost policy is currently inactive'
      };
    }

    const isInfluencer = followers >= policy.INFLUENCER_FOLLOWER_THRESHOLD;
    const isLowRep = rep < policy.LOW_REP_THRESHOLD;
    const isUnderqualifiedInfluencer = isInfluencer && rep < policy.INFLUENCER_MIN_REP_THRESHOLD;

    if (!isLowRep && !isUnderqualifiedInfluencer) {
      return {
        allowed: true,
        requiresStake: false,
        isExempt: true,
        status: 'REPOSTED_REPUTATION_VERIFIED',
        currentRep: rep,
        reason: 'Author reputation satisfies reposting threshold'
      };
    }

    const baseStake = policy.REQUIRED_REPOST_STAKE_USDC || 5.0;
    const targetThreshold = isUnderqualifiedInfluencer ? policy.INFLUENCER_MIN_REP_THRESHOLD : policy.LOW_REP_THRESHOLD;

    const requiredStake = this.calculateExponentialStake({
      rep,
      baseStake,
      threshold: targetThreshold,
      followers,
      disinfoStrikes,
      isInfluencer
    });

    const deposit = Math.max(0, Number(stakeDeposit || 0));

    if (deposit >= requiredStake) {
      return {
        allowed: true,
        requiresStake: true,
        isExempt: false,
        stakeHeld: deposit,
        requiredStake,
        status: 'REPOSTED_STAKED_PROVISIONAL',
        reason: 'Repost approved under escrow bond'
      };
    }

    return {
      allowed: false,
      requiresStake: true,
      isExempt: false,
      currentRep: rep,
      threshold: targetThreshold,
      requiredStake,
      depositProvided: deposit,
      deficit: Math.round((requiredStake - deposit) * 100) / 100,
      reason: `Amplifying content with low reputation (${rep} < ${targetThreshold}) requires an escrow stake of ${requiredStake} USDC`
    };
  }

  /**
   * Evaluates wager surcharge for low-reputation or high-disinformation participants in validation markets.
   * @param {Object} params
   * @param {string} params.bettorDid
   * @param {number} params.rep
   * @param {number} params.baseWager
   * @param {number} [params.disinfoStrikes=0]
   * @returns {Object}
   */
  evaluateWagerSurcharge({ bettorDid, rep, baseWager, disinfoStrikes = 0 }) {
    if (!bettorDid) {
      throw new Error('bettorDid is required to evaluate wager surcharge');
    }

    const policy = getGovernancePolicy();
    const threshold = policy.LOW_REP_THRESHOLD;

    if (rep >= threshold && disinfoStrikes === 0) {
      return {
        requiresSurcharge: false,
        multiplier: 1.0,
        requiredWager: baseWager,
        reason: 'Standard wager pricing applies'
      };
    }

    const deficit = Math.max(0, threshold - rep);
    const deficitMultiplier = 1.0 + (deficit / 20.0);
    const strikeMultiplier = Math.pow(1.5, Math.max(0, disinfoStrikes));
    const totalMultiplier = Math.round(deficitMultiplier * strikeMultiplier * 100) / 100;

    const requiredWager = Math.round(baseWager * totalMultiplier * 100) / 100;

    return {
      requiresSurcharge: true,
      multiplier: totalMultiplier,
      requiredWager,
      reason: `Low epistemic credit score and disinformation record incurs a ${totalMultiplier}x wager cost multiplier`
    };
  }

  /**
   * Evaluates case initiation requirements and formats validation market wager payloads.
   * Supports initiation from both 'SOCIAL_MEDIA' and 'EXTENSION_APP'.
   * @param {Object} params
   * @param {string} params.creatorDid
   * @param {string} [params.source='SOCIAL_MEDIA'] Origin: 'SOCIAL_MEDIA' | 'EXTENSION_APP' | 'DIRECT_API'
   * @param {Object|null} [params.wager=null] Optional or mandatory wager specification
   * @param {number} [params.rep=50.0]
   * @param {number} [params.disinfoStrikes=0]
   * @returns {Object}
   */
  evaluateCaseInitiation({ creatorDid, source = 'SOCIAL_MEDIA', wager = null, rep = 50.0, disinfoStrikes = 0 }) {
    if (!creatorDid) {
      throw new Error('creatorDid is required to evaluate case initiation');
    }

    const policy = getGovernancePolicy();
    const normalizedSource = String(source || 'SOCIAL_MEDIA').toUpperCase();

    if (!policy.ALLOWED_CASE_SOURCES.includes(normalizedSource)) {
      throw new Error(`Unsupported case initiation source: ${source}. Allowed sources: ${policy.ALLOWED_CASE_SOURCES.join(', ')}`);
    }

    let minWagerRequired = policy.MIN_CASE_WAGER_USDC;
    if (policy.CREDIT_SCORE_WEIGHTING_ENABLED || policy.EXPONENTIAL_DISINFO_PENALTY_ENABLED) {
      const surcharge = this.evaluateWagerSurcharge({
        bettorDid: creatorDid,
        rep,
        baseWager: policy.MIN_CASE_WAGER_USDC,
        disinfoStrikes
      });
      minWagerRequired = surcharge.requiredWager;
    }

    const wagerAmount = Math.max(0, Number(wager?.amount || 0));

    // If case initiation wager is mandatory
    if (policy.CASE_WAGER_REQUIRED) {
      if (!wager || wagerAmount < minWagerRequired) {
        return {
          allowed: false,
          source: normalizedSource,
          requiredWager: minWagerRequired,
          wagerProvided: wagerAmount,
          deficit: Math.max(0, minWagerRequired - wagerAmount),
          reason: `Initiating a courtroom case requires an initial validation wager of at least ${minWagerRequired} USDC`
        };
      }
    }

    // Prepare wager metadata
    const hasActiveWager = wagerAmount > 0;
    const wagerMetadata = {
      hasWager: hasActiveWager,
      amount: wagerAmount,
      currency: wager?.currency || 'USDC',
      outcomeThesis: wager?.outcomeThesis || 'TRUE',
      source: normalizedSource,
      marketCreationPayload: hasActiveWager ? this.formatMarketCreationPayload(creatorDid, wager, normalizedSource) : null
    };

    return {
      allowed: true,
      source: normalizedSource,
      wagerMetadata,
      reason: hasActiveWager
        ? `Case initiation accepted with ${wagerAmount} ${wagerMetadata.currency} validation wager`
        : 'Case initiation accepted without mandatory wager'
    };
  }

  /**
   * Formats the dispatch payload for the validation market in veracities.social.
   * @param {string} creatorDid 
   * @param {Object} wager 
   * @param {string} source 
   * @returns {Object}
   */
  formatMarketCreationPayload(creatorDid, wager, source) {
    return {
      creator: creatorDid,
      initialStake: Number(wager.amount),
      thesis: wager.outcomeThesis || 'TRUE',
      currency: wager.currency || 'USDC',
      oracleModel: 'CITIZEN_COURTROOM_EIP712',
      initiationSource: source,
      createdAt: Date.now()
    };
  }
}

export const reputationStakeGuard = new ReputationStakeGuard();
