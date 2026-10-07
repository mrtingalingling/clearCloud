# ClearCloud: Design Document Set

ClearCloud is a social network organized by closeness and ranked by groundedness, rulings, and damped engagement, with a Courtroom that settles challenges by ruling. It builds on Vera only through Vera's public SDK and API, like any other platform.

## Brief

**Purpose.** A social network organized by relational closeness, where informational posts rank by groundedness, challenged posts by their ruling, and entertainment by reputation-damped engagement, with the Courtroom for structured debate and rulings on contested claims.

**Users.** General social users.

**In scope.** Proximity circles; ranking by ruling for challenged posts, by groundedness for unchallenged informational posts, and by damped engagement for entertainment, with Vera's labels shown; reputation (visible to its owner with reasons, and public as a band for accounts above 20,000 followers); the Courtroom; probation and bonds; personas; falsifiability gatekeeping through Vera; and the governance (DAO) portal on a clearcloud.social subdomain.

**Out of scope.** Wagers of any kind, and any stake, surcharge, or refund tied to a claim, verdict, or Veracities.bet position, apart from the refund-or-forfeit probation bond (ADR-011). The current spec's USDC stake-to-repost, broadcast bonds, $25 case wagers, and 94%/6% refunds move to Veracities.bet or become non-monetary.

**Success measure.** TBD: set by the owner before the Courtroom pilot. Candidates from the earlier PRD: share of rulings still undisputed after 12 months; reduction in non-personal rage-bait impressions in the outer circles within 30 days of bad-faith activity; and cross-faction bridging on contested claims.

## Feed and ranking

Carried over from the earlier PRD and Proposed here (C-013).

- **Proximity circles:** three circles organize the feed. Close friends shows personal updates only, with an optional filter that hides non-personal reposts such as viral outrage; friends and acquaintances shows direct contacts; network-wide shows public figures, news outlets, and institutions.
- **Ranking:** challenged posts rank by their ruling. Unchallenged informational posts rank solely by the groundedness index, G = facts ÷ (facts + speculation + 3 × debunked). Unchallenged entertainment posts rank by engagement (likes, reposts, comments, shares), weighted by like damping (Confirmed). Vera's entertainment-or-informational label, from the same classify-only call, decides which applies, and an informational post with no checkable claims falls back to engagement.
- **Groundedness inputs (Confirmed):** facts are the post's checkable claims, true or not; speculation is its opinions, predictions, and value judgments; debunked are claims matching a Courtroom ruling of `misinformed` in any earlier case on the same claim. The checkable-or-not split comes from Vera's classify-only call (claims:classify), which labels claims without judging them. Groundedness uses only that label, which surfaces as Vera's not-checkable verdict; Vera's other five verdicts are never inputs.
- **Vera labels:** when Vera rates a claim in an unchallenged post misinformed, disputed, or needs-context, the post carries Vera's label and the reader is told, with a link to the evidence; the label works like a community note: shown whatever the post's rank and never an input to ranking (Confirmed). Labels and outrage are expected to draw challenges, and a challenge's ruling then sets the post's rank.
- **Asymmetric reputation:** reputation falls fast after a lost ruling and rises slowly with sustained good rulings.
- **Like damping:** reactions from low-reputation accounts count for less, weighted by max(0.01, (reputation ÷ 50)²) below a reputation of 50 and min(2, reputation ÷ 50) above it, so bot rings can't manufacture reach.
- **Superseded:** the PRD's fully hidden reputation is replaced by the public band above 20,000 followers, and its USDC stake-to-repost and broadcast bonds are replaced by probation (ADR-011).

## How ClearCloud uses Vera

ClearCloud is a Vera customer: it embeds Vera's public SDK in its app and server and calls Vera's public API, with no private access.

