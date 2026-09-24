/**
 * Governance Policy & Economic Guard Configuration for ClearCloud.
 * Controls Low-Reputation Stake-to-Post gating and Case Initiation Wager requirements.
 * Both mechanisms are disabled by default.
 */

export const DEFAULT_GOVERNANCE_POLICY = Object.freeze({
  // Feature flag 1: Low-reputation stake-to-post requirement (disabled for now)
  STAKE_TO_POST_ENABLED: false,

  // Citizen reputation threshold below which stake is required (baseline: 50.0, throttled < 40.0)
  LOW_REP_THRESHOLD: 40.0,

  // Required escrow stake bond in USDC for low-reputation users to publish
  REQUIRED_POST_STAKE_USDC: 10.0,

  // Feature flag 2: Mandatory wager to initiate a courtroom case (disabled for now)
  CASE_WAGER_REQUIRED: false,

  // Minimum wager amount in USDC required to docket a case when wager is mandatory
  MIN_CASE_WAGER_USDC: 25.0,

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
