import { describe, it, expect } from 'vitest';
import { overlayService, EPISTEMIC_BADGES } from '../src/social/overlayService.js';

describe('Feature 1.1: Social Feed Overlays & Cards in ClearCloud', () => {
  it('generates epistemic badge and overlay cards across platforms', () => {
    const card = overlayService.createOverlayCard({
      platform: 'Bluesky',
      postId: 'at://did:plc:alice/app.bsky.feed.post/3kabcde',
      claimText: 'Atmospheric CO2 reached 420 ppm in 2024',
      verdict: 'VERIFIED',
      groundednessIndex: 0.92,
      courtroomCaseId: 'case_101',
      marketPool: 500
    });

    expect(card.platform).toBe('bluesky');
    expect(card.badge.label).toBe('VERIFIED');
    expect(card.badge.color).toBe(EPISTEMIC_BADGES.VERIFIED.color);
    expect(card.groundednessIndex).toBe(0.92);
    expect(card.renderedSnippet).toContain('[VERIFIED]');
    expect(card.renderedSnippet).toContain('Groundedness: 92%');
    expect(card.actionUrl).toBe('https://veracities.social/courtroom/case_101');
  });

  it('handles unknown verdicts gracefully with UNRATED badge', () => {
    const badge = overlayService.generateBadge('SOME_UNKNOWN_VERDICT');
    expect(badge.label).toBe('UNRATED');
    expect(badge.color).toBe('#9ca3af');
  });
});