- **Scrubbing:** Vera's scrubber runs inside ClearCloud's app before anything reaches Vera. Drafts and messages get a preview; automatic checks of already-published posts are scrubbed on ClearCloud's server without a prompt.
- **Passive checks:** posts are checked in the background and shown with Vera's verdict badge and confidence, under the host platform contract in the Vera design document. Ranking labels come from Vera's cheaper classify-only call (claims:classify), so ranking never needs a full check.
- **Disagreement:** when a ruling and Vera's verdict disagree, ClearCloud shows both, labeled by source. Anyone can request a hallucination check through Vera's audit endpoint; a ruling never changes a verdict. The audit endpoint ships at Vera's Gate 4, so until then the Courtroom pilot shows the ruling and the verdict side by side, labeled, without hallucination checks.
- **Exhibits:** when a case opens, ClearCloud freezes Vera's verdict and evidence with a snapshot and attaches it to the case by CID.
- **Falsifiability gatekeeping:** Vera's `not-checkable` result routes opinions and predictions away from the Courtroom.
- **Other sites:** labels on Bluesky, X, Reddit, and YouTube come from Vera's extension. The prototype's ClearCloud overlays on those sites are dropped, and ClearCloud shows its case links only on ClearCloud.

## The Courtroom

Challenges are free and staked with reputation only; a panel's ruling settles each one.

**Challenges.** Anyone with the minimum reputation can challenge a post by filing a challenge record. The post then shows a neutral "Under challenge" banner linking to the case; a pending challenge never hides or throttles a post by itself. Each post has at most one open case, and later challengers join it. Challenges start on ClearCloud, including by pasting a link to outside content; the prototype's cases opened from Vera's extension are dropped, so Vera stays standalone. A challenger may publish a signed reputation attestation by opt-in. Veracities.bet may open its own market on a challenge record, but no wager changes what ClearCloud shows.

**Rulings.** A panel issues a ruling on each challenge, with Vera's verdict and evidence attached as an exhibit: Vera investigates, the challenger argues the case, and the panel rules. Panelists attest that they hold no Veracities.bet position on the case, and Veracities.bet voids any position held by a seated panelist, the poster, the challenger, or their declared affiliates. Public records identify panelists and parties only by private per-case conflict codes (C-009), so neither panelists nor anyone's personas are exposed. Rulings drive groundedness ranking, reputation, and probation.

**Frivolous challenges.** A failed challenge costs the challenger its reputation stake. A panel can also find a challenge frivolous or abusive (a claim already decided, no stated basis, coordinated filing, or repeated targeting of one account), which costs more reputation and adds a cooldown. Repeated findings suspend the right to challenge for a set period, with appeal. Penalties rise with repetition, never with the challenger's views.

**Case lifecycle.** Carried over from the earlier PRD and Proposed here (C-004).

- **Conclusive:** a panel supermajority of at least two-thirds, reached within two weeks of the evidence, closes the case with a ruling.
- **Cold:** no new evidence or activity for 14 days archives the case until someone reopens it. The PRD's 94% wager refund and 6% fee are gone with the wagers.
- **Decomposition:** Vera splits a compound claim into a graph of sub-claims, each its own case, and the parent resolves when its children do.
- **Reopening:** fresh material evidence, a low quorum, or statistical signs of brigading can reopen a case. Reopening needs a larger reputation stake rather than the PRD's money bond, and the quorum scales with the community: max(minimum, 5% of active members).
- **Second review:** for a bonded post, a `disputed` or `needs-context` ruling, or a panel that misses its supermajority within two weeks, goes to a new batch of panelists before the case closes (Confirmed).

**Panels.** Carried over from the earlier PRD and Proposed here (C-004).

