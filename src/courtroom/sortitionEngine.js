/**
 * Algorithmic Civic Sortition Engine
 * Selects an impartial, randomized citizen jury panel for each Courtroom docket.
 * Replaces open volunteer brigading with verifiable pseudo-random jury summons.
 */

export class SortitionEngine {
  constructor(defaultPanelSize = 7) {
    this.defaultPanelSize = defaultPanelSize;
    this.summonedJuries = new Map(); // caseId -> Set<jurorDid>
    this.citizenPool = [
      'did:plc:alice.bsky.social',
      'did:plc:bob.bsky.social',
      'did:plc:carol.bsky.social',
      'did:plc:dave.bsky.social',
      'did:plc:elena.bsky.social',
      'did:plc:frank.bsky.social',
      'did:plc:grace.bsky.social',
      'did:plc:hector.bsky.social',
      'did:plc:iris.bsky.social',
      'did:plc:judith.bsky.social',
      'did:plc:karl.bsky.social'
    ];
  }

  /**
   * Deterministically summons a jury panel for a given docket using case hash.
   */
  summonJuryForCase(caseId, creatorDid = null, pool = this.citizenPool, panelSize = this.defaultPanelSize) {
    if (this.summonedJuries.has(caseId)) {
      return Array.from(this.summonedJuries.get(caseId));
    }

    // Filter out case creator to prevent self-judging
    const eligiblePool = pool.filter(did => did !== creatorDid);
    if (eligiblePool.length === 0) {
      throw new Error('Eligible citizen juror pool is empty');
    }

    // Deterministic pseudo-random shuffle based on caseId string hash
    const seed = this._hashString(caseId);
    const shuffled = [...eligiblePool].sort((a, b) => {
      const hashA = this._hashString(a + seed);
      const hashB = this._hashString(b + seed);
      return hashA - hashB;
    });

    const selectedPanel = shuffled.slice(0, Math.min(panelSize, shuffled.length));
    this.summonedJuries.set(caseId, new Set(selectedPanel));

    return selectedPanel;
  }

  /**
   * Verifies if a given juror has been summoned for duty on this case.
   */
  isJurorSummoned(caseId, jurorDid) {
    if (!this.summonedJuries.has(caseId)) {
      this.summonJuryForCase(caseId);
    }
    const jurySet = this.summonedJuries.get(caseId);
    return jurySet.has(jurorDid);
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export const sortitionEngine = new SortitionEngine();
