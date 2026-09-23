# ☁️ clearCloud · Unified Epistemic Social Application

> Feature 1.1 (The Feed & Relational Circles) + Feature 1.3 (The Courtroom Deliberation Forum) for the Vera ecosystem.

---

## 🏗️ Architecture Blueprint

`clearCloud` is the flagship user-facing social application, consuming protocol settlement services from [`mrtingalingling/veracities.social`](https://github.com/mrtingalingling/veracities.social) and local on-device AI from [`mrtingalingling/vera`](https://github.com/mrtingalingling/vera):

```mermaid
graph TD
    subgraph Layer0 ["Layer 0 & Ingestion Engine (mrtingalingling/vera)"]
        V_Engine["Core Heuristics & Local AI"]
        V_Nano["On-Device Chrome Gemini Nano"]
        V_Scrub["Private Messaging PII Scrubber (Feature 1.2)"]
    end

    subgraph LayerProtocol ["Protocol & Settlement Backend (mrtingalingling/veracities.social)"]
        P_Auth["Identity Broker Interface (ATProto & Web3)"]
        P_Market["Validation Market Staking & Payout Pools"]
        P_DAO["Epistemic DAO Governance ('EnDAOsment')"]
        P_Settle["Courtroom Settlement Protocol (14-day cold & challenge bonds)"]
    end

    subgraph LayerApp ["Unified Social Application (mrtingalingling/clearCloud)"]
        A_Feed["The Feed & Relational Circles (Feature 1.1)"]
        A_Grounded["Groundedness Index (G) & Hidden Rep"]
        A_Court["The Courtroom Deliberation Forum (Feature 1.3)"]
        A_DAG["Compound Claim DAG Decomposition"]
        A_Jury["Juror Voting & AI Judge Synthesis"]
        A_Overlay["In-Feed Social Overlays (Bluesky, X, Reddit)"]
    end

    Layer0 -->|"Exports @vera/core API (local AI, PII scrubber)"| LayerApp
    LayerProtocol -->|"Provides ATProto Auth & Staking Settlement Protocol"| LayerApp
```

Detailed specification available in [**`docs/architecture.md`**](./docs/architecture.md).

---

## 🌟 Application Features

1. **Feature 1.1: The Epistemic Feed & Relational Circles (`src/feed/`)**:
   - 3-Tier Circles: Tier 1 (Close Friends), Tier 2 (Friends/Acquaintances), Tier 3 (Network-Wide).
   - Groundedness Index formula: $G = \frac{\text{Facts}}{\text{Facts} + \text{Speculation} + 3 \times \text{Falsehood}}$.
   - Asymmetric Hidden Reputation engine ("Trust is hard to build, fast to lose").
   - Tier 1 Personal Rage-Bait Scrubber.
2. **Feature 1.3: The Courtroom Deliberation Forum (`src/courtroom/`)**:
   - Falsifiability Gatekeeper strictly screening empirical claims from subjective/metaphysical statements.
   - Case Manager with Compound Claim DAG hierarchical decomposition.
   - 14-day cold case refund mechanism (**94% refunded**, **6% protocol fee**).
   - Challenge Bond retrial appeals (overturned verdicts award bond + 50% bounty).
   - Anonymous stake-weighted juror deliberation and AI judicial synthesis.
3. **In-Feed Social Overlays (`src/social/`)**:
   - Live badge and card generator for Bluesky, X/Twitter, Reddit, and YouTube.

---

## 🚀 Quickstart & Testing

```bash
npm install
npm test
```