- **Sortition:** panelists are summoned at random from eligible members: proof of personhood, minimum reputation, and no conflict. The PRD's alternative of a 10 USDC civic bond is dropped, because money must not buy a panel seat.
- **Blind trials:** panelists see the claim with parties replaced by placeholders, inflammatory wording stripped, and text paraphrased against stylometric identification, mixed with synthetic decoy cases. Breaking-news cases wait 48 hours before a panel is summoned.
- **Ballots:** secret ballots with the outcomes `verified`, `disputed`, `misinformed`, and `needs-context`; the ruling record is signed by an M-of-N threshold of the panel. The prototype weighted panel votes by reputation (from 0.05× up to 2×); whether rulings use weighted or equal votes is part of C-004. Each case summons 7 to 9 panelists. An AI summary of the arguments may help the panel, but the panel, not the AI, signs the ruling.
- **Evidence:** submissions need a resolvable content link (CID or DOI) and pass a relevance check before they enter the docket; the PRD's escalating USDC deposits are replaced by reputation costs.
- **Panel pay:** a flat rate per case (Confirmed), replacing the PRD's 5% of the losing market pool, so pay never depends on betting volume or forfeits. Its funding source is set in C-004.

## Trust and safety

The Courtroom rules on whether claims are true; illegal and harmful content goes through a separate trust-and-safety process, and the Courtroom never rules on legality.

- **Reports and action:** users can report illegal content, harassment, threats, and impersonation; reviewers act under published rules, with notice to the poster and an appeal.
- **Legal duties:** takedown requests, mandatory reporting (including child-safety reporting), and transparency reporting follow the law of each launch market, set out in C-010.
- **Interplay:** a post removed for legality closes any open case on it; reputation changes only through rulings, so a removal never moves reputation by itself.

## Age policy

ClearCloud sets a minimum age per launch market (C-011). Minors can't post bonds, sit on panels, or see Veracities.bet ads, and their reputation is never public, whatever their follower count.

## Probation, bonds, and rewards

Probation slows high-reach, low-reputation accounts without silencing them, and every path out has a non-monetary option.

**Probation.** An account above a follower threshold whose reputation falls below a set floor enters probation, scaled by follower tier. It chooses one path: its next N posts publish immediately with Vera's note shown prominently (Confirmed); a reputation stake or time lock; or a refundable bond.

**Bonds.** The bond is a security deposit, not a purchase: it never changes ranking or reputation. A bonded post that nobody challenges within a set window counts as a favorable ruling, and its bond refunds automatically (Confirmed). A challenged bonded post goes to a ruling: `verified` refunds the bond and `misinformed` forfeits it. A `disputed` or `needs-context` ruling, or a panel that misses its two-thirds supermajority within two weeks, sends the case to a second review by a new batch of panelists; if that review is still `disputed`, `needs-context`, or short of a supermajority, the bond refunds (Confirmed). Bond size doubles with each follower tier rather than growing with raw follower count.

**Forfeits.** Forfeited bonds fund ClearCloud development, never Vera, the shared protocol, the parties, or the panel. After 12 months, any leftover pays evidence-quality rewards: the panel rates each piece of evidence, rewards go to useful evidence whichever side it helped, and the parties to the case are excluded.

**Influencer rewards.** High-reputation accounts earn rewards for post quality from a fixed budget set in advance and funded by ClearCloud's non-betting earnings, never by forfeits, so no recipient gains when someone else loses a bond. Rewards never buy voting weight.

## Identity and reputation

One natural person holds one reputation, however many personas they post under.

- **Personas:** each ATProto account can run several personas (aliases) for privacy, all sharing one reputation held by a master account. Each master account belongs to one unique natural person, shown by a privacy-preserving proof of personhood.
- **Master-level rules:** penalties, probation, challenge rights, and panel seats apply to the master account, and follower thresholds count followers across all of its personas.
- **Reputation:** changes only through rulings, for posters and challengers alike; Vera verdicts inform rulings but never move reputation directly. It is non-transferable, and challenging or sitting on a panel needs a minimum reputation.
- **Visibility:** reputation is visible to its owner with reasons. Above 20,000 followers it is public as a band rather than an exact score, so matching scores can't link personas. ClearCloud never links a wallet to a persona, and the prototype's NFT token-gating is dropped.

## Governance, treasury, money, and records

