import { describe, it, expect, beforeEach } from 'vitest';
import { caseManager } from '../src/courtroom/caseManager.js';
import { feedManager } from '../src/feed/feedManager.js';
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
});
