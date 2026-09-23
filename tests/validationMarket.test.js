import { describe, it, expect } from 'vitest';
import { ValidationMarket, VALID_OUTCOMES } from '../src/market/validationMarket.js';

describe('Layer 1.1 / Layer 2 Validation Market Subsystem', () => {
  it('creates a new prediction market for a claim', () => {
    const marketEngine = new ValidationMarket();
    const market = marketEngine.createMarket({
      claimId: '0xabc123',
      claimText: 'NASA discovered definitive microbial fossils on Mars in 2026',
      creatorDid: 'did:plc:creator123',
      initialBounty: 100
    });

    expect(market.marketId).toBe('mkt_1');
    expect(market.status).toBe('OPEN');
    expect(market.totalStaked).toBe(100);
    expect(market.bountyPool).toBe(100);
  });

  it('allows staking on valid epistemic outcomes', () => {
    const marketEngine = new ValidationMarket();
    const market = marketEngine.createMarket({
      claimId: '0xabc123',
      claimText: 'Earth is an oblate spheroid',
      creatorDid: 'did:plc:creator123'
    });

    const stake1 = marketEngine.placeStake({
      marketId: market.marketId,
      stakerDid: 'did:plc:alice',
      outcome: 'VERIFIED',
      amount: 250
    });

    const stake2 = marketEngine.placeStake({
      marketId: market.marketId,
      stakerDid: 'did:plc:bob',
      outcome: 'MISINFORMED',
      amount: 50
    });

    expect(stake1.stakeId).toBe('stk_1');
    expect(stake1.outcome).toBe('VERIFIED');
    expect(market.totalStaked).toBe(300);
    expect(market.outcomePools.VERIFIED).toBe(250);
    expect(market.outcomePools.MISINFORMED).toBe(50);
  });

  it('computes market odds and implied probabilities', () => {
    const marketEngine = new ValidationMarket();
    const market = marketEngine.createMarket({
      claimId: '0xabc123',
      claimText: 'Test Claim',
      creatorDid: 'did:plc:creator123'
    });

    marketEngine.placeStake({
      marketId: market.marketId,
      stakerDid: 'did:plc:alice',
      outcome: 'VERIFIED',
      amount: 150
    });
    marketEngine.placeStake({
      marketId: market.marketId,
      stakerDid: 'did:plc:bob',
      outcome: 'DISPUTED',
      amount: 50
    });

    const odds = marketEngine.calculateMarketOdds(market.marketId);
    expect(odds.totalStaked).toBe(200);
    expect(odds.odds.VERIFIED.impliedProbabilityPct).toBe(75.0);
    expect(odds.odds.DISPUTED.impliedProbabilityPct).toBe(25.0);
  });

  it('settles market payouts upon truth resolution', () => {
    const marketEngine = new ValidationMarket();
    const market = marketEngine.createMarket({
      claimId: '0xabc123',
      claimText: 'Apollo 11 landed on moon in 1969',
      creatorDid: 'did:plc:creator123'
    });

    marketEngine.placeStake({
      marketId: market.marketId,
      stakerDid: 'did:plc:alice',
      outcome: 'VERIFIED',
      amount: 100
    });
    marketEngine.placeStake({
      marketId: market.marketId,
      stakerDid: 'did:plc:bob',
      outcome: 'MISINFORMED',
      amount: 100
    });

    // Oracle settles verdict as VERIFIED
    const settlement = marketEngine.resolveMarket({
      marketId: market.marketId,
      finalVerdict: 'VERIFIED',
      oracleSignatures: ['0xoracle_sig_1']
    });

    expect(settlement.finalVerdict).toBe('VERIFIED');
    expect(settlement.totalPool).toBe(200);

    const aliceSettlement = settlement.settlements.find(s => s.stakerDid === 'did:plc:alice');
    const bobSettlement = settlement.settlements.find(s => s.stakerDid === 'did:plc:bob');

    expect(aliceSettlement.won).toBe(true);
    expect(aliceSettlement.payout).toBe(200); // 100% of the winning pool
    expect(bobSettlement.won).toBe(false);
    expect(bobSettlement.payout).toBe(0);
  });
});
