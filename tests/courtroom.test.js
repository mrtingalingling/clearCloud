import { describe, it, expect } from 'vitest';
import { falsifiabilityGatekeeper } from '../src/courtroom/falsifiabilityGatekeeper.js';
import { caseManager, CASE_STATUS } from '../src/courtroom/caseManager.js';
import { juryEngine } from '../src/courtroom/juryEngine.js';

describe('Feature 1.3: Courtroom Deliberation Engine in ClearCloud', () => {
  it('strictly admits empirical testable claims and rejects subjective preferences', () => {
    // Subjective claim
    const subCheck = falsifiabilityGatekeeper.evaluateClaim('Jazz is better than rock music');
    expect(subCheck.admitted).toBe(false);
    expect(subCheck.category).toBe('SUBJECTIVE_UNVERIFIABLE');

    // Empirical claim
    const empCheck = falsifiabilityGatekeeper.evaluateClaim('Atmospheric CO2 reached 420 ppm in 2024');
    expect(empCheck.admitted).toBe(true);
    expect(empCheck.category).toBe('EMPIRICAL_MEASURABLE');
  });

  it('dockets case and decomposes compound claims into a DAG of sub-claims', () => {
    const compound = 'Global temperatures rose by 1.2C because greenhouse gas emissions increased by 40% resulting in Arctic ice reduction';
    const c = caseManager.openCase({
      title: 'Climate Compound DAG Test',
      claimText: compound,
      creatorDid: 'did:plc:scientist',
      initialDeposit: 200
    });

    expect(c.isDagCompound).toBe(true);
    expect(c.dagNodes.length).toBe(3);
    expect(c.dagNodes[1].dependencies).toContain('sub_0');
    expect(c.dagNodes[2].dependencies).toContain('sub_1');
    expect(c.status).toBe(CASE_STATUS.OPEN);
  });

  it('enforces 14-day cold case refund distribution (94% refunded, 6% protocol fee)', () => {
    const c = caseManager.openCase({
      title: 'Stale Cold Case Trial',
      claimText: 'Specific asteroid passed within 10000 km of Earth in 1999',
      creatorDid: 'did:plc:creator',
      initialDeposit: 1000
    });

    const fifteenDaysInFuture = Date.now() + (15 * 24 * 60 * 60 * 1000);
    const coldReport = caseManager.checkColdStatus(c.caseId, fifteenDaysInFuture);

    expect(coldReport.isCold).toBe(true);
    expect(coldReport.status).toBe(CASE_STATUS.COLD);
    expect(coldReport.platformFeeRetainedPct).toBe(6.0);
    expect(coldReport.platformFee).toBe(60); // 6% of 1000
    expect(coldReport.totalRefunded).toBe(940); // 94% of 1000
  });

  it('supports Challenge Bond appeals and awards 50% bounty when verdict is overturned', () => {
    const c = caseManager.openCase({
      title: 'Initial Case',
      claimText: 'Company X filed for bankruptcy in 2023',
      creatorDid: 'did:plc:trader',
      initialDeposit: 100
    });

    caseManager.settleCase({
      caseId: c.caseId,
      finalVerdict: 'MISINFORMED',
      judgeSummary: 'Initial reports found no filing record.'
    });

    expect(c.status).toBe(CASE_STATUS.RESOLVED);

    // Challenger puts up a 300 bond with fresh SEC filing evidence
    caseManager.appealCase({
      caseId: c.caseId,
      challengerDid: 'did:plc:investigator',
      challengeBond: 300,
      freshEvidence: { url: 'https://sec.gov/filing/12345', title: 'Official Chapter 11 Docket' },
      reason: 'Official court docket proves bankruptcy was filed in Delaware on Dec 28.'
    });

    expect(c.status).toBe(CASE_STATUS.APPEALED);

    // Settle appeal: Overturned to VERIFIED
    const appealSettlement = caseManager.settleAppeal(c.caseId, 'VERIFIED');
    expect(appealSettlement.isOverturned).toBe(true);
    expect(appealSettlement.challengerResult.outcome).toBe('OVERTURNED');
    expect(appealSettlement.challengerResult.bondReturned).toBe(300);
    expect(appealSettlement.challengerResult.bountyReward).toBe(150); // 50% of 300
    expect(appealSettlement.challengerResult.totalPayout).toBe(450);
  });

  it('runs anonymous juror deliberation and AI judicial synthesis', () => {
    const c = caseManager.openCase({
      title: 'Jury Trial Case',
      claimText: 'FDA approved drug candidate Y in 2024',
      creatorDid: 'did:plc:creator',
      initialDeposit: 100
    });

    juryEngine.castVote({
      caseId: c.caseId,
      jurorDid: 'did:plc:juror_1',
      vote: 'AFFIRM',
      argument: 'Verified in FDA official public register table 4.',
      evidenceUrl: 'https://fda.gov/approval-table-4',
      weight: 10
    });

    juryEngine.castVote({
      caseId: c.caseId,
      jurorDid: 'did:plc:juror_2',
      vote: 'AFFIRM',
      argument: 'Confirmed via peer review press release.',
      evidenceUrl: 'https://nature.com/articles/pharma-y',
      weight: 15
    });

    const tally = juryEngine.tallyJury(c.caseId);
    expect(tally.isConsensusReached).toBe(true);
    expect(tally.affirmPct).toBe(100);

    const judicialSynthesis = juryEngine.synthesizeJudicialVerdict(c);
    expect(judicialSynthesis.recommendedVerdict).toBe('VERIFIED');
    expect(judicialSynthesis.evidenceCitations.length).toBe(2);
  });
});
