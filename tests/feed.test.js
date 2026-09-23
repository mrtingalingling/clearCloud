import { describe, it, expect } from 'vitest';
import { feedManager, CIRCLE_TIERS } from '../src/feed/feedManager.js';

describe('Feature 1.1: ClearCloud Feed, Groundedness Index & Relational Circles', () => {
  it('calculates Groundedness Index according to PRD formula: G = Facts / (Facts + Speculation + 3 * Falsehood)', () => {
    // 60 facts, 20 speculation, 10 falsehood -> 60 / (60 + 20 + 30) = 60 / 110 = 0.545
    const g1 = feedManager.calculateGroundednessIndex({ factsPct: 60, opinionPct: 20, falsehoodPct: 10 });
    expect(g1).toBe(0.545);

    // 90 facts, 10 speculation, 0 falsehood -> 90 / (90 + 10 + 0) = 0.900
    const g2 = feedManager.calculateGroundednessIndex({ factsPct: 90, opinionPct: 10, falsehoodPct: 0 });
    expect(g2).toBe(0.9);

    // Heavy falsehood: 10 facts, 10 speculation, 40 falsehood -> 10 / (10 + 10 + 120) = 10 / 140 = 0.071
    const g3 = feedManager.calculateGroundednessIndex({ factsPct: 10, opinionPct: 10, falsehoodPct: 40 });
    expect(g3).toBe(0.071);
  });

  it('demonstrates asymmetric reputation dynamics: slow accrual, swift penalization', () => {
    const user = 'did:plc:reputation_test_user';
    const initial = feedManager.getHiddenReputation(user);
    expect(initial).toBe(50.0);

    // Slow accrual for verified posts (+1.5 each)
    feedManager.adjustHiddenReputation(user, 'VERIFIED_POST');
    feedManager.adjustHiddenReputation(user, 'VERIFIED_POST');
    expect(feedManager.getHiddenReputation(user)).toBe(53.0);

    // Severe penalty for debunked post (-18.0)
    feedManager.adjustHiddenReputation(user, 'DEBUNKED_POST');
    expect(feedManager.getHiddenReputation(user)).toBe(35.0);

    // Courtroom slashing (-25.0)
    feedManager.adjustHiddenReputation(user, 'COURTROOM_SLASHED');
    expect(feedManager.getHiddenReputation(user)).toBe(10.0);
  });

  it('filters rage-bait for Tier 1 Close Circle viewers while prioritizing verified posts', () => {
    const author = 'did:plc:close_friend';
    const viewer = 'did:plc:me';
    feedManager.setCircleRelation(viewer, author, CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS);

    // Low groundedness post (rage-bait)
    const rageBaitPost = {
      authorDid: author,
      metrics: { factsPct: 10, opinionPct: 20, falsehoodPct: 50 } // G = 10 / (10 + 20 + 150) = 0.055
    };

    const result = feedManager.rankPostForViewer(rageBaitPost, viewer, true);
    expect(result.visible).toBe(false);
    expect(result.reason).toContain('Rage-Bait Scrubber');
  });

  it('ranks Tier 3 network posts algorithmically based on Groundedness and author reputation', () => {
    const trustedAuthor = 'did:plc:trusted_researcher';
    const viewer = 'did:plc:viewer';
    feedManager.adjustHiddenReputation(trustedAuthor, 'VERIFIED_POST');
    feedManager.adjustHiddenReputation(trustedAuthor, 'JURY_CONSENSUS_AFFIRM');

    const highQualityPost = {
      authorDid: trustedAuthor,
      metrics: { factsPct: 80, opinionPct: 15, falsehoodPct: 0 }
    };

    const rankResult = feedManager.rankPostForViewer(highQualityPost, viewer, false);
    expect(rankResult.visible).toBe(true);
    expect(rankResult.circleTier).toBe(CIRCLE_TIERS.TIER_3_NETWORK);
    expect(rankResult.score).toBeGreaterThan(0.5);
  });
});