**Governance.** The DAO portal covers ClearCloud's own rules, ranking weights, and the DAO treasury only; it has no authority over Vera's methodology or Veracities.bet. Votes are weighted by reputation, never bought with money, and cast through MACI, with its signup gatekeeper set to the proof of personhood. MACI relies on a trusted coordinator who can see votes. The Owner holds the coordinator role for now as a placeholder, and C-007 documents how its keys are held; the role is later assignable, like other Owner roles.

**Voting design.** Carried over from the current repo's EnDAOsment adaptation and Proposed here; governance votes on ClearCloud's rules, ranking weights, and treasury, never on whether a claim is true, which is the Courtroom's job.

- **Tiers:** four reputation tiers with quadratic credit budgets: Novice 100, Contributor 500, Arbiter 1,500, Sage Elder 3,000. Weights are checkpointed at block numbers, so reputation can't be borrowed or inflated for a single vote.
- **Stage 1, approval vetting:** Arbiters and Sage Elders vet proposals for safety and scope, never claim truth (Confirmed), with tier weights of 1, 5, 15, and 30.
- **Stage 2, quadratic voting:** members spend credits, and a vote's weight is the square root of the credits spent, rounded down. Stage 2 ballots are cast through MACI.
- **Timelock:** approved proposals wait 24–48 hours in a timelock for public inspection before they execute on-chain.
- **Contracts:** ClearCloud's own contracts are `EpistemicCrsManager.sol` (reputation tiers and checkpoints) and `EpistemicGovernor.sol` (Semaphore anonymous ballots and adapters). They build on `ApprovalGovernor.sol`, `QuadraticGovernor.sol`, and `GovernorGeneral` from the upstream `DAO-Smart-Contract-Framework` repo, which stays untouched. `EpistemicGovernor.sol` connects through an adapter (`configureParentDAO`) with fallbacks for OpenZeppelin Governor, Gnosis Safe Zodiac, and Aragon OSx, all behind UUPS/ERC-1967 proxies with reserved storage gaps, so framework upgrades don't touch reputation checkpoints. Upgrade rules: constructors call `_disableInitializers()`, initialization runs atomically in the proxy, storage gaps are never removed, the EIP-712 domain separator is stored rather than immutable, and upgrades need the owner or an approved proposal. ClearCloud's contracts currently sit in the `veracities.social` repo and move to ClearCloud's repo (C-012).

**Earlier choices to keep or replace (C-007).** The earlier docs chose Base (with Arbitrum as the alternative) for the contracts and USDC, Gitcoin Passport (score of at least 20) or World ID for proof of personhood, and Semaphore zero-knowledge proofs so members can prove their tier without revealing who they are. Semaphore proves membership anonymously while MACI resists collusion, so the two may work together. The PRD also weighted votes by an Epistemic Quotient (0.40 factuality + 0.30 bridging consensus + 0.20 steel-manning − 0.30 toxicity) rather than ruling-based reputation alone; which one sets voting weight is part of C-007.

**Treasury.** The DAO treasury runs on contracts adapted from the EnDAOsment framework behind UUPS/ERC-1967 proxies, funds ClearCloud and Vera's fixed budget, and holds no funds until the contracts pass an audit (S-006). The blockchain for MACI and the contracts is still open; MACI is built for Ethereum, and the choice is part of C-007. The full rules are in ADR-015 and the Ecosystem design document's money-flow table.

**Money flows.** ClearCloud's money is deterministic (ads, creator payments, subscriptions, data-access fees) except the probation bond. Veracities.bet ads run only where gambling advertising is legal, only to age-verified users who opted in, labeled as gambling ads, and never on or beside a post under challenge; their revenue goes to the segregated pool. Each new money flow gets a threat-delta review against ADR-011 before it ships.

