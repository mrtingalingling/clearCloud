/**
 * Feature 1.3: Courtroom Falsifiability Gatekeeper
 * Strictly admits testable, measurable, empirical claims.
 * Screens out unprovable subjective preferences, aesthetic tastes, or metaphysical assertions.
 */

const SUBJECTIVE_INDICATORS = [
  /\b(?:better|worse|best|worst|greatest|ugliest|coolest|nicest|favorite)\s+than\b/i,
  /\b(?:is|are)\s+(?:[\w-]+\s+)?(?:better|worse|the best|the worst|superior|inferior)\b/i,
  /\b(?:god|allah|yahweh|karma|heaven|hell|reincarnation|soul)\s+(?:exists|is real|is wicked|is righteous)\b/i,
  /\b(?:has|have)\s+(?:[\w-]+\s+)?(?:an?\s+)?(?:evil|cursed|wicked|saintly)\s+soul\b/i,
  /\b(?:evil|wicked|cursed|saintly)\s+soul\b/i,
  /\b(?:is|are)\s+(?:[\w-]+\s+)?(?:wicked|evil|blessed|cursed|saintly|morally superior)\b/i,
  /\b(?:tastes?\s+better|looks?\s+uglier|sounds?\s+sweeter)\b/i,
  /\b(?:jazz is better than rock|rock is better than jazz)\b/i
];

const EMPIRICAL_INDICATORS = [
  /\b(?:filed for bankruptcy|signed the bill|passed the law|enacted|vetoed)\b/i,
  /\b(?:increased by|decreased by|rose to|fell to|reached|raised|lowered)\b/i,
  /\b\d+(?:\.\d+)?\s*(?:%|ppm|mm|cm|km|meters|feet|dollars|usd|degrees|celsius|fahrenheit)?/i,
  /\b(?:landed on|discovered|published in|patent|fda approved|cdc reported)\b/i,
  /\b(?:in\s+19\d\d|in\s+20\d\d|in\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)|on\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))\b/i
];

import { localNanoGatekeeper } from './localNanoGatekeeper.js';

export class FalsifiabilityGatekeeper {
  /**
   * Tier 1 Synchronous Gatekeeper: Instant regex screening
   */
  evaluateClaim(claimText) {
    if (!claimText || typeof claimText !== 'string' || claimText.trim().length < 5) {
      return {
        admitted: false,
        reason: 'Claim text is too short or empty for formal courtroom trial.',
        category: 'INVALID_INPUT'
      };
    }

    const clean = claimText.trim();

    // 1. Check for pseudo-empirical rhetoric masks first
    const nanoSyncCheck = localNanoGatekeeper.parseSemanticPredicateFallback(clean);
    if (!nanoSyncCheck.isFalsifiable && nanoSyncCheck.category === 'PSEUDO_EMPIRICAL_EVASION') {
      return {
        admitted: false,
        claimText: clean,
        reason: nanoSyncCheck.reason,
        category: nanoSyncCheck.category,
        corePredicate: nanoSyncCheck.corePredicate
      };
    }

    // 2. Check for blatant subjective/metaphysical opinions
    for (const pattern of SUBJECTIVE_INDICATORS) {
      if (pattern.test(clean)) {
        return {
          admitted: false,
          claimText: clean,
          reason: 'Unverifiable subjective statement, aesthetic preference, or metaphysical belief.',
          category: 'SUBJECTIVE_UNVERIFIABLE'
        };
      }
    }

    if (!nanoSyncCheck.isFalsifiable) {
      return {
        admitted: false,
        claimText: clean,
        reason: nanoSyncCheck.reason,
        category: nanoSyncCheck.category,
        corePredicate: nanoSyncCheck.corePredicate
      };
    }

    let hasEmpiricalSignal = false;
    for (const pattern of EMPIRICAL_INDICATORS) {
      if (pattern.test(clean)) {
        hasEmpiricalSignal = true;
        break;
      }
    }

    return {
      admitted: true,
      claimText: clean,
      category: hasEmpiricalSignal ? 'EMPIRICAL_MEASURABLE' : 'TESTABLE_PROPOSITION',
      guidance: 'Case admitted to Courtroom docket. Evidence submission and juror deliberation unlocked.',
      corePredicate: nanoSyncCheck.corePredicate,
      falsificationCondition: nanoSyncCheck.falsificationCondition
    };
  }

  /**
   * Tier 2 Asynchronous Gatekeeper: Runs on-device Chrome Gemini Nano SLM
   */
  async evaluateClaimAsync(claimText) {
    // 1. Run Tier 1 fast screening
    const tier1 = this.evaluateClaim(claimText);
    if (!tier1.admitted) {
      return tier1;
    }

    // 2. Run Tier 2 Deep Semantic Falsifiability with Gemini Nano
    const nanoResult = await localNanoGatekeeper.evaluateSemanticFalsifiability(claimText.trim());

    if (!nanoResult.isFalsifiable) {
      return {
        admitted: false,
        claimText: claimText.trim(),
        reason: nanoResult.reason,
        category: nanoResult.category,
        corePredicate: nanoResult.corePredicate,
        falsificationCondition: nanoResult.falsificationCondition,
        evaluator: nanoResult.evaluator
      };
    }

    return {
      admitted: true,
      claimText: claimText.trim(),
      category: nanoResult.category,
      corePredicate: nanoResult.corePredicate,
      falsificationCondition: nanoResult.falsificationCondition,
      guidance: 'Case admitted to Courtroom docket via on-device Gemini Nano evaluation.',
      evaluator: nanoResult.evaluator
    };
  }
}

export const falsifiabilityGatekeeper = new FalsifiabilityGatekeeper();
