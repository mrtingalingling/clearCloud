import { falsifiabilityGatekeeper } from './falsifiabilityGatekeeper.js';
import { reputationStakeGuard } from './reputationStakeGuard.js';

export const CASE_STATUS = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  COLD: 'COLD',
  APPEALED: 'APPEALED'
};

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export class CaseManager {
  constructor() {
    this.cases = new Map();
    this.deposits = new Map();
    this.nextCaseId = 1;
  }

  /**
   * Decomposes compound claims into a Directed Acyclic Graph (DAG) of sub-claims.
   * @param {string} claimText 
   * @returns {Array<Object>}
   */
  decomposeClaim(claimText) {
    if (!claimText) return [];

    const parts = claimText
      .split(/\s+(?:because|and therefore|resulting in|due to the fact that)\s+/i)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (parts.length <= 1) {
      return [{
        nodeId: 'sub_0',
        text: claimText.trim(),
        status: 'OPEN',
        dependencies: []
      }];
    }

    return parts.map((text, idx) => ({
      nodeId: `sub_${idx}`,
      text: text.charAt(0).toUpperCase() + text.slice(1),
      status: 'OPEN',
      dependencies: idx > 0 ? [`sub_${idx - 1}`] : []
    }));
  }

  openCase(params) {
    return this._openCaseInternal(params);
  }

  createCase(params) {
    return this._openCaseInternal(params);
  }

  _openCaseInternal(params) {
    const {
      title,
      claimText,
      creatorDid,
      initialDeposit = 0,
      evidence = [],
      source = 'SOCIAL_MEDIA',
      wager = null
    } = params;

    if (!title || !claimText || !creatorDid) {
      throw new Error('Title, claimText, and creatorDid are required to docket a case');
    }

    const gateCheck = falsifiabilityGatekeeper.evaluateClaim(claimText);
    if (!gateCheck.admitted) {
      throw new Error(`Courtroom Rejection: ${gateCheck.reason}`);
    }

    // Evaluate initiation origin and validation wager requirements
    const wagerCheck = reputationStakeGuard.evaluateCaseInitiation({
      creatorDid,
      source,
      wager
    });

    if (!wagerCheck.allowed) {
      throw new Error(`Courtroom Rejection: ${wagerCheck.reason}`);
    }

    const caseId = `case_${this.nextCaseId++}`;
    const now = Date.now();
    const dagNodes = this.decomposeClaim(claimText);
    const totalInitialDeposit = initialDeposit + (wagerCheck.wagerMetadata.hasWager ? wagerCheck.wagerMetadata.amount : 0);

    const courtroomCase = {
      caseId,
      title,
      claimText,
      creatorDid,
      source: wagerCheck.source,
      status: CASE_STATUS.OPEN,
      category: gateCheck.category,
      createdAt: now,
      lastActivityAt: now,
      totalDepositPool: totalInitialDeposit,
      isDagCompound: dagNodes.length > 1,
      dagNodes,
      evidence: [...evidence],
      juryVotes: [],
      finalVerdict: null,
      judgeSummary: null,
      retrialHistory: [],
      timerResetCount: 0,
      wager: wagerCheck.wagerMetadata
    };

    this.cases.set(caseId, courtroomCase);
    this.deposits.set(caseId, totalInitialDeposit > 0 ? [{ depositorDid: creatorDid, amount: totalInitialDeposit }] : []);
    return courtroomCase;
  }

  /**
   * Layer 1.3 / Anti-Griefing Defense (PRD §4.3.B & Caveat 6)
   * Submits empirical evidence to a docket with CID validation and escalating reset deposits.
   * Prevents bad-faith stakers from resetting the 14-day clock indefinitely with trivial spam.
   */
  submitEvidence(params) {
    const { caseId, contributorDid, uri, description, relevanceScore = 1.0, depositAmount = 0 } = params;
    if (!this.cases.has(caseId)) throw new Error(`Case not found: ${caseId}`);
    if (!contributorDid) throw new Error('contributorDid is required');
    if (!uri) throw new Error('Evidence URI is required');

    // Rule 1: Decentralized Storage CID Verification (RFC-compliant IPFS, Arweave, or DOI)
    const isDecentralizedCid = /^ipfs:\/\/(baf[a-z0-9]+|Qm[a-zA-Z0-9]+)/i.test(uri) ||
                               /^ar:\/\/[a-zA-Z0-9_-]{32,64}/.test(uri) ||
                               /^https:\/\/(doi\.org|gateway\.ipfs\.io|arweave\.net)\/.+/i.test(uri);

    if (!isDecentralizedCid) {
      throw new Error('Evidence must point to a verifiable decentralized CID (ipfs://, ar://) or canonical DOI');
    }

    const c = this.cases.get(caseId);
    if (c.status !== CASE_STATUS.OPEN && c.status !== CASE_STATUS.APPEALED) {
      throw new Error(`Cannot submit evidence to case in status: ${c.status}`);
    }

    // Rule 2: Substantive Relevance Threshold Gate
    const isSubstantive = relevanceScore >= 0.70;

    // Rule 3: Escalating Reset Deposit (First reset free, then 50 * 2^(count - 1): $50, $100, $200)
    const requiredDeposit = c.timerResetCount === 0 ? 0 : 50 * Math.pow(2, c.timerResetCount - 1);
    const hasSufficientDeposit = depositAmount >= requiredDeposit;

    const evidenceEntry = {
      evidenceId: `evi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      contributorDid,
      uri,
      description: description || '',
      relevanceScore,
      submittedAt: Date.now(),
      isSubstantive,
      timerResetGranted: false,
      depositPaid: depositAmount
    };

    if (isSubstantive && hasSufficientDeposit) {
      // Grant clock reset
      evidenceEntry.timerResetGranted = true;
      c.lastActivityAt = Date.now();
      c.timerResetCount += 1;
      if (depositAmount > 0) {
        c.totalDepositPool += depositAmount;
        const pool = this.deposits.get(caseId);
        pool.push({ depositorDid: contributorDid, amount: depositAmount });
      }
    }

    c.evidence.push(evidenceEntry);
    return {
      evidenceId: evidenceEntry.evidenceId,
      timerResetGranted: evidenceEntry.timerResetGranted,
      timerResetCount: c.timerResetCount,
      requiredDepositForNextReset: 50 * Math.pow(2, Math.max(0, c.timerResetCount - 1)),
      evidence: evidenceEntry
    };
  }

  depositWager(caseId, depositorDid, amount) {
    if (!this.cases.has(caseId)) throw new Error(`Case not found: ${caseId}`);
    if (typeof amount !== 'number' || amount <= 0) throw new Error('Deposit must be positive number');

    const c = this.cases.get(caseId);
    if (c.status !== CASE_STATUS.OPEN && c.status !== CASE_STATUS.APPEALED) {
      throw new Error(`Cannot deposit to case in status: ${c.status}`);
    }

    c.totalDepositPool += amount;
    c.lastActivityAt = Date.now();

    const pool = this.deposits.get(caseId);
    pool.push({ depositorDid, amount });
    return { caseId, totalDepositPool: c.totalDepositPool };
  }

  checkColdStatus(caseId, currentTime = Date.now()) {
    if (!this.cases.has(caseId)) throw new Error(`Case not found: ${caseId}`);

    const c = this.cases.get(caseId);
    if (c.status !== CASE_STATUS.OPEN) {
      return { caseId, status: c.status, isCold: false };
    }

    const elapsed = currentTime - c.lastActivityAt;
    if (elapsed < FOURTEEN_DAYS_MS) {
      return { caseId, status: c.status, isCold: false, daysInactive: Math.floor(elapsed / (24 * 3600 * 1000)) };
    }

    // Protocol Rule: 94% refunded, 6% platform maintenance fee
    c.status = CASE_STATUS.COLD;
    const totalPool = c.totalDepositPool;
    const platformFee = Math.round(totalPool * 0.06 * 100) / 100;
    const refundPool = Math.round((totalPool - platformFee) * 100) / 100;

    const depositorList = this.deposits.get(caseId) || [];
    const refunds = depositorList.map(dep => {
      const share = totalPool > 0 ? (dep.amount / totalPool) : 0;
      return {
        depositorDid: dep.depositorDid,
        deposited: dep.amount,
        refunded: Math.round(share * refundPool * 100) / 100
      };
    });

    c.totalDepositPool = 0;

    return {
      caseId,
      status: CASE_STATUS.COLD,
      isCold: true,
      originalPool: totalPool,
      platformFeeRetainedPct: 6.0,
      platformFee,
      totalRefunded: refundPool,
      refunds
    };
  }

  settleCase(params) {
    const { caseId, finalVerdict, judgeSummary } = params;
    if (!this.cases.has(caseId)) throw new Error(`Case not found: ${caseId}`);

    const c = this.cases.get(caseId);
    c.status = CASE_STATUS.RESOLVED;
    c.finalVerdict = finalVerdict;
    c.judgeSummary = judgeSummary;
    c.resolvedAt = Date.now();
    c.lastActivityAt = Date.now();

    for (const node of c.dagNodes) {
      node.status = 'RESOLVED';
    }

    return c;
  }

  appealCase(params) {
    const { caseId, challengerDid, challengeBond, freshEvidence, reason } = params;
    if (!this.cases.has(caseId)) throw new Error(`Case not found: ${caseId}`);
    if (typeof challengeBond !== 'number' || challengeBond <= 0) {
      throw new Error('A positive challenge bond is required to appeal or reopen a case');
    }

    const c = this.cases.get(caseId);
    const previousVerdict = c.finalVerdict;

    c.status = CASE_STATUS.APPEALED;
    c.lastActivityAt = Date.now();
    c.evidence.push(freshEvidence);

    const appealRecord = {
      appealId: `appeal_${c.retrialHistory.length + 1}`,
      challengerDid,
      challengeBond,
      previousVerdict,
      reason,
      freshEvidence,
      appealedAt: Date.now(),
      settled: false
    };

    c.retrialHistory.push(appealRecord);
    this.depositWager(caseId, challengerDid, challengeBond);

    return appealRecord;
  }

  settleAppeal(caseId, newVerdict) {
    if (!this.cases.has(caseId)) throw new Error(`Case not found: ${caseId}`);
    const c = this.cases.get(caseId);
    if (c.status !== CASE_STATUS.APPEALED || c.retrialHistory.length === 0) {
      throw new Error('No active appeal found for this case');
    }

    const activeAppeal = c.retrialHistory[c.retrialHistory.length - 1];
    const isOverturned = newVerdict !== activeAppeal.previousVerdict;

    c.finalVerdict = newVerdict;
    c.status = CASE_STATUS.RESOLVED;
    activeAppeal.settled = true;
    activeAppeal.isOverturned = isOverturned;

    let challengerResult;
    if (isOverturned) {
      const bounty = Math.round(activeAppeal.challengeBond * 0.5 * 100) / 100;
      challengerResult = {
        challengerDid: activeAppeal.challengerDid,
        bondReturned: activeAppeal.challengeBond,
        bountyReward: bounty,
        totalPayout: activeAppeal.challengeBond + bounty,
        outcome: 'OVERTURNED'
      };
    } else {
      challengerResult = {
        challengerDid: activeAppeal.challengerDid,
        bondForfeited: activeAppeal.challengeBond,
        totalPayout: 0,
        outcome: 'REAFFIRMED'
      };
    }

    return {
      caseId,
      newVerdict,
      isOverturned,
      challengerResult
    };
  }
}

export const caseManager = new CaseManager();
