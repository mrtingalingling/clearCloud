/**
 * Reputation Stake Guard & Multi-Origin Case Wager Evaluator.
 * Enforces policy gates for:
 * 1. Low-Reputation Stake-to-Post (anti-spam / Sybil protection)
 * 2. Case Initiation Wager Trigger (from Social Media or Extension App)
 */

import { getGovernancePolicy } from '../config/governancePolicy.js';

export class ReputationStakeGuard {
  /**
   * Evaluates whether a post author is permitted to publish based on reputation and stake.
   * @param {Object} params
   * @param {string} params.authorDid
   * @param {number} params.rep Current reputation score (0.0 to 100.0)
   * @param {number} [params.stakeDeposit=0] Amount staked in USDC
   * @returns {Object} Guard verdict and status
   */
  evaluateStakeToPost({ authorDid, rep, stakeDeposit = 0 }) {
    if (!authorDid) {
      throw new Error('authorDid is required to evaluate stake-to-post');
    }

    const policy = getGovernancePolicy();

    // If stake-to-post is disabled, all users can post freely
    if (!policy.STAKE_TO_POST_ENABLED) {
      return {
        allowed: true,
        requiresStake: false,
        isExempt: true,
        status: 'PUBLISHED_UNRESTRICTED',
        currentRep: rep,
        reason: 'Stake-to-post policy is currently inactive'
      };
    }

    // High / Standard reputation users are exempt from staking
    if (rep >= policy.LOW_REP_THRESHOLD) {
      return {
        allowed: true,
        requiresStake: false,
        isExempt: true,
        status: 'PUBLISHED_REPUTATION_VERIFIED',
        currentRep: rep,
        threshold: policy.LOW_REP_THRESHOLD,
        reason: 'Author reputation satisfies verified threshold'
      };
    }

    // Low reputation user: must provide the required stake bond
    const deposit = Math.max(0, Number(stakeDeposit || 0));
    if (deposit >= policy.REQUIRED_POST_STAKE_USDC) {
      return {
        allowed: true,
        requiresStake: true,
        isExempt: false,
        stakeHeld: deposit,
        currentRep: rep,
        threshold: policy.LOW_REP_THRESHOLD,
        status: 'PUBLISHED_STAKED_PROVISIONAL',
        reason: 'Post approved under low-reputation staked bond'
      };
    }

    return {
      allowed: false,
      requiresStake: true,
      isExempt: false,
      currentRep: rep,
      threshold: policy.LOW_REP_THRESHOLD,
      requiredStake: policy.REQUIRED_POST_STAKE_USDC,
      depositProvided: deposit,
      deficit: Math.round((policy.REQUIRED_POST_STAKE_USDC - deposit) * 100) / 100,
      reason: `Low author reputation (${rep} < ${policy.LOW_REP_THRESHOLD}) requires a stake bond of at least ${policy.REQUIRED_POST_STAKE_USDC} USDC to publish`
    };
  }

  /**
   * Evaluates case initiation requirements and formats validation market wager payloads.
   * Supports initiation from both 'SOCIAL_MEDIA' and 'EXTENSION_APP'.
   * @param {Object} params
   * @param {string} params.creatorDid
   * @param {string} [params.source='SOCIAL_MEDIA'] Origin: 'SOCIAL_MEDIA' | 'EXTENSION_APP' | 'DIRECT_API'
   * @param {Object|null} [params.wager=null] Optional or mandatory wager specification
   * @returns {Object}
   */
  evaluateCaseInitiation({ creatorDid, source = 'SOCIAL_MEDIA', wager = null }) {
    if (!creatorDid) {
      throw new Error('creatorDid is required to evaluate case initiation');
    }

    const policy = getGovernancePolicy();
    const normalizedSource = String(source || 'SOCIAL_MEDIA').toUpperCase();

    if (!policy.ALLOWED_CASE_SOURCES.includes(normalizedSource)) {
      throw new Error(`Unsupported case initiation source: ${source}. Allowed sources: ${policy.ALLOWED_CASE_SOURCES.join(', ')}`);
    }

    const wagerAmount = Math.max(0, Number(wager?.amount || 0));

    // If case initiation wager is mandatory
    if (policy.CASE_WAGER_REQUIRED) {
      if (!wager || wagerAmount < policy.MIN_CASE_WAGER_USDC) {
        return {
          allowed: false,
          source: normalizedSource,
          requiredWager: policy.MIN_CASE_WAGER_USDC,
          wagerProvided: wagerAmount,
          deficit: Math.max(0, policy.MIN_CASE_WAGER_USDC - wagerAmount),
          reason: `Initiating a courtroom case requires an initial validation wager of at least ${policy.MIN_CASE_WAGER_USDC} USDC`
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
