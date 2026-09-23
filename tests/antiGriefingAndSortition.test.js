import { describe, it, expect } from 'vitest';
import { CaseManager, CASE_STATUS } from '../src/courtroom/caseManager.js';
import { SortitionEngine } from '../src/courtroom/sortitionEngine.js';
import { BlindTrialEngine } from '../src/courtroom/blindTrialEngine.js';

describe('Layer 1.3: Anti-Griefing, Staked Civic Sortition & Context-Leak Defense', () => {
  describe('Anti-Griefing Timer Escalation & CID Gates (PRD §4.3.B & Caveat 6)', () => {
    it('grants initial free timer reset for substantive CID evidence', () => {
      const caseMgr = new CaseManager();
      const c = caseMgr.createCase({
        title: 'Superconductivity Test',
        claimText: 'Sample LK-99 displayed zero electrical resistance below 100 Kelvin.',
        creatorDid: 'did:plc:creator'
      });

      const initialActivity = c.lastActivityAt;

      // 1st reset: free with valid CID and substantive relevance >= 0.70
      const res = caseMgr.submitEvidence({
        caseId: c.caseId,
        contributorDid: 'did:plc:researcher',
        uri: 'ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        description: 'Four-point probe resistance measurement curves',
        relevanceScore: 0.95,
        depositAmount: 0
      });

      expect(res.timerResetGranted).toBe(true);
      expect(res.timerResetCount).toBe(1);
      expect(c.evidence.length).toBe(1);
    });

    it('rejects timer reset for non-CID spam or low relevance', () => {
      const caseMgr = new CaseManager();
      const c = caseMgr.createCase({
        title: 'Geopolitical Claim',
        claimText: 'Entity X transferred 50 million treasury bonds.',
        creatorDid: 'did:plc:creator'
      });

      // Invalid URI scheme (not ipfs, ar, or doi) throws Error
      expect(() => {
        caseMgr.submitEvidence({
          caseId: c.caseId,
          contributorDid: 'did:plc:spammer',
          uri: 'http://random-unverified-blog.com/rumor.html',
          relevanceScore: 0.9
        });
      }).toThrow(/verifiable decentralized CID/);

      // Low relevance (< 0.70) records entry but denies timer reset
      const res = caseMgr.submitEvidence({
        caseId: c.caseId,
        contributorDid: 'did:plc:troll',
        uri: 'ipfs://bafkreitestcidforlowrelevancespamentry000000000000000000000',
        relevanceScore: 0.35,
        depositAmount: 0
      });

      expect(res.timerResetGranted).toBe(false);
      expect(c.timerResetCount).toBe(0);
    });

    it('enforces escalating deposit for subsequent clock resets ($50 -> $100 -> $200)', () => {
      const caseMgr = new CaseManager();
      const c = caseMgr.createCase({
        title: 'Corporate Investigation',
        claimText: 'Entity A committed securities fraud in Q4 2023.',
        creatorDid: 'did:plc:creator'
      });

      // 1st reset (free)
      caseMgr.submitEvidence({
        caseId: c.caseId,
        contributorDid: 'did:plc:auditor1',
        uri: 'ipfs://bafkreifirstevidencevalidcid000000000000000000000000000000',
        relevanceScore: 0.9,
        depositAmount: 0
      });
      expect(c.timerResetCount).toBe(1);

      // 2nd reset: requires $50 deposit
      const denied2nd = caseMgr.submitEvidence({
        caseId: c.caseId,
        contributorDid: 'did:plc:staker_prolong',
        uri: 'ar://arweaveTxIdHashString43CharsLength12345678',
        relevanceScore: 0.85,
        depositAmount: 10 // insufficient ($10 < $50)
      });
      expect(denied2nd.timerResetGranted).toBe(false);
      expect(c.timerResetCount).toBe(1);

      // 2nd reset with full $50 deposit
      const granted2nd = caseMgr.submitEvidence({
        caseId: c.caseId,
        contributorDid: 'did:plc:staker_prolong',
        uri: 'ar://arweaveTxIdHashString43CharsLength12345678',
        relevanceScore: 0.85,
        depositAmount: 50 // valid ($50)
      });
      expect(granted2nd.timerResetGranted).toBe(true);
      expect(c.timerResetCount).toBe(2);

      // 3rd reset: requires $100 deposit (50 * 2^1)
      const granted3rd = caseMgr.submitEvidence({
        caseId: c.caseId,
        contributorDid: 'did:plc:whistleblower3',
        uri: 'https://doi.org/10.1038/s41586-024-0000-0',
        relevanceScore: 0.99,
        depositAmount: 100
      });
      expect(granted3rd.timerResetGranted).toBe(true);
      expect(c.timerResetCount).toBe(3);
    });
  });

  describe('Sybil-Resistant Staked Civic Sortition (Caveat 3 & PRD §4.3.C)', () => {
    it('accepts citizen registration with Proof of Humanity or Staked Bond', () => {
      const sortition = new SortitionEngine();

      // Citizen with Gitcoin Passport / WorldID score >= 20
      const c1 = sortition.registerCitizen({
        did: 'did:plc:human_alice',
        humanityScore: 28,
        stakedBond: 0,
        epistemicQuotient: 80
      });
      expect(c1.did).toBe('did:plc:human_alice');

      // Citizen with Staked Civic Bond >= 10 USDC
      const c2 = sortition.registerCitizen({
        did: 'did:plc:staker_bob',
        humanityScore: 5,
        stakedBond: 25,
        epistemicQuotient: 65
      });
      expect(c2.did).toBe('did:plc:staker_bob');
    });

    it('rejects sybil burner DIDs with no humanity score and no staked bond', () => {
      const sortition = new SortitionEngine();

      expect(() => {
        sortition.registerCitizen({
          did: 'did:plc:sybil_bot_001',
          humanityScore: 2,
          stakedBond: 0
        });
      }).toThrow(/Citizen must provide verified Proof of Humanity/);
    });

    it('filters unverified candidates when summoning jury panel', () => {
      const sortition = new SortitionEngine(3);

      sortition.registerCitizen({
        did: 'did:plc:valid_juror_1',
        humanityScore: 30,
        stakedBond: 100,
        epistemicQuotient: 90
      });

      const jury = sortition.summonJuryForCase('case_sybil_test');
      expect(jury.length).toBe(3);
      for (const juror of jury) {
        expect(sortition.isJurorSummoned('case_sybil_test', juror)).toBe(true);
      }
    });
  });

  describe('Deep Semantic Paraphraser & Decoy Dockets (Caveat 8 & PRD §4.3.B)', () => {
    it('transforms clickbait viral headline into formal predicate logic proposition', () => {
      const blind = new BlindTrialEngine();
      const viralHeadline = 'BREAKING: Sam Altman was fired by the board on Friday!';
      const paraphrased = blind.deepSemanticParaphrase(viralHeadline);

      expect(paraphrased).toContain('Proposition P:');
      expect(paraphrased).not.toContain('BREAKING');
      expect(paraphrased).not.toContain('Sam');
      expect(paraphrased).not.toContain('fired');
      expect(paraphrased).toContain('executed involuntary cessation of contract with');
    });

    it('generates plausible decoy calibration dockets and interleaves them', () => {
      const blind = new BlindTrialEngine();
      const realCases = [
        { caseId: 'real_case_1', title: 'Case 1' },
        { caseId: 'real_case_2', title: 'Case 2' },
        { caseId: 'real_case_3', title: 'Case 3' },
        { caseId: 'real_case_4', title: 'Case 4' }
      ];

      const interleaved = blind.interleaveDecoyDockets(realCases, 0.5);
      expect(interleaved.length).toBeGreaterThan(realCases.length);
      const decoys = interleaved.filter(c => c.isDecoy);
      expect(decoys.length).toBeGreaterThan(0);
      expect(decoys[0].syntheticEvidenceCid).toMatch(/^ipfs:\/\/bafkreidecoy/);
    });
  });
});
