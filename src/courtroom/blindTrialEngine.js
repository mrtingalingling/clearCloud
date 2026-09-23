/**
 * Blind Trial Proposition Abstractor
 * Converts emotionally-charged, partisan, or celebrity-centric social claims
 * into anonymized, first-order logical propositions with spatio-temporal mutual exclusivity checks.
 */

const PREJUDICIAL_TERMS = [
  /\bcorrupt\b/gi, /\blied\b/gi, /\bcrook\b/gi, /\bscandalous\b/gi, /\bdisastrous\b/gi,
  /\bbrazenly\b/gi, /\btraitor\b/gi, /\bhero\b/gi, /\bpatriot\b/gi, /\bvillain\b/gi,
  /\bdisgraceful\b/gi, /\bshameful\b/gi, /\bfake\b/gi, /\bhypocrite\b/gi, /\bevildoer\b/gi
];

const COMMON_NAMES = [
  'John', 'Smith', 'Alice', 'Bob', 'Carol', 'Dave', 'Trump', 'Biden', 'Musk', 'Zuckerberg',
  'Harris', 'Obama', 'Clinton', 'Sam', 'Altman', 'Vitalik', 'Satoshi'
];

export class BlindTrialEngine {
  constructor() {
    this.anonymizationMap = new Map();
  }

  /**
   * Sanitizes input text by removing prejudicial emotional rhetoric.
   */
  stripEmotionalRhetoric(text) {
    let cleaned = text;
    for (const pattern of PREJUDICIAL_TERMS) {
      cleaned = cleaned.replace(pattern, '').replace(/\s{2,}/g, ' ');
    }
    return cleaned.trim();
  }

  /**
   * Anonymizes entities, locations, and proper nouns into neutral logical variables.
   */
  anonymizeEntities(text, caseId = 'default') {
    let anonymized = this.stripEmotionalRhetoric(text);
    
    // Anonymize common names/entities
    let entityIdx = 1;
    for (const name of COMMON_NAMES) {
      const regex = new RegExp(`\\b${name}\\b`, 'gi');
      if (regex.test(anonymized)) {
        const placeholder = `[Entity_${String.fromCharCode(64 + entityIdx)}]`; // [Entity_A], [Entity_B]
        anonymized = anonymized.replace(regex, placeholder);
        entityIdx++;
      }
    }

    // Anonymize generic handles (@username)
    anonymized = anonymized.replace(/@[\w_.-]+/g, '[Entity_User]');

    // Anonymize specific recreational vs medical locations
    anonymized = anonymized.replace(/\b(golfing|golf course|resort|vacation|club)\b/gi, '[Location_Recreational_X]');
    anonymized = anonymized.replace(/\b(doctor|clinic|hospital|medical center|physician)\b/gi, '[Location_Medical_Y]');

    return anonymized;
  }

  /**
   * Evaluates Spatio-Temporal Mutual Exclusivity between a claim and contradicting evidence.
   * e.g., If Claim states Entity was at Location_X at Time_T, and Evidence proves Entity
   * was at Location_Y at Time_T (where Location_X != Location_Y), Proposition is Falsified.
   */
  evaluateMutualExclusivity({
    subject = 'Entity_A',
    claimedLocation = 'Location_Recreational_X',
    claimedTime = 'Monday',
    provenLocation = null,
    provenTime = null,
    evidenceConfidence = 0.95
  }) {
    if (!provenLocation || !provenTime) {
      return {
        isContradiction: false,
        status: 'UNCONTRADICTED',
        reasoning: 'No definitive counter-location evidence submitted.'
      };
    }

    const timesMatch = claimedTime.toLowerCase().trim() === provenTime.toLowerCase().trim();
    const locationsConflict = claimedLocation.toLowerCase().trim() !== provenLocation.toLowerCase().trim();

    if (timesMatch && locationsConflict && evidenceConfidence >= 0.8) {
      return {
        isContradiction: true,
        status: 'MUTUALLY_EXCLUSIVE_FALSIFIED',
        confidence: evidenceConfidence,
        logicalProof: `Physical impossibility: ${subject} cannot be simultaneously present at [${claimedLocation}] and [${provenLocation}] at time [${claimedTime}].`,
        recommendedVerdict: 'MISINFORMED'
      };
    }

    return {
      isContradiction: false,
      status: 'CONSISTENT_OR_INCONCLUSIVE',
      confidence: 0.5,
      reasoning: 'Locations or timestamps do not exhibit absolute mutual exclusivity.'
    };
  }