**Records.** ClearCloud's ATProto records live under `social.clearcloud.*`: challenge (post, challenger persona, claim, reputation stake), ruling (case, outcome, panel attestations under per-case conflict codes, exhibits including the frozen Vera verdict's CID), and reputation attestation (a master-level band signed by ClearCloud and published by the user's opt-in). Like Vera's ledger, these records carry hashes of post and claim text rather than the text, so deleted posts leave nothing readable behind, and signed redaction records withdraw them. The prototype's `social.veracities.courtroom.*` and `social.veracities.identity.link` schemas move to `social.clearcloud.*`, because veracities.social now belongs to Veracities.bet. Schema changes are backward compatible: new fields are optional, and required fields are never removed or renamed without a version bump.

## Key journeys

Updated from the earlier user journeys.

1. **Challenge a post:** a member challenges a post, Vera's falsifiability check admits it, the post shows "Under challenge," and a blind panel rules.
2. **Serve on a panel:** a summoned member passes the personhood and conflict checks, reviews the anonymized case with Vera's evidence exhibit, and casts a secret ballot.
3. **Probation:** a high-reach account falls below the reputation floor and picks prominent Vera notes on its next posts, a time lock, or a refundable bond.
4. **Vote on governance:** a member proves their tier anonymously and casts a quadratic ballot through MACI on a rule, ranking weight, or treasury proposal.

## Decisions

### ADR-011: No wagers in ClearCloud; bonds are refund-or-forfeit only

**Context.** ClearCloud's spec includes USDC stakes, bonds, wagers, and refunds tied to claim outcomes, which a regulator could read as wagering and which give users a financial reason to push outcomes. ClearCloud will still carry ordinary money flows, such as ads, creator payments, subscriptions, and the DAO treasury.

**Decision.** ClearCloud's money flows are deterministic (ads, creator payments, subscriptions, data-access fees), with one exception: the probation bond, a refundable security deposit whose only outcomes are full refund or forfeit, decided by a ruling; an unchallenged post refunds automatically after a set window. The bond never buys ranking, reputation, or voting weight and pays nothing to challengers or panelists. Forfeits fund ClearCloud development, then evidence-quality rewards, and never Vera. ClearCloud takes no wagers, holds no Veracities.bet positions, and never lets a wager change what it displays. Veracities.bet connects only through public records and opt-in attestations.

**Consequences.** The bond is the one place ClearCloud money depends on an outcome, so it needs legal review before launch (C-003). Accounts that can't pay keep non-monetary probation paths. Veracities.bet ads inside ClearCloud are likely gambling advertising and need legal review like B-001.

### ADR-015: DAO treasury, walled off from verdicts and markets

**Context.** ClearCloud's governance runs on contracts adapted from the EnDAOsment DAO framework, behind UUPS/ERC-1967 proxies, and the DAO holds a treasury that funds ClearCloud and Vera.

**Decision.** The treasury is spent only by reputation-weighted governance votes cast through MACI, never by money. It may not hold Veracities.bet positions, fund markets on claims, or pay for or toward any verdict, and funding a product carries no say over Vera's methodology. Betting-derived income (Veracities.bet's payments to ClearCloud for data access and ads) goes to a segregated pool that can fund ClearCloud and Veracities.bet but never Vera. Vera is funded only from API fees and ClearCloud's non-betting earnings, on a multi-year budget fixed and published in advance. Veracities.bet pays Vera the normal per-call price, and anything above Vera's cost of serving it (method in C-006) goes to the segregated pool. Forfeited bonds never fund Vera, and influencer rewards come from a fixed non-betting budget, never from forfeits. Contracts hold no funds until they pass an independent audit (S-006).

**Consequences.** Governance can't become a back door between the social network and the market, and Vera's income never moves with verdicts, rulings, or betting volume. Audits add cost and time before launch. Open: the legal wrapper and jurisdiction (C-002), deferred until ClearCloud and Veracities.bet MVPs exist and Vera is Audited.

## Plan and tickets

ClearCloud's build starts after Vera's Gate 2 freezes the API; the Courtroom pilots without wagers or bonds, and bonds wait for counsel's memo. Tickets follow the assignment rules and Owner placeholder in the Vera design document.

