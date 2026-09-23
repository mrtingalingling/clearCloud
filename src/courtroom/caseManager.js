import { falsifiabilityGatekeeper } from './falsifiabilityGatekeeper.js';

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
    const { title, claimText, creatorDid, initialDeposit = 0, evidence = [] } = params;

    if (!title || !claimText || !creatorDid) {
      throw new Error('Title, claimText, and creatorDid are required to docket a case');
    }

    const gateCheck = falsifiabilityGatekeeper.evaluateClaim(claimText);
    if (!gateCheck.admitted) {
      throw new Error(`Courtroom Rejection: ${gateCheck.reason}`);
    }

    const caseId = `case_${this.nextCaseId++}`;
    const now = Date.now();
    const dagNodes = this.decomposeClaim(claimText);

    const courtroomCase = {
      caseId,
      title,
      claimText,
      creatorDid,
      status: CASE_STATUS.OPEN,
      category: gateCheck.category,
      createdAt: now,
      lastActivityAt: now,
      totalDepositPool: initialDeposit,
      isDagCompound: dagNodes.length > 1,
      dagNodes,
      evidence: [...evidence],
      juryVotes: [],
      finalVerdict: null,
      judgeSummary: null,
      retrialHistory: []
    };

    this.cases.set(caseId, courtroomCase);
    this.deposits.set(caseId, initialDeposit > 0 ? [{ depositorDid: creatorDid, amount: initialDeposit }] : []);
    return courtroomCase;
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
