# Vera Ecosystem: Overview

Three products share one open protocol: Vera verifies claims as a standalone AI agent, ClearCloud builds a social network on Vera, and Veracities.bet runs a market on ClearCloud's challenge outcomes. This document lives in the ClearCloud repo and holds only what spans all three.

## Products and domains

This set replaces the single "Truth Settlement" PRD, its Layer 0–3 numbering, and the caveats ledger, which together implied one product with stacked dependencies. Each product ships, is branded, and can fail on its own.

| Product | What it is | Calls | Domain | Repo | Status |
| --- | --- | --- | --- | --- | --- |
| Vera | Standalone AI agent for claim verification, sold as a plug-in: API, SDK, embeddable components, browser extension | Nothing in the ecosystem | veracities.app | vera | Prototyped |
| ClearCloud | Social network with relational feeds and the Courtroom, where rulings settle challenges | Vera SDK and API; shared protocol | clearcloud.social (Confirmed); DAO portal on a subdomain | ClearCloud's repo (holds this document) | Prototyped |
| Veracities.bet | Licensed Validation Market on challenge outcomes | Vera API; ClearCloud's public challenge and ruling records | veracities.bet and veracities.social | veracities.social | Proposed |
| Shared protocol | ATProto record schemas: Vera's under `app.veracities.*`, ClearCloud's under `social.clearcloud.*` | Nothing | — | Defined in Vera's design document | Proposed |

All domain choices are intentional, including the shared "veracities" name across Vera and Veracities.bet. "The betting product" and "the Validation Market" both mean Veracities.bet.

Read the documents in this order: this one for what spans all three, then Vera (complete on its own), then ClearCloud and Veracities.bet, each of which builds on the ones before it.

## Status vocabulary

Every feature and decision in every document carries exactly one of these, in this order, and nothing else. ADRs use the first two.

- **Proposed:** written down in this set; not yet accepted by the owner; no code.
- **Confirmed:** accepted by the owner and specified; no code yet.
- **Prototyped:** code exists and runs in a demo; may contain stubs; not for users.
- **Audited:** no stubs, covered by tests and the eval harness, passed its gate's security review, and has a named owner. Only Audited features reach outside users.

Two documentation rules follow from the review of the current repo: a doc may only claim a status the code supports, and test counts never appear in product briefs. ADR numbers are global across documents.

## Money flows

Vera's income never depends on a verdict, a ruling, or betting volume; every rule below exists to keep that true.

| Money | Comes from | Can fund | Never funds |
| --- | --- | --- | --- |
| Vera's budget | API fees at published prices (price list in V-210), and ClearCloud's non-betting earnings | Vera, on a multi-year budget fixed and published in advance | — |
| Veracities.bet rake: 6% wager fee plus 5% of each losing pool | Wagers | Veracities.bet | Vera beyond its cost of serving the market |
| Segregated pool | Veracities.bet's payments to ClearCloud for data access and ads, and its API fees to Vera above Vera's cost of serving it (method in C-006) | ClearCloud and Veracities.bet | Vera |
| Forfeited bonds | ClearCloud probation bonds lost on a ruling | ClearCloud development; after 12 months, any leftover pays evidence-quality rewards | Vera, the shared protocol, the parties, the panel, influencer rewards |
| Influencer quality rewards | A fixed budget from ClearCloud's non-betting earnings, set in advance | High-reputation accounts, for post quality only | Never sized by forfeits |
| DAO treasury | ClearCloud's non-betting earnings, held by the DAO; forfeits are earmarked for ClearCloud and can never reach Vera's budget | ClearCloud and Vera (Vera only through its fixed budget) | Market positions, markets on claims, any verdict |
| Courtroom panel pay | ClearCloud's own revenue until Veracities.bet launches; then a percentage of Veracities.bet's earnings, through the segregated pool, with ClearCloud's revenue as the fallback | A flat rate per case, fixed in advance | Never varies with a case's outcome or its market |

Forfeits stay out of the shared protocol because its schemas and the `@vera/protocol` package are Vera's work. Influencer rewards come from a fixed budget so that no recipient, who may also challenge posts or sit on panels, gains when someone else loses a bond.

## Cross-product decisions

| ADR | Decision | Document | Status |
| --- | --- | --- | --- |
| 001 | Three products, one shared protocol, arm's-length integration | Ecosystem | Proposed |
| 002–009, 012–014 | Vera's design decisions | Vera | Proposed |
| 010 | Vera never settles money; rulings settle challenges | Ecosystem | Proposed |
| 011 | No wagers in ClearCloud; bonds are refund-or-forfeit only | ClearCloud | Proposed |
| 015 | DAO treasury, walled off from verdicts and markets | ClearCloud | Proposed |
| 016 | Every product's backend is Rust by default | Ecosystem | Proposed |

### ADR-001: Three products, one shared protocol