| ID | Ticket | Acceptance criteria | Model | Reviewer | Depends on | Status |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Spec for removing claim-linked money from ClearCloud (ADR-011), written by a human with Claude Opus 5.5 assisting; code removal follows as AI tickets | No claim-linked currency fields remain, including the prototype's money features that are switched off by default today; ADR-011 Confirmed | Human | Owner | — | To do |
| C-002 | Treasury legal wrapper and jurisdiction (ADR-015) | Counsel's written decision on the legal wrapper and jurisdiction; no contract holds funds before S-006 passes | Human | Owner | ClearCloud and Veracities.bet MVPs; Vera Audited | To do |
| C-003 | Probation paths and the refund-or-forfeit bond (ADR-011) | Follower tiers, reputation floor, N, bond schedule, and refund window set; second review by a new panel for disputed, needs-context, or no-supermajority rulings; forfeits routed to ClearCloud development and evidence rewards, never Vera; counsel memo on the bond, including payment-provider and anti-money-laundering requirements for deposits; non-monetary paths always available; prototype candidates considered: thresholds of 10,000 followers and reputation below 60, and ruling-based reputation changes of +2 (with the panel majority), −18 (debunked), and −25 (Courtroom penalty), with the reputation scale stated | Human | Owner | C-004 | To do |
| C-004 | Challenge and ruling records, panels, and frivolous-challenge penalties | Records under social.clearcloud.\*, carrying text hashes only, with redaction records, and prototype social.veracities.\* schemas migrated; lifecycle, reopening, quorum, sortition, blind-trial, cooling-off, and evidence rules written; flat-rate panel pay funded; weighted or equal panel votes decided; one open case per post; panel selection and appeal rules written; penalty ladder tested against brigading fixtures | Human | Owner | Vera Gate 2 | To do |
| C-005 | Public reputation for accounts above 20,000 followers | Shown as a band on personas, with reasons and an appeal path; threshold has a buffer so accounts can't hover just under it; privacy review passed | Claude Sonnet 5.5 | Human (security) | C-004, C-007 | To do |
| C-007 | Personas, proof of personhood, and the MACI signup gatekeeper | One master account per natural person; personas share reputation and penalties; follower thresholds summed across personas; MACI signup gated by the proof of personhood; blockchain for MACI and the DAO contracts chosen (Base was the earlier choice); proof-of-personhood provider chosen (Gitcoin Passport or World ID were earlier choices); Semaphore's role and EQ versus reputation for voting weight decided; coordinator role held by the Owner as placeholder, with key custody documented; persona links never appear in public records | Claude Opus 5.5 | Human (security) | — | To do |
| C-008 | Reward programs: evidence-quality rewards and influencer quality rewards | Evidence rewards panel-rated, paid whichever side the evidence helped, parties excluded; influencer rewards from a fixed non-betting budget set in advance, never sized by forfeits; neither changes voting weight | Human | Owner | C-003, C-004 | To do |
| C-010 | Trust and safety: reporting, review, takedowns, mandatory reporting, transparency | Published content rules; report-to-action flow with notice and appeal; legal duties per launch market listed by counsel; child-safety reporting path in place before launch | Human | Owner | — | To do |
| C-011 | Minimum age and minors policy | Minimum age set per launch market; minors blocked from bonds, panels, and Veracities.bet ads; minors' reputation never public; age check method reviewed for privacy | Human | Owner | C-007 | To do |
| C-012 | Move the DAO contracts from veracities.social to ClearCloud's repo and align them with the voting design and MACI | EpistemicCrsManager.sol, EpistemicGovernor.sol, and CourtroomEscrow.sol (rewritten as the probation-bond escrow, with no cold-case fee or challenge bonds) build and test in ClearCloud's repo, with copies of the proxy and interface contracts; the DocketCase, JurorVote, Post, and User tables, the governance and Semaphore modules, and the courtroom and identity lexicons move too; ValidationMarket.sol, its stake and attestation tables, and the settlement relayer stay in veracities.social; ApprovalGovernor and QuadraticGovernor stay untouched upstream; Stage 2 tallies come from MACI; Stage 1 scope excludes claim truth; storage layout unchanged across the move | Claude Opus 5.5 | Human (security) | C-007 | To do |
| C-013 | Feed: proximity circles, groundedness ranking, like damping | Three circles with the close-friends filter; challenged posts ranked by ruling, unchallenged informational posts by G, and entertainment by damped engagement; groundedness input mapping and the entertainment label tested; Vera labels shown without changing rank; like damping tested against a bot-ring fixture | Claude Opus 5.5 | Owner | Vera Gate 2, V-211 | To do |
| C-014 | Rust backend for ClearCloud's server-side logic: Courtroom, sortition, feed ranking, records (ADR-016) | Builds and tests in CI from a clean clone; replaces the prototype's JavaScript services and Prisma models; calls Vera only through its public API | Claude Opus 5.5 | Human | C-012 | To do |
| S-006 | Independent audit of the DAO contracts and proxies before the treasury holds funds | External auditor's report; all critical and high findings fixed and retested; upgrade keys and proxy admin custody documented | Human | Owner | — | To do |

