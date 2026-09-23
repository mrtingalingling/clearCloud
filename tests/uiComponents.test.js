import { describe, it, expect, beforeEach } from 'vitest';
import { feedManager, CIRCLE_TIERS } from '../src/feed/feedManager.js';
import { caseManager, CASE_STATUS } from '../src/courtroom/caseManager.js';
import { falsifiabilityGatekeeper } from '../src/courtroom/falsifiabilityGatekeeper.js';
import { juryEngine } from '../src/courtroom/juryEngine.js';

describe('clearCloud UI Components Logic Integration', () => {
  const viewerDid = 'did:plc:viewer_integration';
  const closeFriendDid = 'did:plc:close_friend';
  const spammerDid = 'did:plc:spammer';

  beforeEach(() => {
    feedManager.setCircleRelation(viewerDid, closeFriendDid, CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS);
    feedManager.setCircleRelation(viewerDid, spammerDid, CIRCLE_TIERS.TIER_3_NETWORK);
    feedManager.userReputations.set(closeFriendDid, 85.0);
    feedManager.userReputations.set(spammerDid, 25.0);
  });

  describe('FeedView Relational Circles & Rage-Bait Scrubber', () => {
    it('allows intimate personal updates in Tier 1 Close Friends', () => {
      const personalPost = {
        id: 'post_1',
        authorDid: closeFriendDid,
        metrics: { factsPct: 100, opinionPct: 0, falsehoodPct: 0 }
      };

      const result = feedManager.rankPostForViewer(personalPost, viewerDid, true);
      expect(result.visible).toBe(true);
      expect(result.circleTier).toBe(CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS);
    });

    it('filters out non-personal rage-bait when toggle is enabled in Tier 1', () => {
      const rageBaitPost = {
        id: 'post_2',
        authorDid: closeFriendDid,
        metrics: { factsPct: 5, opinionPct: 15, falsehoodPct: 80 }
      };

      // Toggle ON: should be filtered
      const filteredResult = feedManager.rankPostForViewer(rageBaitPost, viewerDid, true);
      expect(filteredResult.visible).toBe(false);
      expect(filteredResult.reason).toContain('Filtered by Tier 1 Personal Rage-Bait Scrubber');

      // Toggle OFF: friend post is visible
      const unfilteredResult = feedManager.rankPostForViewer(rageBaitPost, viewerDid, false);
      expect(unfilteredResult.visible).toBe(true);
    });

    it('throttles low-reputation or low-groundedness posts in Tier 3 Network', () => {
      const scamPost = {
        id: 'post_3',
        authorDid: spammerDid,
        metrics: { factsPct: 0, opinionPct: 10, falsehoodPct: 90 }
      };

      const result = feedManager.rankPostForViewer(scamPost, viewerDid);
      expect(result.visible).toBe(false);
      expect(result.reason).toContain('Throttled');
    });
  });

  describe('CourtroomView Intake & Deliberation Flow', () => {
    it('admits empirical claims to the docket and decomposes DAG nodes', () => {
      const claim = 'Atmospheric CO2 reached 420 ppm in 2024 because industrial emissions increased';
      const gateCheck = falsifiabilityGatekeeper.evaluateClaim(claim);
      expect(gateCheck.admitted).toBe(true);

      const newCase = caseManager.openCase({
        title: 'Atmospheric CO2 2024 Inquiry',
        claimText: claim,
        creatorDid: viewerDid,
        initialDeposit: 100
      });

      expect(newCase.caseId).toBeDefined();
      expect(newCase.status).toBe(CASE_STATUS.OPEN);
      expect(newCase.dagNodes.length).toBe(2);
      expect(newCase.dagNodes[0].nodeId).toBe('sub_0');
      expect(newCase.dagNodes[1].dependencies).toContain('sub_0');
    });

    it('rejects subjective or metaphysical claims at the Courtroom intake gate', () => {
      const subjectiveClaim = 'Abstract expressionism is inherently superior to impressionism';
      const gateCheck = falsifiabilityGatekeeper.evaluateClaim(subjectiveClaim);
      expect(gateCheck.admitted).toBe(false);

      expect(() => {
        caseManager.openCase({
          title: 'Art Preference Trial',
          claimText: subjectiveClaim,
          creatorDid: viewerDid
        });
      }).toThrow(/Courtroom Rejection/);
    });

    it('tallies anonymous juror votes and tests 66.7% supermajority quorum', () => {
      const claim = 'Perovskite solar cells exceeded 27% efficiency in 2024 lab benchmarks';
      const c = caseManager.openCase({
        title: 'Solar Benchmark',
        claimText: claim,
        creatorDid: viewerDid,
        initialDeposit: 200
      });

      // Juror 1 Affirm
      juryEngine.castVote({
        caseId: c.caseId,
        jurorDid: 'did:plc:juror_1',
        vote: 'AFFIRM',
        argument: 'NREL benchmark reports 27.2% certified efficiency.',
        evidenceUrl: 'https://nrel.gov',
        weight: 1.0
      });

      // Juror 2 Affirm
      juryEngine.castVote({
        caseId: c.caseId,
        jurorDid: 'did:plc:juror_2',
        vote: 'AFFIRM',
        argument: 'Independent Fraunhofer ISE confirmation.',
        evidenceUrl: 'https://ise.fraunhofer.de',
        weight: 1.0
      });

      // Juror 3 Deny
      juryEngine.castVote({
        caseId: c.caseId,
        jurorDid: 'did:plc:juror_3',
        vote: 'DENY',
        argument: 'Commercial durability is not proven.',
        weight: 0.5
      });

      const tally = juryEngine.tallyJury(c.caseId);
      // Affirm weight: 2.0, Deny weight: 0.5, Total weight: 2.5 -> Affirm Pct: 2.0 / 2.5 = 80.0%
      expect(tally.affirmPct).toBe(80);
      expect(tally.affirmPct).toBeGreaterThanOrEqual(66.7);

      const synthesis = juryEngine.synthesizeJudicialVerdict(c.caseId, claim);
      expect(synthesis.verdict).toBe('VERIFIED');
      expect(synthesis.confidence).toBeGreaterThanOrEqual(0.667);
    });

    it('enforces Separation of Powers recusal when a juror has a validation market conflict', () => {
      const c = caseManager.openCase({
        title: 'Conflict Test Case',
        claimText: 'Company X reports Q3 revenue beat by 20%',
        creatorDid: viewerDid,
        initialDeposit: 100
      });

      const conflictedJurorDid = 'did:plc:conflicted_staker';
      // Mark as recused due to active financial stake in veracities.social validation market
      juryEngine.recuseJuror(c.caseId, conflictedJurorDid, 'Active financial stake in validation market');

      expect(juryEngine.isRecused(c.caseId, conflictedJurorDid)).toBe(true);
      expect(() => {
        juryEngine.castVote({
          caseId: c.caseId,
          jurorDid: conflictedJurorDid,
          vote: 'AFFIRM',
          argument: 'Looks true to me, I have high confidence.',
          weight: 1.0
        });
      }).toThrow(/RECUSED: Juror did:plc:conflicted_staker is disqualified/);
    });
  });
});

