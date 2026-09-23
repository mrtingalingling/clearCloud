/**
 * Feature 1.1: Social Feed Overlays & Cards
 * Injects epistemic veracity badges and metadata cards into social feeds (Bluesky, X/Twitter, Reddit, YouTube).
 */

export const EPISTEMIC_BADGES = {
  VERIFIED: {
    label: 'VERIFIED',
    color: '#10b981', // green
    description: 'Empirically supported by primary consensus and documentation'
  },
  MISINFORMED: {
    label: 'MISINFORMED',
    color: '#ef4444', // red
    description: 'Contradicted by authoritative records and verifiable data'
  },
  DISPUTED: {
    label: 'DISPUTED',
    color: '#f59e0b', // amber
    description: 'Active evidentiary disagreement under community examination'
  },
  NEED_CONTEXT: {
    label: 'NEED CONTEXT',
    color: '#6366f1', // indigo
    description: 'Substantive missing background or unverified nuance required'
  }
};

export class OverlayService {
  generateBadge(verdict) {
    const key = (verdict || '').toUpperCase().replace(/\s+/g, '_');
    return EPISTEMIC_BADGES[key] || {
      label: 'UNRATED',
      color: '#9ca3af',
      description: 'Pending community attestation'
    };
  }

  createOverlayCard(params) {
    const {
      platform,
      postId,
      claimText,
      verdict,
      groundednessIndex = 0.5,
      courtroomCaseId = null,
      marketPool = null
    } = params;

    const badge = this.generateBadge(verdict);

    return {
      platform: platform.toLowerCase(),
      postId,
      claimText,
      badge,
      groundednessIndex,
      courtroomCaseId,
      marketPool,
      renderedSnippet: `[${badge.label}] ${claimText} (Groundedness: ${Math.round(groundednessIndex * 100)}%)`,
      actionUrl: courtroomCaseId ? `https://veracities.social/courtroom/${courtroomCaseId}` : null
    };
  }
}

export const overlayService = new OverlayService();
