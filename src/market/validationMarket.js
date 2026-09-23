/**
 * Layer 1.1 / Layer 2: Validation Market Reference & Staking Registry
 * Facilitates stake-weighted claim wagering, prediction pools,
 * and decentralized truth-settlement payouts.
 */

export const VALID_OUTCOMES = [
  'VERIFIED',
  'MISINFORMED',
  'DISPUTED',
  'NEED_CONTEXT'
];

export class ValidationMarket {
  constructor() {
    this.markets = new Map();
    this.stakes = new Map(); // stakeId -> stake object
    this.nextMarketId = 1;
    this.nextStakeId = 1;
  }

  /**
   * Create a new validation prediction market for a claim.
   * @param {Object} params
   * @param {string} params.claimId Unique claim hash or identifier
   * @param {string} params.claimText Raw text of claim being evaluated
   * @param {string} params.creatorDid ATProto DID or Web3 address
   * @param {number} [params.initialBounty=0] Optional initial reward pool
   * @param {number} [params.durationHours=24] Market open duration
   * @returns {Object} Created market details
   */
  createMarket(params) {
    const {
      claimId,
      claimText,
      creatorDid,
      initialBounty = 0,
      durationHours = 24
    } = params;

    if (!claimId || !claimText || !creatorDid) {
      throw new Error('Missing required market parameters (claimId, claimText, creatorDid)');
    }

    const marketId = `mkt_${this.nextMarketId++}`;
    const now = Date.now();
    const expiresAt = now + durationHours * 3600 * 1000;

    const market = {
      marketId,
      claimId,
      claimText,
      creatorDid,
      status: 'OPEN', // 'OPEN' | 'RESOLVED' | 'CANCELLED'
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      bountyPool: initialBounty,
      totalStaked: initialBounty,
      outcomePools: {
        VERIFIED: 0,
        MISINFORMED: 0,
        DISPUTED: 0,
        NEED_CONTEXT: 0
      },
      finalVerdict: null,
      resolvedAt: null,
      oracleSignatures: []
    };

    this.markets.set(marketId, market);
    return market;
  }

  /**
   * Place a stake on a specific epistemic verdict outcome.
   * @param {Object} params
   * @param {string} params.marketId
   * @param {string} params.stakerDid User DID
   * @param {'VERIFIED'|'MISINFORMED'|'DISPUTED'|'NEED_CONTEXT'} params.outcome
   * @param {number} params.amount Staked points / tokens
   * @returns {Object} Placed stake receipt
   */
  placeStake(params) {
    const { marketId, stakerDid, outcome, amount } = params;

    if (!this.markets.has(marketId)) {
      throw new Error(`Market not found: ${marketId}`);
    }

    const market = this.markets.get(marketId);
    if (market.status !== 'OPEN') {
      throw new Error(`Cannot stake on market in status: ${market.status}`);
    }

    if (!VALID_OUTCOMES.includes(outcome)) {
      throw new Error(`Invalid outcome: ${outcome}. Must be one of: ${VALID_OUTCOMES.join(', ')}`);
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Stake amount must be a positive number');
    }

    const stakeId = `stk_${this.nextStakeId++}`;
    const stake = {
      stakeId,
      marketId,
      stakerDid,
      outcome,
      amount,
      stakedAt: new Date().toISOString(),
      payout: null,
      claimed: false
    };

    // Update pool
    market.outcomePools[outcome] += amount;
    market.totalStaked += amount;

    this.stakes.set(stakeId, stake);
    return stake;
  }

  /**
   * Calculate current implied probabilities and payout multipliers.
   * @param {string} marketId
   * @returns {Object} Odds summary
   */
  calculateMarketOdds(marketId) {
    if (!this.markets.has(marketId)) {
      throw new Error(`Market not found: ${marketId}`);
    }

    const market = this.markets.get(marketId);
    const total = market.totalStaked;
    const odds = {};

    for (const outcome of VALID_OUTCOMES) {
      const pool = market.outcomePools[outcome];
      const probability = total > 0 ? (pool / total) : 0.25;
      const multiplier = pool > 0 ? (total / pool) : 1.0;

      odds[outcome] = {
        pool,
        impliedProbabilityPct: Math.round(probability * 1000) / 10,
        payoutMultiplier: Math.round(multiplier * 100) / 100
      };
    }

    return {
      marketId,
      status: market.status,
      totalStaked: total,
      odds
    };
  }

  /**
   * Settle and resolve the validation market with an oracle or jury verdict.
   * @param {Object} params
   * @param {string} params.marketId
   * @param {'VERIFIED'|'MISINFORMED'|'DISPUTED'|'NEED_CONTEXT'} params.finalVerdict
   * @param {Array<string>} [params.oracleSignatures=[]]
   * @returns {Object} Resolution settlement summary
   */
  resolveMarket(params) {
    const { marketId, finalVerdict, oracleSignatures = [] } = params;

    if (!this.markets.has(marketId)) {
      throw new Error(`Market not found: ${marketId}`);
    }

    const market = this.markets.get(marketId);
    if (market.status !== 'OPEN') {
      throw new Error(`Market is already ${market.status}`);
    }

    if (!VALID_OUTCOMES.includes(finalVerdict)) {
      throw new Error(`Invalid final verdict: ${finalVerdict}`);
    }

    market.status = 'RESOLVED';
    market.finalVerdict = finalVerdict;
    market.resolvedAt = new Date().toISOString();
    market.oracleSignatures = oracleSignatures;

    const winningPool = market.outcomePools[finalVerdict];
    const totalPool = market.totalStaked;

    // Distribute payouts
    const settlements = [];
    for (const [stakeId, stake] of this.stakes.entries()) {
      if (stake.marketId === marketId) {
        if (stake.outcome === finalVerdict && winningPool > 0) {
          const share = stake.amount / winningPool;
          stake.payout = share * totalPool;
        } else {
          stake.payout = 0;
        }
        settlements.push({
          stakeId,
          stakerDid: stake.stakerDid,
          outcome: stake.outcome,
          amount: stake.amount,
          payout: Math.round((stake.payout || 0) * 100) / 100,
          won: stake.outcome === finalVerdict
        });
      }
    }

    return {
      marketId,
      finalVerdict,
      totalPool,
      winningPool,
      settlements
    };
  }

  /**
   * Retrieve all stakes placed by a particular DID.
   * @param {string} userDid
   * @returns {Array<Object>}
   */
  getUserStakes(userDid) {
    const userStakes = [];
    for (const stake of this.stakes.values()) {
      if (stake.stakerDid === userDid) {
        userStakes.push(stake);
      }
    }
    return userStakes;
  }
}
