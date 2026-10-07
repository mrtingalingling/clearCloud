# ClearCloud

ClearCloud is a social network organized by relational closeness. Informational posts rank by groundedness, challenged posts by their ruling, and entertainment by reputation-damped engagement. Its Courtroom settles challenged claims with rulings from randomly selected, blind panels. It builds on [Vera](https://github.com/mrtingalingling/vera) only through Vera's public SDK and API, like any other platform.

## Status

Every feature carries exactly one status: **Proposed → Confirmed → Prototyped → Audited**. Only Audited features are meant for outside users. Today nothing in this repo is Audited.

**In the prototype today (Prototyped)**

- **Proximity circles:** close friends (with an optional filter for non-personal reposts), friends and acquaintances, and network-wide.
- **Courtroom basics:** falsifiability screening, splitting compound claims into sub-cases, random panel selection, and blind trials with anonymized parties and decoy cases.
- **Evidence submission:** content-linked evidence (IPFS, Arweave, DOI) with a relevance check.
- **Like damping:** reactions from low-reputation accounts count for less.

**Planned (Proposed in the design documents)**

- **Ranking:** groundedness for informational posts, rulings for challenged posts, and damped engagement for entertainment, with Vera's verdicts shown like a community note.
- **Challenges and rulings:** free, reputation-staked challenges; 7–9-person panels; second reviews; and penalties for frivolous challenges.
- **Probation:** prominent Vera notes, a time lock, or a refundable bond for high-reach, low-reputation accounts.
- **Identity:** personas that share one reputation per real person, with proof of personhood.
- **Governance:** reputation tiers, two-stage voting with quadratic ballots through MACI, and a timelocked DAO treasury.
- **Rust backend:** server-side logic rebuilt in Rust (ADR-016).

Some prototype features are being removed on purpose: stake-to-repost, money deposits for evidence and juries, the 94%/6% cold-case refunds, challenge bonds, unlimited penalties, overlays on other social sites, and cases opened from Vera's extension. The design document lists where every feature goes.

## Documentation

- **ClearCloud design:** feed, Courtroom, probation, identity, governance, decisions, tickets, and threat model — [`docs/clearcloud.md`](./docs/clearcloud.md)
- **Ecosystem overview:** products, money flows, and cross-product decisions shared with Vera and Veracities.bet — [`docs/ecosystem.md`](./docs/ecosystem.md)
- **Vera:** [`mrtingalingling/vera`](https://github.com/mrtingalingling/vera)
- **Veracities.bet:** [`mrtingalingling/veracities.social`](https://github.com/mrtingalingling/veracities.social)

## Getting started

```bash
npm install
npm run dev     # Svelte 5 dev server on port 5173
npm run build   # Production bundle
```

## Testing

```bash
npm test             # Run the Vitest suite once
npm run test:watch   # Re-run on changes
```

## Repository structure

```text
clearCloud/
├── docs/            # ClearCloud design and Ecosystem overview
├── src/
│   ├── feed/        # Circles, ranking, reputation
│   ├── courtroom/   # Cases, sortition, blind trials, evidence
│   ├── social/      # Overlay prototype (being removed)
│   ├── config/      # Settings and contract addresses
│   └── components/  # Svelte 5 UI
├── tests/           # Vitest suites
└── package.json
```

The DAO contracts (`EpistemicCrsManager.sol`, `EpistemicGovernor.sol`) and the Courtroom escrow are moving here from `veracities.social` under ticket C-012.

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).
