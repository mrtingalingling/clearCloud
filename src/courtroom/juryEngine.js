/**
 * Feature 1.3: Courtroom Jury & AI Judge Deliberation Engine
 * Provides anonymous stake-weighted juror voting, civic sortition enforcement,
 * conflict-of-interest recusal, and AI judicial synthesis with evidence attribution.
 */

import { sortitionEngine } from './sortitionEngine.js';
import { reputationStakeGuard } from './reputationStakeGuard.js';
import { getGovernancePolicy } from '../config/governancePolicy.js';

export class JuryEngine {
  constructor() {
    this.caseVotes = new Map();
    this.recusedJurors = new Map(); // caseId -> Map<jurorDid, reason>
  }

  /**
   * Recuses a juror from participating in a case due to conflict of interest.
   */
  recuseJuror(caseId, jurorDid, reason = 'Active financial stake in validation market') {
    if (!this.recusedJurors.has(caseId)) {
      this.recusedJurors.set(caseId, new Map());
    }
    this.recusedJurors.get(caseId).set(jurorDid, reason);
  }

  isRecused(caseId, jurorDid) {
    return this.recusedJurors.has(caseId) && this.recusedJurors.get(caseId).has(jurorDid);
  }

  castVote(params) {
    const {
      caseId,
      jurorDid,
      vote,
      argument,
      evidenceUrl,
      weight = 1.0,
      enforceSortition = false
    } = params;

    if (!caseId || !jurorDid || !vote || !argument) {
      throw new Error('caseId, jurorDid, vote, and argument are required');
    }

    if (!['AFFIRM', 'DENY', 'NEED_MORE_PROOF'].includes(vote)) {
      throw new Error('Vote must be AFFIRM, DENY, or NEED_MORE_PROOF');
    }

    // 1. Conflict of Interest Check
    if (this.isRecused(caseId, jurorDid)) {
      const reason = this.recusedJurors.get(caseId).get(jurorDid);
      throw new Error(`RECUSED: Juror ${jurorDid} is disqualified from case ${caseId} (${reason}).`);
    }

    // 2. Sortition Check (Civic Jury Summons)
    if (enforceSortition && !sortitionEngine.isJurorSummoned(caseId, jurorDid)) {
      throw new Error(`UNSUMMONED: Juror ${jurorDid} has not been summoned for civic jury duty on case ${caseId}.`);
    }

    if (!this.caseVotes.has(caseId)) {
      this.caseVotes.set(caseId, []);
    }

    const votes = this.caseVotes.get(caseId);
    if (votes.some(v => v.jurorDid === jurorDid)) {
      throw new Error(`Juror ${jurorDid} has already cast a vote in case ${caseId}`);
    }

    let finalWeight = weight;
    if (params.rep !== undefined || getGovernancePolicy().CREDIT_SCORE_WEIGHTING_ENABLED) {
      const jurorRep = params.rep !== undefined ? Number(params.rep) : 50.0;
      const weightResult = reputationStakeGuard.calculateInteractionWeight({
        userDid: jurorDid,
        rep: jurorRep,
        interactionType: 'VOTE'
      });
      finalWeight = weightResult.weight;
    }

    const voteRecord = {
      voteId: `vote_${votes.length + 1}`,
      caseId,
      jurorDid,
      vote,
      argument,
      evidenceUrl: evidenceUrl || null,
      weight: finalWeight,
      timestamp: Date.now()
    };

    votes.push(voteRecord);
    return voteRecord;
  }

  tallyJury(caseId) {
    const votes = this.caseVotes.get(caseId) || [];

    let affirmWeight = 0;
    let denyWeight = 0;
    let needProofWeight = 0;
    let totalWeight = 0;

    for (const v of votes) {
      if (v.vote === 'AFFIRM') affirmWeight += v.weight;
      if (v.vote === 'DENY') denyWeight += v.weight;
      if (v.vote === 'NEED_MORE_PROOF') needProofWeight += v.weight;
      totalWeight += v.weight;
    }

    const decisiveWeight = affirmWeight + denyWeight;
    const affirmPct = decisiveWeight > 0 ? (affirmWeight / decisiveWeight) * 100 : 0;
    const denyPct = decisiveWeight > 0 ? (denyWeight / decisiveWeight) * 100 : 0;

    return {
      caseId,
      totalVotes: votes.length,
      totalWeight,
      affirmWeight,
      denyWeight,
      needProofWeight,
      affirmPct: Math.round(affirmPct * 10) / 10,
      denyPct: Math.round(denyPct * 10) / 10,
      isConsensusReached: (affirmPct >= 66.7 || denyPct >= 66.7) && votes.length >= 2
    };
  }

  synthesizeJudicialVerdict(caseObjOrId) {
    const caseId = typeof caseObjOrId === 'object' && caseObjOrId !== null ? caseObjOrId.caseId : caseObjOrId;
    const tally = this.tallyJury(caseId);
    const votes = this.caseVotes.get(caseId) || [];

    let recommendedVerdict = 'NEED_CONTEXT';
    let reasoning = 'Insufficient decisive juror consensus to conclude proof.';
    let winningVoteType = null;

    if (tally.isConsensusReached) {
      if (tally.affirmPct >= 66.7) {
        recommendedVerdict = 'VERIFIED';
        winningVoteType = 'AFFIRM';
        reasoning = `Overwhelming juror consensus (${tally.affirmPct}%) backed by primary documentation affirms this claim.`;
      } else if (tally.denyPct >= 66.7) {
        recommendedVerdict = 'MISINFORMED';
        winningVoteType = 'DENY';
        reasoning = `Overwhelming juror consensus (${tally.denyPct}%) backed by documented counter-evidence refutes this claim.`;
      }
    } else if (votes.length > 0 && tally.needProofWeight > tally.affirmWeight) {
      recommendedVerdict = 'DISPUTED';
      reasoning = 'Conflicting evidence and substantial requests for primary citations remain unaddressed.';
    }

    // Find decisive evidence contributor (first juror who submitted evidence aligning with the winning verdict)
    let decisiveEvidenceUrl = null;
    let decisiveEvidenceContributorDid = null;

    if (winningVoteType) {
      const decisiveVote = votes.find(v => v.vote === winningVoteType && v.evidenceUrl);
      if (decisiveVote) {
        decisiveEvidenceUrl = decisiveVote.evidenceUrl;
        decisiveEvidenceContributorDid = decisiveVote.jurorDid;
      }
    }

    return {
      caseId,
      recommendedVerdict,
      verdict: recommendedVerdict,
      confidence: tally.isConsensusReached ? Math.round(Math.max(tally.affirmPct, tally.denyPct)) / 100 : 0.5,
      reasoning,
      tally,
      evidenceCitations: votes.filter(v => v.evidenceUrl).map(v => v.evidenceUrl),
      decisiveEvidenceUrl,
      decisiveEvidenceContributorDid,
      participatingJurorDids: votes.map(v => v.jurorDid),
      concludedAt: new Date().toISOString()
    };
  }
}

export const juryEngine = new JuryEngine();
