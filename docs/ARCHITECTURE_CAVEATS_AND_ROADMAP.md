# clearCloud: Architecture Caveats & Implementation Status

> **Canonical Document Reference**: The master, cross-repository architecture blueprint, deployment guide, and remaining caveats ledger is centralized in [**`vera/docs/ARCHITECTURE_CAVEATS_AND_ROADMAP.md`**](../../vera/docs/ARCHITECTURE_CAVEATS_AND_ROADMAP.md). Refer to that document for the unified ecosystem specification.
> **Repository Test Health**: **68 / 68 Vitest Tests Passing (100% Green)** across 9 test suites.

---

## 1. clearCloud Architectural Boundary (Separation of Powers)

`clearCloud` is the **Civic Social & Deliberation Application** of the Vera ecosystem. Its architectural invariants are strictly enforced:

1. **No Financialization / Prediction Markets**:
   - `clearCloud` contains **zero gambling, staking wagers, or prediction pool odds**.
   - Economic wagers reside exclusively in `veracities.social`.
2. **Disinterested Deliberation**:
   - Juries are summoned via algorithmic sortition (`sortitionEngine.js`) requiring Proof of Humanity ($\ge 20$) or Staked Civic Bonds ($\ge 10$ USDC).
   - Bettors holding active stakes on a claim in `veracities.social` are automatically recused from that claim's jury panel via `identityLinkService.js`.
3. **Cognitive Bias Suppression**:
   - Claims are presented to summoned jurors via `blindTrialEngine.js` using deep semantic paraphrasing, entity masking (`[Entity_A]`), emotional invective scrubbing, and synthetic decoy docket interleaving.

---

## 2. Implemented Features & Verification Matrix

All Layer 1 features required by the PRD are fully implemented in `clearCloud` and verified with **68 passing tests**:

- **Feature 1.1: The Epistemic Feed & Relational Circles (`src/feed/`)**:
  - 3-tier proximity circles: Tier 1 (Close Friends with personal rage-bait scrubber), Tier 2 (Friends/Acquaintances), Tier 3 (Network-Wide).
  - Groundedness Index formula:
    $$G = \frac{\text{Facts}}{\text{Facts} + \text{Speculation} + 3 \times \text{Falsehood}}$$
  - Asymmetric Hidden Reputation engine (swift penalties for debunked rage-bait, slow accrual for verified citations).
- **Feature 1.3: The Courtroom Deliberation Forum (`src/courtroom/`)**:
  - Falsifiability Gatekeeper with regex indicators and Chrome Gemini Nano SLM evaluation prompt.
  - Case Manager with Compound Claim DAG hierarchical decomposition.
  - 14-day cold case refund timer tracking (**94% refunded**, **6% platform fee**).
  - $2\times$ Challenge Bond retrial escrow appeals (50% bounty on overturned verdicts).
  - Algorithmic Civic Sortition Summons (7–9 randomized citizens per docket).
  - Substantive evidence submission form with live CID validation (`ipfs://`, `ar://`, `doi.org/`), AI relevance gate ($\ge 0.70$), and escalating anti-griefing deposits ($50 \times 2^{n-1}$).
- **Feature 1.4: Epistemic Credit Score & Economic Governance (`src/config/`, `src/courtroom/`, `src/feed/`)**:
  - Epistemic Credit Score interaction weighting: Quadratic damping for low-rep likes/reactions ($\max(0.01, (\text{rep}/50)^2)$); juror vote credit scaling ($\max(0.05, \text{rep}/50)$).
  - Stake-to-Repost guard: Escrow stake required for sub-40 rep users (`REQUIRED_REPOST_STAKE_USDC`: 5.0 USDC).
  - Influencer reach staking: Accounts with $\ge 10,000$ followers and sub-60 reputation must post audience-scaled bonds.
  - Unbounded exponential disinformation penalties ($2^{\Delta/5} \times 2^{\text{strikes}}$ with no floor or ceiling).
  - Multi-Origin Case Initiation (`SOCIAL_MEDIA` vs `EXTENSION_APP`) with validation wagers dispatched to `veracities.social`.
- **Social Overlays (`src/social/`)**:
  - In-feed epistemic badge generator for Bluesky, X/Twitter, Reddit, and YouTube.

---

## 3. clearCloud Specific Operational Steps for Production

1. **Proof of Humanity Credentials**:
   - Obtain a Gitcoin Passport Scorer API Key and WorldID Developer App ID.
   - Configure credentials in `.env`:
     ```env
     GITCOIN_PASSPORT_API_KEY="gitcoin_scorer_..."
     WORLDID_APP_ID="app_staging_..."
     ```
2. **Cloud Multimodal Fallback**:
   - For non-Chromium clients unable to run local Chrome Gemini Nano, route complex PDF/video evidence to Gemini 2.5 Flash via the Vera FastAPI gateway.
3. **Contracts Address Synchronization**:
   - Run `npm run compile:contracts` at the root monorepo level to refresh `clearCloud/src/config/contracts.json` before deploying.

---

## 4. Local Execution & Testing

```bash
# Run unit and integration tests
npm test

# Start local development server (port 5173)
npm run dev

# Build production bundle
npm run build
```
