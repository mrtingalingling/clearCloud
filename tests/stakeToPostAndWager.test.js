import { describe, it, expect, beforeEach } from 'vitest';
import { caseManager } from '../src/courtroom/caseManager.js';
import { feedManager } from '../src/feed/feedManager.js';
import { juryEngine } from '../src/courtroom/juryEngine.js';
import {
  getGovernancePolicy,
  setGovernancePolicy,
  resetGovernancePolicy
} from '../src/config/governancePolicy.js';
import { reputationStakeGuard } from '../src/courtroom/reputationStakeGuard.js';

describe('Governance Policy: Low-Reputation Stake-to-Post & Case Initiation Wager Trigger', () => {
  beforeEach(() => {
    resetGovernancePolicy();
  });

  describe('1. Default Policy Invariants', () => {
    it('verifies both economic gates are disabled by default', () => {
      const policy = getGovernancePolicy();
      expect(policy.STAKE_TO_POST_ENABLED).toBe(false);
      expect(policy.CASE_WAGER_REQUIRED).toBe(false);
      expect(policy.LOW_REP_THRESHOLD).toBe(40.0);
      expect(policy.REQUIRED_POST_STAKE_USDC).toBe(10.0);
      expect(policy.MIN_CASE_WAGER_USDC).toBe(25.0);
      expect(policy.ALLOWED_CASE_SOURCES).toContain('SOCIAL_MEDIA');
      expect(policy.ALLOWED_CASE_SOURCES).toContain('EXTENSION_APP');
    });
  });

  describe('2. Multi-Origin Case Initiation (Disabled Wager Default)', () => {
    it('allows anyone to initiate a courtroom case from social media without a wager', () => {
      const newCase = caseManager.openCase({
        title: 'Social Feed Challenge',
        claimText: 'The central bank raised interest rates by 50 basis points on March 15th',
        creatorDid: 'did:plc:social_citizen_1',
        source: 'SOCIAL_MEDIA'
      });

      expect(newCase.caseId).toBeDefined();
      expect(newCase.source).toBe('SOCIAL_MEDIA');
      expect(newCase.wager.hasWager).toBe(false);
      expect(newCase.status).toBe('OPEN');
    });

    it('allows case initiation from the browser extension app without a wager', () => {
      const extensionCase = caseManager.openCase({
        title: 'Browser Extension Highlighted Claim',
        claimText: 'NASA launched the Artemis mission on November 16 2022',
        creatorDid: 'did:plc:extension_user_42',
        source: 'EXTENSION_APP'
      });

      expect(extensionCase.caseId).toBeDefined();
      expect(extensionCase.source).toBe('EXTENSION_APP');
      expect(extensionCase.wager.hasWager).toBe(false);
    });

    it('records optional wager metadata when provided while wager requirement is disabled', () => {
      const wagerCase = caseManager.openCase({
        title: 'High Conviction User Case',
        claimText: 'The FDA approved the new treatment on January 10th',
        creatorDid: 'did:plc:pro_challenger_99',
        source: 'EXTENSION_APP',
        wager: {
          amount: 50.0,
          currency: 'USDC',
          outcomeThesis: 'TRUE'
        }
      });

      expect(wagerCase.wager.hasWager).toBe(true);
      expect(wagerCase.wager.amount).toBe(50.0);
      expect(wagerCase.wager.currency).toBe('USDC');
      expect(wagerCase.wager.outcomeThesis).toBe('TRUE');
      expect(wagerCase.wager.marketCreationPayload).toBeDefined();
      expect(wagerCase.wager.marketCreationPayload.oracleModel).toBe('CITIZEN_COURTROOM_EIP712');
      expect(wagerCase.totalDepositPool).toBe(50.0);
    });

    it('rejects unsupported case initiation sources', () => {
      expect(() => {
        caseManager.openCase({
          title: 'Malicious Source Case',
          claimText: 'The GDP grew by 2 percent in the fourth quarter',
          creatorDid: 'did:plc:malicious_bot',
          source: 'UNVERIFIED_SCRAPER'
        });
      }).toThrow(/Unsupported case initiation source/);
    });
  });

  describe('3. Case Initiation with Mandatory Wager (Future Activation)', () => {
    beforeEach(() => {
      setGovernancePolicy({ CASE_WAGER_REQUIRED: true, MIN_CASE_WAGER_USDC: 25.0 });
    });

    it('rejects case initiation when no wager is provided and wager is required', () => {
      expect(() => {
        caseManager.openCase({
          title: 'Unwagered Case in Gated Mode',
          claimText: 'The unemployment rate fell to 3.5 percent in December',
          creatorDid: 'did:plc:unfunded_citizen',
          source: 'SOCIAL_MEDIA'
        });
      }).toThrow(/Initiating a courtroom case requires an initial validation wager of at least 25 USDC/);
    });

    it('rejects case initiation when wager is below minimum requirement', () => {
      expect(() => {
        caseManager.openCase({
          title: 'Insufficient Wager Case',
          claimText: 'The unemployment rate fell to 3.5 percent in December',
          creatorDid: 'did:plc:underfunded_citizen',
          source: 'EXTENSION_APP',
          wager: {
            amount: 10.0,
            currency: 'USDC'
          }
        });
      }).toThrow(/Initiating a courtroom case requires an initial validation wager of at least 25 USDC/);
    });

    it('accepts case initiation with valid wager and packages market hook for veracities.social', () => {
      const caseWithWager = caseManager.openCase({
        title: 'Properly Wagered Case in Gated Mode',
        claimText: 'The unemployment rate fell to 3.5 percent in December',
        creatorDid: 'did:plc:funded_citizen',
        source: 'SOCIAL_MEDIA',
        wager: {
          amount: 100.0,
          currency: 'USDC',
          outcomeThesis: 'FALSE'
        }
      });

      expect(caseWithWager.caseId).toBeDefined();
      expect(caseWithWager.wager.hasWager).toBe(true);
      expect(caseWithWager.wager.amount).toBe(100.0);
      expect(caseWithWager.wager.marketCreationPayload.creator).toBe('did:plc:funded_citizen');
      expect(caseWithWager.wager.marketCreationPayload.thesis).toBe('FALSE');
      expect(caseWithWager.totalDepositPool).toBe(100.0);
    });
  });

  describe('4. Low-Reputation Stake-to-Post Guard (Disabled Default)', () => {
    it('allows low-reputation citizens to post freely when stake-to-post is disabled', () => {
      const lowRepDid = 'did:plc:low_rep_user_1';
      feedManager.adjustHiddenReputation(lowRepDid, 'DEBUNKED_POST');
      feedManager.adjustHiddenReputation(lowRepDid, 'DEBUNKED_POST');
      const rep = feedManager.getHiddenReputation(lowRepDid);
      expect(rep).toBeLessThan(40.0);

      const result = feedManager.createPost({
        authorDid: lowRepDid,
        text: 'This is a test post from a low reputation account'
      });

      expect(result.success).toBe(true);
      expect(result.guard.status).toBe('PUBLISHED_UNRESTRICTED');
      expect(result.guard.requiresStake).toBe(false);
      expect(result.post.postId).toBeDefined();
    });
  });

  describe('5. Low-Reputation Stake-to-Post Guard (Future Activation)', () => {
    beforeEach(() => {
      setGovernancePolicy({
        STAKE_TO_POST_ENABLED: true,
        LOW_REP_THRESHOLD: 40.0,
        REQUIRED_POST_STAKE_USDC: 10.0
      });
    });

    it('allows high-reputation citizens to post without staking', () => {
      const highRepDid = 'did:plc:high_rep_scholar';
      feedManager.adjustHiddenReputation(highRepDid, 'VERIFIED_POST');
      feedManager.adjustHiddenReputation(highRepDid, 'JURY_CONSENSUS_AFFIRM');
      const rep = feedManager.getHiddenReputation(highRepDid);
      expect(rep).toBeGreaterThanOrEqual(40.0);

      const result = feedManager.createPost({
        authorDid: highRepDid,
        text: 'Verified scientific findings on climate models'
      });

      expect(result.success).toBe(true);
      expect(result.guard.status).toBe('PUBLISHED_REPUTATION_VERIFIED');
      expect(result.guard.requiresStake).toBe(false);
      expect(result.post.stakeHeld).toBe(0);
    });

    it('rejects post from low-reputation citizen when no stake is provided', () => {
      const slashedDid = 'did:plc:slashed_actor_1';
      feedManager.adjustHiddenReputation(slashedDid, 'COURTROOM_SLASHED');
      const rep = feedManager.getHiddenReputation(slashedDid);
      expect(rep).toBe(25.0); // 50 - 25 = 25.0

      const result = feedManager.createPost({
        authorDid: slashedDid,
        text: 'Spam or unverified claim attempting to bypass'
      });

      expect(result.success).toBe(false);
      expect(result.post).toBeNull();
      expect(result.guard.requiresStake).toBe(true);
      expect(result.guard.requiredStake).toBe(10.0);
      expect(result.guard.deficit).toBe(10.0);
      expect(result.error).toContain('Low author reputation (25 < 40) requires a stake bond of at least 10 USDC');
    });

    it('rejects post when low-reputation citizen provides insufficient stake', () => {
      const penalizedDid = 'did:plc:penalized_actor_2';
      feedManager.adjustHiddenReputation(penalizedDid, 'RAGEBAIT_FLAG');
      const rep = feedManager.getHiddenReputation(penalizedDid);
      expect(rep).toBe(38.0); // 50 - 12 = 38.0

      const result = feedManager.createPost({
        authorDid: penalizedDid,
        text: 'Post with inadequate deposit',
        stakeDeposit: 4.5
      });

      expect(result.success).toBe(false);
      expect(result.guard.deficit).toBe(5.5);
    });

    it('accepts post when low-reputation citizen provides adequate stake bond', () => {
      const reformedDid = 'did:plc:reformed_actor_3';
      feedManager.adjustHiddenReputation(reformedDid, 'COURTROOM_SLASHED');
      const rep = feedManager.getHiddenReputation(reformedDid);
      expect(rep).toBeLessThan(40.0);

      const result = feedManager.createPost({
        authorDid: reformedDid,
        text: 'Controversial claim backed by financial stake',
        stakeDeposit: 10.0
      });

      expect(result.success).toBe(true);
      expect(result.guard.status).toBe('PUBLISHED_STAKED_PROVISIONAL');
      expect(result.guard.requiresStake).toBe(true);
      expect(result.guard.stakeHeld).toBe(10.0);
      expect(result.post.stakeHeld).toBe(10.0);
      expect(result.post.stakeStatus).toBe('PUBLISHED_STAKED_PROVISIONAL');
    });
  });

  describe('6. Epistemic Credit Score: Interaction Weighting (Likes & Reactions)', () => {
    it('returns 1.0x weight for all users when credit score weighting is disabled', () => {
      const weightResult = reputationStakeGuard.calculateInteractionWeight({
        userDid: 'did:plc:low_rep_user',
        rep: 15.0,
        interactionType: 'LIKE'
      });
      expect(weightResult.weight).toBe(1.0);
      expect(weightResult.discounted).toBe(false);
    });

    it('dynamically weights likes based on epistemic credit score when enabled', () => {
      setGovernancePolicy({ CREDIT_SCORE_WEIGHTING_ENABLED: true, BASELINE_REPUTATION: 50.0 });

      // 1. Baseline citizen (rep = 50.0) -> weight 1.0x
      const baseline = reputationStakeGuard.calculateInteractionWeight({
        userDid: 'did:plc:baseline',
        rep: 50.0,
        interactionType: 'LIKE'
      });
      expect(baseline.weight).toBe(1.0);
      expect(baseline.discounted).toBe(false);

      // 2. High-reputation citizen (rep = 75.0) -> boosted weight 1.5x
      const highRep = reputationStakeGuard.calculateInteractionWeight({
        userDid: 'did:plc:scholar',
        rep: 75.0,
        interactionType: 'LIKE'
      });
      expect(highRep.weight).toBe(1.5);
      expect(highRep.discounted).toBe(false);

      // 3. Low-reputation actor (rep = 25.0) -> quadratically discounted (25/50)^2 = 0.25x
      const lowRep = reputationStakeGuard.calculateInteractionWeight({
        userDid: 'did:plc:troll',
        rep: 25.0,
        interactionType: 'LIKE'
      });
      expect(lowRep.weight).toBe(0.25);
      expect(lowRep.discounted).toBe(true);

      // 4. Astroturfing bot (rep = 5.0) -> severe discount (5/50)^2 = 0.01x
      const bot = reputationStakeGuard.calculateInteractionWeight({
        userDid: 'did:plc:bot',
        rep: 5.0,
        interactionType: 'LIKE'
      });
      expect(bot.weight).toBe(0.01);
      expect(bot.discounted).toBe(true);
    });

    it('correctly aggregates weighted likes on feed posts', () => {
      setGovernancePolicy({ CREDIT_SCORE_WEIGHTING_ENABLED: true, BASELINE_REPUTATION: 50.0 });

      const postResult = feedManager.createPost({
        authorDid: 'did:plc:author_1',
        text: 'A claim to be liked'
      });
      const postId = postResult.post.postId;

      // Author 1 (rep = 50.0, weight = 1.0)
      feedManager.likePost({ postId, userDid: 'did:plc:user_norm' });

      // Author 2 (rep = 25.0, weight = 0.25)
      feedManager.adjustHiddenReputation('did:plc:user_low', 'COURTROOM_SLASHED'); // rep = 25.0
      feedManager.likePost({ postId, userDid: 'did:plc:user_low' });

      // Check stored weighted count
      const post = feedManager.posts.get(postId);
      expect(post.likes.length).toBe(2);
      expect(post.weightedLikeCount).toBe(1.25);
    });
  });

  describe('7. Epistemic Credit Score: Juror Vote Weighting', () => {
    it('scales juror voting weights by credit score', () => {
      setGovernancePolicy({ CREDIT_SCORE_WEIGHTING_ENABLED: true, BASELINE_REPUTATION: 50.0 });

      const voteCase = caseManager.openCase({
        title: 'Juror Weight Test',
        claimText: 'Solar energy capacity grew in 2023',
        creatorDid: 'did:plc:case_creator'
      });

      // Juror 1 (High rep = 80.0 -> weight = 1.6)
      const vote1 = juryEngine.castVote({
        caseId: voteCase.caseId,
        jurorDid: 'did:plc:juror_high',
        vote: 'AFFIRM',
        argument: 'Verified by IRENA data',
        rep: 80.0
      });
      expect(vote1.weight).toBe(1.6);

      // Juror 2 (Low rep = 25.0 -> weight = 0.5)
      const vote2 = juryEngine.castVote({
        caseId: voteCase.caseId,
        jurorDid: 'did:plc:juror_low',
        vote: 'DENY',
        argument: 'Disagreed without source',
        rep: 25.0
      });
      expect(vote2.weight).toBe(0.5);

      const tally = juryEngine.tallyJury(voteCase.caseId);
      expect(tally.totalWeight).toBe(2.1);
      expect(tally.affirmWeight).toBe(1.6);
      expect(tally.denyWeight).toBe(0.5);
    });
  });

  describe('8. Stake-to-Repost Guard', () => {
    beforeEach(() => {
      setGovernancePolicy({
        STAKE_TO_REPOST_ENABLED: true,
        LOW_REP_THRESHOLD: 40.0,
        REQUIRED_REPOST_STAKE_USDC: 5.0
      });
    });

    it('allows verified citizens to repost without a stake', () => {
      const origPost = feedManager.createPost({
        authorDid: 'did:plc:orig_author',
        text: 'Original verifiable post'
      });

      const reposterDid = 'did:plc:good_citizen';
      const result = feedManager.repost({
        originalPostId: origPost.post.postId,
        reposterDid
      });

      expect(result.success).toBe(true);
      expect(result.guard.status).toBe('REPOSTED_REPUTATION_VERIFIED');
      expect(result.repost.stakeHeld).toBe(0);
    });

    it('rejects low-reputation users attempting to repost without stake', () => {
      const origPost = feedManager.createPost({
        authorDid: 'did:plc:orig_author_2',
        text: 'Breaking news claim'
      });

      const lowRepDid = 'did:plc:untrusted_reposter';
      feedManager.adjustHiddenReputation(lowRepDid, 'COURTROOM_SLASHED'); // 25.0

      const result = feedManager.repost({
        originalPostId: origPost.post.postId,
        reposterDid: lowRepDid,
        stakeDeposit: 0
      });

      expect(result.success).toBe(false);
      expect(result.guard.requiresStake).toBe(true);
      expect(result.guard.deficit).toBe(5.0);
      expect(result.error).toContain('requires an escrow stake of 5 USDC');
    });

    it('accepts low-reputation repost when adequate stake bond is deposited', () => {
      const origPost = feedManager.createPost({
        authorDid: 'did:plc:orig_author_3',
        text: 'Controversial report'
      });

      const lowRepDid = 'did:plc:staked_reposter';
      feedManager.adjustHiddenReputation(lowRepDid, 'COURTROOM_SLASHED');

      const result = feedManager.repost({
        originalPostId: origPost.post.postId,
        reposterDid: lowRepDid,
        stakeDeposit: 5.0
      });

      expect(result.success).toBe(true);
      expect(result.guard.status).toBe('REPOSTED_STAKED_PROVISIONAL');
      expect(result.repost.stakeHeld).toBe(5.0);
    });
  });

  describe('9. Influencer Staking Requirements Scaled to Reach', () => {
    beforeEach(() => {
      setGovernancePolicy({
        INFLUENCER_STAKE_ENABLED: true,
        INFLUENCER_FOLLOWER_THRESHOLD: 10000,
        INFLUENCER_MIN_REP_THRESHOLD: 60.0,
        INFLUENCER_BASE_STAKE_USDC: 20.0,
        EXPONENTIAL_DISINFO_PENALTY_ENABLED: true
      });
    });

    it('exempts high-reputation influencers above the influencer reputation threshold', () => {
      const influencerDid = 'did:plc:trusted_influencer';
      feedManager.setFollowerCount(influencerDid, 50000);
      feedManager.adjustHiddenReputation(influencerDid, 'VERIFIED_POST');
      feedManager.adjustHiddenReputation(influencerDid, 'VERIFIED_POST');
      feedManager.adjustHiddenReputation(influencerDid, 'VERIFIED_POST');
      feedManager.adjustHiddenReputation(influencerDid, 'VERIFIED_POST');
      feedManager.adjustHiddenReputation(influencerDid, 'VERIFIED_POST');
      feedManager.adjustHiddenReputation(influencerDid, 'VERIFIED_POST');
      feedManager.adjustHiddenReputation(influencerDid, 'VERIFIED_POST'); // rep >= 60.0

      const result = feedManager.createPost({
        authorDid: influencerDid,
        text: 'High-reach verified announcement'
      });

      expect(result.success).toBe(true);
      expect(result.guard.requiresStake).toBe(false);
    });

    it('requires influencers with borderline reputation to post an audience-scaled stake bond', () => {
      const influencerDid = 'did:plc:sensational_influencer';
      feedManager.setFollowerCount(influencerDid, 50000); // 5x threshold: log10(5) ~ 0.699, reachMultiplier ~ 1.699
      // Baseline reputation = 50.0 (< 60.0 threshold)

      const result = feedManager.createPost({
        authorDid: influencerDid,
        text: 'Unconfirmed rumor broadcast to 50k followers',
        stakeDeposit: 0
      });

      expect(result.success).toBe(false);
      expect(result.guard.requiresStake).toBe(true);
      // Base 20.0 * 2^((60-50)/5) * (1 + log10(5)) = 20 * 4 * 1.69897 = 135.92 USDC
      expect(result.guard.requiredStake).toBeGreaterThan(100.0);
      expect(result.error).toContain('Influencer reach (50000 followers)');
    });
  });

  describe('10. Exponential Disinformation Penalties (Unbounded Cost Curve)', () => {
    beforeEach(() => {
      setGovernancePolicy({
        STAKE_TO_POST_ENABLED: true,
        EXPONENTIAL_DISINFO_PENALTY_ENABLED: true,
        LOW_REP_THRESHOLD: 40.0,
        REQUIRED_POST_STAKE_USDC: 10.0,
        EXPONENTIAL_PENALTY_BASE: 2.0,
        EXPONENTIAL_STEP_POINTS: 5.0
      });
    });

    it('doubles required stake for every 5 reputation points below threshold', () => {
      // Rep = 40.0 -> deficit 0 -> multiplier 2^0 = 1.0x -> stake = 10.0 USDC
      const stakeAt40 = reputationStakeGuard.calculateExponentialStake({
        rep: 40.0,
        baseStake: 10.0,
        threshold: 40.0
      });
      expect(stakeAt40).toBe(10.0);

      // Rep = 35.0 -> deficit 5 -> multiplier 2^1 = 2.0x -> stake = 20.0 USDC
      const stakeAt35 = reputationStakeGuard.calculateExponentialStake({
        rep: 35.0,
        baseStake: 10.0,
        threshold: 40.0
      });
      expect(stakeAt35).toBe(20.0);

      // Rep = 30.0 -> deficit 10 -> multiplier 2^2 = 4.0x -> stake = 40.0 USDC
      const stakeAt30 = reputationStakeGuard.calculateExponentialStake({
        rep: 30.0,
        baseStake: 10.0,
        threshold: 40.0
      });
      expect(stakeAt30).toBe(40.0);

      // Rep = 20.0 -> deficit 20 -> multiplier 2^4 = 16.0x -> stake = 160.0 USDC
      const stakeAt20 = reputationStakeGuard.calculateExponentialStake({
        rep: 20.0,
        baseStake: 10.0,
        threshold: 40.0
      });
      expect(stakeAt20).toBe(160.0);
    });

    it('escalates exponentially with disinformation strikes with no ceiling', () => {
      // Rep = 20.0 + 2 disinformation strikes: 10 * 16 * 2^2 = 640.0 USDC
      const stakeWith2Strikes = reputationStakeGuard.calculateExponentialStake({
        rep: 20.0,
        baseStake: 10.0,
        threshold: 40.0,
        disinfoStrikes: 2
      });
      expect(stakeWith2Strikes).toBe(640.0);

      // Rep = 20.0 + 5 disinformation strikes: 10 * 16 * 2^5 = 5,120.0 USDC
      const stakeWith5Strikes = reputationStakeGuard.calculateExponentialStake({
        rep: 20.0,
        baseStake: 10.0,
        threshold: 40.0,
        disinfoStrikes: 5
      });
      expect(stakeWith5Strikes).toBe(5120.0);

      // Confirms sustained disinformation campaigns face exponentially prohibitive costs
      expect(stakeWith5Strikes).toBeGreaterThan(5000);
    });
  });

  describe('11. Low-Reputation / Disinformation Wager Surcharges', () => {
    it('applies cost multiplier for low-rep / penalized bettors in validation markets', () => {
      // Standard citizen
      const cleanWager = reputationStakeGuard.evaluateWagerSurcharge({
        bettorDid: 'did:plc:clean_bettor',
        rep: 50.0,
        baseWager: 25.0
      });
      expect(cleanWager.requiresSurcharge).toBe(false);
      expect(cleanWager.requiredWager).toBe(25.0);

      // Slashed citizen (rep = 20.0, 2 strikes)
      const penalizedWager = reputationStakeGuard.evaluateWagerSurcharge({
        bettorDid: 'did:plc:bad_bettor',
        rep: 20.0,
        baseWager: 25.0,
        disinfoStrikes: 2
      });
      expect(penalizedWager.requiresSurcharge).toBe(true);
      // Deficit = 20 -> 1 + (20/20) = 2.0x; strikes = 2 -> 1.5^2 = 2.25x; total ~ 4.5x
      expect(penalizedWager.multiplier).toBe(4.5);
      expect(penalizedWager.requiredWager).toBe(112.5);
    });
  });
});