**Context.** Vera, ClearCloud, and Veracities.bet serve different audiences under different regulation, and Vera must be embeddable by platforms that compete with ClearCloud.

**Decision.** Release them as separate products. They integrate only through Vera's public SDK and API and public protocol records, never private databases or internal calls. ClearCloud embedding Vera's SDK counts as public integration.

**Consequences.** Each product can be replaced, sold, or shut down alone. Cross-product features take longer, because they must go through public interfaces.

### ADR-010: Vera never settles money; rulings settle challenges

**Context.** If payouts depend on Vera verdicts, anyone with a position has a reason to manipulate Vera, which damages it for every platform.

**Decision.** Vera verdicts, live or frozen, never settle money. Challenges settle on the final Courtroom ruling, published as a signed protocol record, and Veracities.bet markets on a challenge settle on that record. Vera's evidence for a case is frozen when the case opens and attached as an exhibit. Panelists, the parties, and their declared affiliates hold no position on the case. Conflicts are checked privately: each person gets a one-time code per case derived from their proof of personhood, panelists and parties publish only that code, and bettors prove theirs doesn't match, so no identity or persona link is revealed (C-009). Nothing from wagering feeds back into Vera, and rulings are never evidence or precedent for Vera: primary sources a case surfaces enter Vera's retrieval like any other source, and a ruling that disagrees with a verdict can trigger a hallucination check.

**Consequences.** Manipulation pressure moves from Vera to the Courtroom, so panel selection, conflict checks, and appeals carry the integrity load (C-004, B-002). Vera stays neutral because no outcome depends on it and no outcome feeds into it.

### ADR-016: Every product's backend is Rust by default

**Context.** Vera's server moves to Rust (ADR-014). ClearCloud's Courtroom, sortition, and feed logic and Veracities.bet's market, settlement relayer, and data layer are JavaScript in the prototypes, with Prisma as the database layer.

**Decision.** Server-side code in all three products is Rust by default; an exception needs its own ADR. Frontends stay Svelte and TypeScript, smart contracts stay Solidity, and the client SDKs stay TypeScript and Python.

**Consequences.** One backend language across the ecosystem, with record types generated from the shared schemas. Prisma and the prototypes' Node services are replaced rather than ported, so each product's backend is rebuilt as its tickets land (C-014, B-004).

## Tracks and open items

Vera's gates set the pace for the other two products; dates come once Vera's Phase 0 shows real velocity.

- **ClearCloud** integrates Vera through the public SDK and API after Vera's Gate 2 and pilots the Courtroom without wagers or bonds. Bonds wait for counsel's memo (C-003).
- **Veracities.bet:** its legal and licensing review (B-001) can start now, but no build work starts until counsel signs off. That review can't wait for an MVP.
- **Treasury legal wrapper (C-002):** goes to the owner's attorney once ClearCloud and Veracities.bet MVPs exist and Vera is Audited; no contract holds funds before then.

| ID | Ticket | Acceptance criteria | Model | Reviewer | Depends on | Status |
| --- | --- | --- | --- | --- | --- | --- |
| C-006 | Cost-of-serving method for Veracities.bet API fees (ADR-015) | Published method listing which costs count (compute, search, staff share); recalculated on a fixed schedule; Vera's multi-year budget term set; each surplus transfer to the segregated pool traceable from records | Human | Owner (sole; rule suspended) | — | To do |
| C-009 | Private conflict check between Courtroom cases and Veracities.bet positions (ADR-010) | Per-case codes derived from the proof of personhood; panel and party identities never published; Veracities.bet confirms a bettor's code doesn't match without learning who anyone is; declared affiliates covered; bettors hold the same proof-of-personhood credential | Claude Opus 5.5 | Human (security) | C-007 | To do |

## Threats that span products

Each product's design document keeps its own threat model; these are the ones that cross a product boundary.

| Threat | Where | Mitigation | Tickets | Reviewed at |
| --- | --- | --- | --- | --- |
| Manipulating Vera for wagering profit | Vera, Veracities.bet | Vera never settles money; markets settle on rulings; no feedback from wagering or rulings into Vera (ADR-010) | B-002 | Vera Gate 2 |
| Panelists, parties, or brigades steering a ruling that settles a market | ClearCloud Courtroom, Veracities.bet | No-position attestations; positions of panelists, parties, and affiliates voided through private per-case conflict codes; one case per post; frivolous-challenge penalties; appeals | C-004, C-009, B-002 | Before the Courtroom pilot |
| Betting money reaching Vera | Payments between products | Segregated pool; surplus above cost of serving goes to the pool; fixed multi-year budget | C-006 | Before Veracities.bet launches |
| Treasury used as a channel between ClearCloud and markets or verdicts | DAO contracts, treasury | ADR-015 limits; independent smart-contract audit before contracts hold funds | C-002, S-006 | Before contracts hold funds |
