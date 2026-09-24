/**
 * Governance Policy & Economic Guard Configuration for ClearCloud.
 * Controls Low-Reputation Stake-to-Post gating and Case Initiation Wager requirements.
 * Both mechanisms are disabled by default.
 */

export const DEFAULT_GOVERNANCE_POLICY = Object.freeze({
  // Feature flags (all default to false for frictionless onboarding)
  STAKE_TO_POST_ENABLED: false,
  STAKE_TO_REPOST_ENABLED: false,
  CREDIT_SCORE_WEIGHTING_ENABLED: false,
  INFLUENCER_STAKE_ENABLED: false,
  EXPONENTIAL_DISINFO_PENALTY_ENABLED: false,
  CASE_WAGER_REQUIRED: false,

  // Baseline credit score parameters
  BASELINE_REPUTATION: 50.0,
  LOW_REP_THRESHOLD: 40.0,

  // Influencer threshold parameters
  INFLUENCER_FOLLOWER_THRESHOLD: 10000,
  INFLUENCER_MIN_REP_THRESHOLD: 60.0,

  // Base economic stakes (USDC)
  REQUIRED_POST_STAKE_USDC: 10.0,
  REQUIRED_REPOST_STAKE_USDC: 5.0,
  INFLUENCER_BASE_STAKE_USDC: 20.0,
  MIN_CASE_WAGER_USDC: 25.0,

  // Exponential penalty scaling parameters (no cost floor/ceiling)
  EXPONENTIAL_PENALTY_BASE: 2.0,
  EXPONENTIAL_STEP_POINTS: 5.0,

  // Allowed initiation origins for courtroom cases
  ALLOWED_CASE_SOURCES: Object.freeze(['SOCIAL_MEDIA', 'EXTENSION_APP', 'DIRECT_API'])
});

// Active runtime policy (initialized to defaults)
let activePolicy = { ...DEFAULT_GOVERNANCE_POLICY };

/**
 * Returns a snapshot of the current governance policy.
 * @returns {typeof DEFAULT_GOVERNANCE_POLICY}
 */
export function getGovernancePolicy() {
  return { ...activePolicy };
}

/**
 * Updates governance policy settings at runtime (for admin controls or test harnesses).
 * @param {Partial<typeof DEFAULT_GOVERNANCE_POLICY>} updates 
 * @returns {typeof DEFAULT_GOVERNANCE_POLICY}
 */
export function setGovernancePolicy(updates = {}) {
  activePolicy = {
    ...activePolicy,
    ...updates
  };
  return getGovernancePolicy();
}

/**
 * Resets governance policy to default values.
 * @returns {typeof DEFAULT_GOVERNANCE_POLICY}
 */
export function resetGovernancePolicy() {
  activePolicy = { ...DEFAULT_GOVERNANCE_POLICY };
  return getGovernancePolicy();
}
