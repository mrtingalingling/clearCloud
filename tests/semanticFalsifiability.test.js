import { describe, it, expect } from 'vitest';
import { falsifiabilityGatekeeper } from '../src/courtroom/falsifiabilityGatekeeper.js';
import { localNanoGatekeeper } from '../src/courtroom/localNanoGatekeeper.js';

describe('Option D: Two-Tier Courtroom Falsifiability & Gemini Nano Semantic Gatekeeper', () => {
  describe('Tier 1: Fast Regex Filtering', () => {
    it('admits verifiable empirical claims with numbers and dates', () => {
      const claim = 'The Federal Reserve raised the benchmark interest rate to 5.25% in July 2023.';
      const result = falsifiabilityGatekeeper.evaluateClaim(claim);

      expect(result.admitted).toBe(true);
      expect(result.category).toBe('EMPIRICAL_MEASURABLE');
      expect(result.falsificationCondition).toBeDefined();
    });

    it('rejects blatant subjective aesthetic preferences', () => {
      const claim = 'Rock music is better than jazz in every conceivable way.';
      const result = falsifiabilityGatekeeper.evaluateClaim(claim);

      expect(result.admitted).toBe(false);
      expect(result.category).toBe('SUBJECTIVE_UNVERIFIABLE');
    });

    it('rejects metaphysical non-falsifiable statements', () => {
      const claim = 'The politician has an evil and cursed soul.';
      const result = falsifiabilityGatekeeper.evaluateClaim(claim);

      expect(result.admitted).toBe(false);
      expect(result.category).toBe('SUBJECTIVE_UNVERIFIABLE');
    });
  });

  describe('Tier 2: Semantic Gatekeeper & Adversarial Pseudo-Empirical Evasion Screening', () => {
    it('catches and rejects subjective moralizing disguised as mathematical statistics', async () => {
      const adversarialClaim = 'Statistical metrics mathematically prove Candidate A is inherently evil and corrupt.';
      const result = await falsifiabilityGatekeeper.evaluateClaimAsync(adversarialClaim);

      expect(result.admitted).toBe(false);
      expect(result.category).toBe('PSEUDO_EMPIRICAL_EVASION');
      expect(result.reason).toContain('masks an unfalsifiable subjective judgment behind empirical jargon');
    });

    it('catches and rejects aesthetic taste disguised as neuroscientific proof', async () => {
      const adversarialClaim = 'Neuroscience confirms that Classical Music is objectively superior to Heavy Metal.';
      const result = await falsifiabilityGatekeeper.evaluateClaimAsync(adversarialClaim);

      expect(result.admitted).toBe(false);
      expect(result.category).toBe('PSEUDO_EMPIRICAL_EVASION');
      expect(result.reason).toContain('unfalsifiable subjective judgment');
    });

    it('admits nuanced historical physical records', async () => {
      const physicalClaim = 'Mayor Adams signed the executive order on September 15 2023 at City Hall.';
      const result = await falsifiabilityGatekeeper.evaluateClaimAsync(physicalClaim);

      expect(result.admitted).toBe(true);
      expect(result.isFalsifiable).not.toBe(false);
      expect(result.falsificationCondition).toContain('physical records, receipts, or official registries');
    });

    it('provides graceful fallback when window.ai is unavailable in headless runtime', async () => {
      const availability = await localNanoGatekeeper.checkAvailability();
      expect(availability).toBe('unavailable'); // Running in Node / Vitest headless

      const claim = 'Company XYZ filed for Chapter 11 bankruptcy in Delaware Court.';
      const result = await localNanoGatekeeper.evaluateSemanticFalsifiability(claim);

      expect(result.isFalsifiable).toBe(true);
      expect(result.evaluator).toBe('semantic_grammar_engine');
    });
  });
});