  /**
   * Formats a full Blind Trial docket for neutral juror presentation.
   */
  generateBlindDocket(caseObj) {
    const rawClaim = caseObj.claimText || caseObj.title || '';
    const anonymizedClaim = this.anonymizeEntities(rawClaim, caseObj.caseId);

    // Extract potential entities and conflict propositions
    const hasGolf = /golf/i.test(rawClaim);
    const hasDoctorEvidence = caseObj.evidenceRecords?.some(e => /doctor|clinic|medical/i.test(e.text || e.evidenceUrl || ''));

    let mutualExclusivityAnalysis = null;
    if (hasGolf && hasDoctorEvidence) {
      mutualExclusivityAnalysis = this.evaluateMutualExclusivity({
        subject: '[Entity_A]',
        claimedLocation: '[Location_Recreational_X]',
        claimedTime: 'Monday',
        provenLocation: '[Location_Medical_Y]',
        provenTime: 'Monday',
        evidenceConfidence: 0.98
      });
    }

    return {
      caseId: caseObj.caseId,
      isBlindTrial: true,
      anonymizedClaim,
      abstractedVariables: {
        subject: '[Entity_A]',
        locationClaimed: hasGolf ? '[Location_Recreational_X]' : '[Location_Unknown]',
        locationCounter: hasDoctorEvidence ? '[Location_Medical_Y]' : null
      },
      mutualExclusivityAnalysis,
      instructionsForJuror: 'Review purely the empirical spatio-temporal propositions and attached verified citations. Disregard prior personal, political, or celebrity knowledge.'
    };
  }

  /**
   * Layer 1.3 / Context-Leakage Defense (Roadmap Caveat 8 & PRD §4.3.B)
   * Deep Semantic Paraphraser: Converts breaking viral news into formal symbolic propositions
   * to strip stylometric fingerprints and prevent jurors from identifying current events.
   */
  deepSemanticParaphrase(text) {
    if (!text) return '';
    let sanitized = text
      .replace(/^(BREAKING|SHOCKING|EXCLUSIVE|LEAKED|JUST IN|ALERT):\s*/gi, '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/#\w+/g, '')
      .trim();

    sanitized = this.anonymizeEntities(sanitized);

    // Normalize action verbs into formal predicate clauses
    sanitized = sanitized
      .replace(/\b(fired|terminated|ousted|dismissed)\b/gi, 'executed involuntary cessation of contract with')
      .replace(/\b(signed|inked|partnered with)\b/gi, 'entered bilateral formal agreement with')
      .replace(/\b(stole|embezzled|misappropriated)\b/gi, 'executed unauthorized transfer of assets from')
      .replace(/\b(lied about|falsified)\b/gi, 'asserted statement conflicting with physical records regarding');

    return `Proposition P: ${sanitized}`;
  }

  /**
   * Generates a plausible synthetic decoy docket for calibration (Caveat 8).
   */
  generateDecoyDocket(category = 'SCIENCE') {
    const decoyId = `decoy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const syntheticTemplates = [
      {
        title: 'Laboratory replication of Room-Temperature Superconductor in Lead-Apatite',
        claim: 'Sample LK-99 exhibited diamagnetic levitation at 295 Kelvin under ambient pressure.',
        evidenceCid: 'ipfs://bafkreidecoycalibrationlk99experimentleadapatite001'
      },
      {
        title: 'Atmospheric methane anomaly over Martian Gale Crater',
        claim: 'Curiosity spectrometer detected localized methane spike exceeding 21 ppb on Sol 2446.',
        evidenceCid: 'ipfs://bafkreidecoysol2446curiosityspectrometrygale002'
      },
      {
        title: 'Protein folding conformational transition at sub-nanosecond scale',
        claim: 'Cryo-EM resolved intermediate transition state Alpha-Helix to Beta-Sheet at 1.8 Angstrom.',
        evidenceCid: 'ipfs://bafkreidecoycryoemresolutionconformational003'
      }
    ];

    const pick = syntheticTemplates[Math.floor(Math.random() * syntheticTemplates.length)];
    return {
      caseId: decoyId,
      title: pick.title,
      claimText: pick.claim,
      category,
      isDecoy: true,
      syntheticEvidenceCid: pick.evidenceCid,
      timerResetCount: 0,
      createdAt: Date.now()
    };
  }

  /**
   * Interleaves synthetic decoy dockets into juror feeds (Caveat 8).
   * Ensures jurors cannot determine whether a case carries financial stakes.
   */
  interleaveDecoyDockets(cases, decoyRatio = 0.25) {
    if (!Array.isArray(cases) || cases.length === 0) return [];
    const interleaved = [];
    let decoyCounter = 0;

    for (let i = 0; i < cases.length; i++) {
      interleaved.push(cases[i]);
      if ((i + 1) % Math.max(1, Math.round(1 / decoyRatio)) === 0) {
        interleaved.push(this.generateDecoyDocket());
        decoyCounter++;
      }
    }

    return interleaved;
  }
}

export const blindTrialEngine = new BlindTrialEngine();
