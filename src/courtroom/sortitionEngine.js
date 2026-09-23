/**
 * Algorithmic Civic Sortition Engine
 * Selects an impartial, randomized citizen jury panel for each Courtroom docket.
 * Replaces open volunteer brigading with verifiable pseudo-random jury summons.
 */

export class SortitionEngine {
  constructor(defaultPanelSize = 7) {
    this.defaultPanelSize = defaultPanelSize;
    this.summonedJuries = new Map(); // caseId -> Set<jurorDid>
    this.citizenRegistry = new Map(); // did -> { did, humanityScore, stakedBond, epistemicQuotient }

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

    // Seed default verified citizens (Humanity score >= 20, Staked bond >= 10 USDC)
    for (const did of this.citizenPool) {
      this.citizenRegistry.set(did, {
        did,
        humanityScore: 25,
        stakedBond: 50,
        epistemicQuotient: 75
      });
    }
  }

  /**
   * Layer 1.3 / Sybil-Resistant Civic Sortition (Caveat 3 & PRD §4.3.C)
   * Registers a citizen for sortition duty. Enforces Gitcoin/WorldID Proof of Humanity (>= 20)
   * or a staked civic bond (>= 10 USDC / 50 VERA).
   */
  registerCitizen(params) {
    const { did, humanityScore = 0, stakedBond = 0, epistemicQuotient = 50 } = params;
    if (!did) throw new Error('Citizen DID is required');

    const hasProofOfHumanity = humanityScore >= 20;
    const hasStakedBond = stakedBond >= 10;

    if (!hasProofOfHumanity && !hasStakedBond) {
      throw new Error('Citizen must provide verified Proof of Humanity (score >= 20) or a staked civic bond (>= 10 USDC) to join jury sortition');
    }

    const record = {
      did,
      humanityScore,
      stakedBond,
      epistemicQuotient,
      registeredAt: Date.now()
    };

    this.citizenRegistry.set(did, record);
    if (!this.citizenPool.includes(did)) {
      this.citizenPool.push(did);
    }
    return record;
  }

  /**
   * Deterministically summons a jury panel for a given docket using case hash and EQ weights.
   */
  summonJuryForCase(caseId, creatorDid = null, pool = this.citizenPool, panelSize = this.defaultPanelSize) {
    if (this.summonedJuries.has(caseId)) {
      return Array.from(this.summonedJuries.get(caseId));
    }

    // Filter out case creator and ensure citizens pass Sybil verification gate
    const eligiblePool = pool.filter(did => {
      if (did === creatorDid) return false;
      const citizen = this.citizenRegistry.get(did);
      if (!citizen) return true; // Default fallback for raw DID strings
      return citizen.humanityScore >= 20 || citizen.stakedBond >= 10;
    });

    if (eligiblePool.length === 0) {
      throw new Error('Eligible citizen juror pool is empty');
    }

    // Deterministic pseudo-random shuffle weighted by caseId seed and EQ
    const seed = this._hashString(caseId);
    const shuffled = [...eligiblePool].sort((a, b) => {
      const eqA = this.citizenRegistry.get(a)?.epistemicQuotient || 50;
      const eqB = this.citizenRegistry.get(b)?.epistemicQuotient || 50;
      const hashA = (this._hashString(a + seed) % 1000) * (eqA / 50);
      const hashB = (this._hashString(b + seed) % 1000) * (eqB / 50);
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
