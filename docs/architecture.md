# clearCloud Architecture Blueprint (Layer 1.1)

## 1. Role in the Vera Ecosystem

`clearCloud` is the **Layer 1.1 Decentralized Identity, Validation Market & EnDAOsment Protocol** of the Vera truth settlement ecosystem.

```mermaid
graph TD
    subgraph Layer0 ["Layer 0: Core Epistemic Engine (mrtingalingling/vera)"]
        V_Engine["Core Heuristics & Local AI<br/>(localAiService.js)"]
        V_Nano["On-Device AI Engine<br/>(Chrome Gemini Nano Streaming)"]
        V_P2P["Gossip Swarm Attestation<br/>(p2pNode.js)"]
        V_DOM["DOM Parser & WOT Highlighter<br/>(scannerService.js)"]
        V_DB["Offline Storage Engine<br/>(VeraDB IndexedDB)"]
    end

    subgraph Layer1_1 ["Layer 1.1: Identity & Settlement Protocol (mrtingalingling/clearCloud)"]
        C_Auth["Identity Broker Interface<br/>(authProvider.js)"]
        C_ATProto["ATProto Agent & DID:PLC<br/>(atprotoProvider.js)"]
        C_Web3["NFT & Web3 SIWE Interface<br/>(web3NftProvider.js)"]
        C_Market["Validation Market Registry<br/>(validationMarket.js)"]
        C_DAO["DAO Governance Placeholder<br/>(daoRegistry.js)"]
    end

    subgraph Layer1_2_3 ["Layer 1.2 & 1.3: Social Truth & Courtroom (mrtingalingling/veracities.social)"]
        S_Overlay["Social Overlays<br/>(X, Bluesky, Reddit, YouTube)"]
        S_Court["Courtroom Dispute UI<br/>(Claim Jury & Staking)"]
        S_Feed["Decentralized Veracity Feed<br/>(Consensus Feed)"]
    end

    %% Cross-Repo Interconnections
    Layer0 -->|"Exports @vera/core API (claim evaluation, metrics, P2P)"| Layer1_2_3
    Layer0 -->|"Supplies verified attestations"| Layer1_1
    Layer1_1 -->|"Provides ATProto / Web3 DID authentication"| Layer1_2_3
    Layer1_1 -->|"Settles disputes & stakes on-chain / via DAO"| Layer1_2_3
```

---

## 2. Subsystems

### 2.1 Identity Subsystem (`src/identity/`)
- **ATProto Authentication Provider (`atprotoProvider.js`)**:
  - Connects to Bluesky / AT Protocol Personal Data Servers (`https://bsky.social` or custom PDS).
  - Resolves handles (`alice.bsky.social`) to decentralized identifiers (`did:plc:...`).
  - Issues and verifies session JWT tokens.
- **Web3 & NFT Identity Provider (`web3NftProvider.js`)**:
  - Implements EIP-4361 Sign-In With Ethereum (SIWE).
  - Resolves EVM addresses to W3C `did:pkh:eip155:<chainId>:<address>`.
  - Provides extensible token-gating interface for ERC-721/1155 NFT ownership credentials.

### 2.2 Validation Market Subsystem (`src/market/validationMarket.js`)
- Supports stake-weighted claim wagering across Vera's 4 epistemic outcomes:
  `VERIFIED`, `MISINFORMED`, `DISPUTED`, `NEED_CONTEXT`.
- Tracks prediction pools, computes implied probabilities & odds multipliers.
- Automated resolution upon oracle/jury verdict settlement with payout distribution.

### 2.3 Epistemic DAO Governance Subsystem ("EnDAOsment") (`src/governance/daoRegistry.js`)
- Protocol proposal lifecycle (`ACTIVE` -> `PASSED`/`FAILED` -> `EXECUTED`).
- Weighted voting based on epistemic reputation and staked tokens.
- Quorum & consensus threshold enforcement (e.g. 66% supermajority).
