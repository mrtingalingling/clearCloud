import { describe, it, expect, beforeEach } from 'vitest';
import { blindTrialEngine } from '../src/courtroom/blindTrialEngine.js';
import { sortitionEngine } from '../src/courtroom/sortitionEngine.js';
import { JuryEngine } from '../src/courtroom/juryEngine.js';

describe('Blind Trial Engine & Algorithmic Sortition', () => {
  describe('Blind Trial Proposition Abstractor', () => {
    it('strips prejudicial emotional terms and anonymizes entities and locations', () => {
      const emotionalClaim = 'Corrupt John was brazenly golfing on Monday instead of working!';
      const blind = blindTrialEngine.anonymizeEntities(emotionalClaim);

      expect(blind).not.toContain('Corrupt');
      expect(blind).not.toContain('brazenly');
      expect(blind).not.toContain('John');
      expect(blind).not.toContain('golfing');
      expect(blind).toContain('[Entity_A]');
      expect(blind).toContain('[Location_Recreational_X]');
    });

    it('evaluates spatio-temporal mutual exclusivity (e.g. Golf Course vs Doctor at same time)', () => {
      const proof = blindTrialEngine.evaluateMutualExclusivity({
        subject: 'Entity_A',
        claimedLocation: 'Location_Recreational_X',
        claimedTime: 'Monday 10:00 AM',
        provenLocation: 'Location_Medical_Y',
        provenTime: 'Monday 10:00 AM',
        evidenceConfidence: 0.95
      });

      expect(proof.isContradiction).toBe(true);
      expect(proof.status).toBe('MUTUALLY_EXCLUSIVE_FALSIFIED');
      expect(proof.logicalProof).toContain('Physical impossibility');
      expect(proof.recommendedVerdict).toBe('MISINFORMED');
    });

    it('generates a complete blind docket structure from a raw case object', () => {
      const caseObj = {
        caseId: 'case_test_99',
        claimText: 'John was golfing on Monday',
        evidenceRecords: [{ text: 'Appointment record at doctor clinic on Monday' }]
      };

      const blindDocket = blindTrialEngine.generateBlindDocket(caseObj);
      expect(blindDocket.isBlindTrial).toBe(true);
      expect(blindDocket.anonymizedClaim).toContain('[Entity_A]');
      expect(blindDocket.mutualExclusivityAnalysis.isContradiction).toBe(true);
    });
  });

  describe('Civic Sortition Engine', () => {
    it('deterministically summons a 7-juror panel excluding the case creator', () => {
      const caseId = 'case_fusion_experiment_1';
      const creatorDid = 'did:plc:alice.bsky.social';

      const panel1 = sortitionEngine.summonJuryForCase(caseId, creatorDid);
      const panel2 = sortitionEngine.summonJuryForCase(caseId, creatorDid);

      expect(panel1.length).toBe(7);
      expect(panel1).toEqual(panel2); // deterministic
      expect(panel1).not.toContain(creatorDid); // creator excluded
    });

    it('verifies whether an identity has been summoned for duty', () => {
      const caseId = 'case_climate_metric_42';
      const summoned = sortitionEngine.summonJuryForCase(caseId);
      const jurorDid = summoned[0];

      expect(sortitionEngine.isJurorSummoned(caseId, jurorDid)).toBe(true);
      expect(sortitionEngine.isJurorSummoned(caseId, 'did:plc:random_unsummoned_bot')).toBe(false);
    });
  });

  describe('JuryEngine Conflict of Interest Recusal & Sortition Enforcement', () => {
    let jury;
    const caseId = 'case_finance_takeover';

    beforeEach(() => {
      jury = new JuryEngine();
    });

    it('rejects vote if juror is recused due to conflict of interest', () => {
      jury.recuseJuror(caseId, 'did:plc:stakeholder_whale', 'Holds $10,000 bet on VERIFIED outcome');

      expect(() => {
        jury.castVote({
          caseId,
          jurorDid: 'did:plc:stakeholder_whale',
          vote: 'AFFIRM',
          argument: 'Looks solid.'
        });
      }).toThrow(/RECUSED: Juror did:plc:stakeholder_whale is disqualified/);
    });

    it('rejects vote if sortition enforcement is enabled and juror is not summoned', () => {
      expect(() => {
        jury.castVote({
          caseId,
          jurorDid: 'did:plc:unsummoned_astroturfer',
          vote: 'DENY',
          argument: 'Astroturfing attempt.',
          enforceSortition: true
        });
      }).toThrow(/UNSUMMONED/);
    });

    it('identifies decisive evidence contributor in judicial verdict synthesis', () => {
      jury.castVote({
        caseId,
        jurorDid: 'did:plc:whistleblower_alice',
        vote: 'DENY',
        argument: 'Here is the timestamped clinic check-in proof.',
        evidenceUrl: 'https://clinic.internal/intake.pdf',
        weight: 1.0
      });

      jury.castVote({
        caseId,
        jurorDid: 'did:plc:nurse_bob',
        vote: 'DENY',
        argument: 'Corroborating witness badge.',
        evidenceUrl: 'https://clinic.internal/badge.png',
        weight: 1.0
      });

      const synthesis = jury.synthesizeJudicialVerdict(caseId);
      expect(synthesis.verdict).toBe('MISINFORMED');
      expect(synthesis.decisiveEvidenceContributorDid).toBe('did:plc:whistleblower_alice');
      expect(synthesis.decisiveEvidenceUrl).toBe('https://clinic.internal/intake.pdf');
    });
  });
});