## Threat model

The assets are ruling integrity, reputation, users' identities behind their personas, bonds, and the treasury. Threats that cross into Vera or Veracities.bet are in the Ecosystem design document.

| Threat | Where | Mitigation | Tickets | Reviewed at |
| --- | --- | --- | --- | --- |
| Panelists, parties, or brigades steering a ruling | Courtroom | No-position attestations; positions of panelists and case parties voided; one case per post; frivolous-challenge penalties; appeals | C-004, B-002 | Before the Courtroom pilot |
| Bond forfeits rewarding rulings against posters | Probation | Forfeits fund ClearCloud development, never challengers, panelists, or Vera; evidence rewards paid whichever side the evidence helped | C-003, C-008 | Before bonds launch |
| Reward programs creating a stake in forfeits | Influencer and evidence rewards | Influencer rewards from a fixed non-betting budget; parties excluded from evidence rewards | C-008 | Before rewards launch |
| Sybil accounts, or linking a person's personas | Identity, governance | Proof of personhood per master account; MACI gatekeeper; reputation bands on personas; persona links kept out of public records | C-007, C-005 | Before the Courtroom pilot |
| Vote coercion or a compromised MACI coordinator | Governance | MACI's anti-collusion design; coordinator identity and key custody documented | C-007 | Before governance votes |
| Treasury contract compromise | DAO contracts | Independent audit; documented upgrade-key and proxy-admin custody | S-006 | Before contracts hold funds |
| Exposing panelists or linking personas through case records | Courtroom records, Veracities.bet conflict check | Per-case conflict codes instead of identities; no persona or panelist names in public records | C-009 | Before the Courtroom pilot |
| Illegal content, harassment, or missed legal duties | Feeds, posts, messages | Separate trust-and-safety process; counsel-listed duties per market; child-safety reporting path | C-010 | Before public launch |
| Minors posting bonds, seeing gambling ads, or having public reputation | Identity, probation, ads | Minimum age per market; minors blocked from bonds, panels, and gambling ads; reputation kept private | C-011 | Before public launch |
| Panelists paid from betting volume or forfeits | Courtroom, panel pay | Flat rate per case, independent of betting volume and forfeits; the PRD's 5% market fee to jurors dropped | C-004 | Before the Courtroom pilot |
| Framing informational posts as entertainment to escape the groundedness index | Feed ranking | Vera assigns the label, not the poster; mislabeled posts can be challenged; label accuracy measured on a fixture set | C-013 | Before public launch |
| Manipulating Vera's checkable-or-not labels to move informational posts' rank | Feed ranking, Vera | Label accuracy measured on a fixture set; Vera's injection suite; any challenge replaces G with a ruling | C-013, S-001 | Before public launch |
