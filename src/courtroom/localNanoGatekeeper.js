/**
 * Local On-Device Gemini Nano Epistemic Semantic Gatekeeper
 * Evaluates semantic falsifiability locally via Google Chrome Built-in AI (window.ai.languageModel).
 * Catches adversarial pseudo-empirical evasion where subjective moralizing or aesthetic tastes
 * are disguised in scientific or statistical rhetoric.
 */

// Rhetorical markers often used to disguise subjective opinions as empirical facts
const PSEUDO_EMPIRICAL_DISGUISES = [
  /\b(?:statistically|mathematically|scientifically)\s+(?:proves?|demonstrates?|confirms?)\s+(?:[\w-]+\s+){0,8}(?:evil|wicked|righteous|saintly|moral|immoral|corrupt)\b/i,
  /\b(?:neuroscience|psychology|science)\s+(?:confirms?|proves?)\s+(?:[\w-]+\s+){0,8}(?:superior|inferior|the best|the worst)\b/i,
  /\b(?:objectively|inherently|intrinsically)\s+(?:better|worse|superior|inferior|evil|corrupt|beautiful|ugly)\b/i,
  /\b(?:studies prove|data shows)\s+(?:[\w-]+\s+){0,8}(?:sucks|is terrible|is godly|is wicked)\b/i
];

export class LocalNanoGatekeeper {
  /**
   * Checks if Chrome Gemini Nano is available on the client device.
   */
  async checkAvailability() {
    if (typeof window === 'undefined') return 'unavailable';
    try {
      if (window.ai?.languageModel) {
        const caps = await window.ai.languageModel.capabilities();
        return caps?.available || 'unavailable';
      }
      if (window.ai?.assistant) {
        const caps = await window.ai.assistant.capabilities();
        return caps?.available || 'unavailable';
      }
    } catch {
      return 'unavailable';
    }
    return 'unavailable';
  }

  /**
   * Evaluates semantic falsifiability of a claim.
   * Priority 1: Chrome Built-in Gemini Nano SLM session.
   * Priority 2: Client-side heuristic semantic grammar parser.
   */
  async evaluateSemanticFalsifiability(claimText) {
    if (!claimText || typeof claimText !== 'string' || claimText.trim().length < 5) {
      return {
        isFalsifiable: false,
        category: 'INVALID_INPUT',
        reason: 'Claim text is empty or too brief for epistemic trial.',
        evaluator: 'rule_engine'
      };
    }

    const clean = claimText.trim();

    // Check for pseudo-empirical rhetoric masks (Tier 1.5 heuristic filter)
    for (const pattern of PSEUDO_EMPIRICAL_DISGUISES) {
      if (pattern.test(clean)) {
        return {
          isFalsifiable: false,
          category: 'PSEUDO_EMPIRICAL_EVASION',
          corePredicate: 'Subjective moralizing or aesthetic preference disguised with empirical terms',
          falsificationCondition: 'None: subjective judgments cannot be physically disproven',
          reason: 'Proposition masks an unfalsifiable subjective judgment behind empirical jargon.',
          evaluator: 'heuristic_slm_fallback'
        };
      }
    }

    // Attempt Chrome Built-in Gemini Nano inference
    if (typeof window !== 'undefined' && (window.ai?.languageModel || window.ai?.assistant)) {
      try {
        const systemPrompt = `You are Vera's Epistemic Gatekeeper. You must analyze whether a proposition is EMPIRICALLY FALSIFIABLE (capable of being proven true or false via documentary evidence, timestamped receipts, physical measurements, or legal filings) or an UNVERIFIABLE SUBJECTIVE OPINION/AESTHETIC PREFERENCE disguised as fact.
Respond strictly in JSON format:
{"isFalsifiable": boolean, "category": "EMPIRICAL_MEASURABLE" | "TESTABLE_PROPOSITION" | "SUBJECTIVE_MORALIZING" | "AESTHETIC_PREFERENCE" | "PSEUDO_EMPIRICAL_EVASION", "corePredicate": string, "falsificationCondition": string, "reason": string}`;

        let session = null;
        if (window.ai?.languageModel) {
          session = await window.ai.languageModel.create({ systemPrompt });
        } else if (window.ai?.assistant) {
          session = await window.ai.assistant.create({ systemPrompt });
        }

        if (session) {
          const rawResult = await session.prompt(`Evaluate claim: "${clean}"`);
          if (typeof session.destroy === 'function') session.destroy();

          const cleanJson = rawResult.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
          const parsed = JSON.parse(cleanJson);
          return {
            ...parsed,
            evaluator: 'chrome_gemini_nano'
          };
        }
      } catch (err) {
        console.warn('[LocalNanoGatekeeper] Gemini Nano prompt fallback:', err);
      }
    }

    // Fallback: Deterministic semantic predicate parser
    return this.parseSemanticPredicateFallback(clean);
  }

  /**
   * Deterministic semantic parser used in headless / non-Chrome environments.
   */
  parseSemanticPredicateFallback(text) {
    for (const pattern of PSEUDO_EMPIRICAL_DISGUISES) {
      if (pattern.test(text)) {
        return {
          isFalsifiable: false,
          category: 'PSEUDO_EMPIRICAL_EVASION',
          corePredicate: 'Subjective moralizing or aesthetic preference disguised with empirical terms',
          falsificationCondition: 'None: subjective judgments cannot be physically disproven',
          reason: 'Proposition masks an unfalsifiable subjective judgment behind empirical jargon.',
          evaluator: 'heuristic_slm_fallback'
        };
      }
    }

    const hasNumbersOrDates = /\b(?:\d{4}|\d+(?:\.\d+)?%?|\$\d+)\b/.test(text);
    const hasPhysicalVerbs = /\b(?:signed|filed|purchased|attended|hospitalized|visited|published|enacted|vetoed|stole|deposited)\b/i.test(text);
    const hasSubjectiveVerbs = /\b(?:feels?|seems?|tastes?|looks?|deserves?|should be|ought to)\b/i.test(text);

    if (hasSubjectiveVerbs && !hasPhysicalVerbs) {
      return {
        isFalsifiable: false,
        category: 'SUBJECTIVE_MORALIZING',
        corePredicate: text.slice(0, 60),
        falsificationCondition: 'None: subjective sentiment cannot be audited by third-party records',
        reason: 'Proposition relies on subjective feeling, normative should/ought claims, or aesthetic opinion.',
        evaluator: 'semantic_grammar_engine'
      };
    }

    if (hasPhysicalVerbs || hasNumbersOrDates) {
      return {
        isFalsifiable: true,
        category: hasNumbersOrDates ? 'EMPIRICAL_MEASURABLE' : 'TESTABLE_PROPOSITION',
        corePredicate: text.slice(0, 80),
        falsificationCondition: 'Verifiable by comparing timestamped physical records, receipts, or official registries',
        reason: 'Proposition asserts specific empirical actions or measurements subject to physical falsification.',
        evaluator: 'semantic_grammar_engine'
      };
    }

    // Default testable proposition
    return {
      isFalsifiable: true,
      category: 'TESTABLE_PROPOSITION',
      corePredicate: text.slice(0, 80),
      falsificationCondition: 'Falsifiable through corroborating documentary proof or third-party audit',
      reason: 'Proposition asserts testable factual relations.',
      evaluator: 'semantic_grammar_engine'
    };
  }
}

export const localNanoGatekeeper = new LocalNanoGatekeeper();
