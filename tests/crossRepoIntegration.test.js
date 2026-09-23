import { describe, it, expect } from 'vitest';

// Layer 0: Vera Core Engine (Local AI + PII Scrubber)
import { analyzeClaimLocally, piiScrubber } from '../../vera/frontend/src/index.js';

// Protocol & Settlement Backend: veracities.social
import { createAuthProvider } from '../../veracities.social/src/identity/index.js';
import { ValidationMarket, OUTCOMES } from '../../veracities.social/src/market/validationMarket.js';
import { courtroomSettlement } from '../../veracities.social/src/settlement/courtroomSettlement.js';

// Unified Social Application: clearCloud
import { feedManager, CIRCLE_TIERS } from '../src/feed/feedManager.js';
import { caseManager, CASE_STATUS } from '../src/courtroom/caseManager.js';
import { juryEngine } from '../src/courtroom/juryEngine.js';
import { overlayService } from '../src/social/overlayService.js';

describe('Cross-Repo End-to-End Pipeline: vera -> veracities.social -> clearCloud', () => {
  it('executes full pipeline: PII scrubbing -> Local AI -> Protocol Auth -> Feed Ranking -> Courtroom DAG & Staking', async () => {
    // 1. Ingestion: On-device PII scrubbing via @vera/core
    const incomingChat = 'Listen bro, my doctor friend at Mayo Clinic says atmospheric CO2 reached 420 ppm in 2024. Contact bob@lab.org';
    const preview = piiScrubber.createVerificationPreview(incomingChat);
    expect(preview.sanitizedText).toContain('[REDACTED_EMAIL]');
    expect(preview.coreClaim).toBe('Atmospheric CO2 reached 420 ppm in 2024');

    // 2. Layer 0 Local AI analysis
    preview.isApproved = true;
    const localResult = await piiScrubber.confirmAndVerify(preview, analyzeClaimLocally);
    expect(localResult.claims[0].verdict).toBe('verified');

    // 3. Authenticate with ATProto via veracities.social Protocol Backend
    const authProvider = createAuthProvider('atproto', { isTestEnv: true });
    const userSession = await authProvider.authenticate({ identifier: 'alice.bsky.social', mock: true });
    expect(userSession.did).toBe('did:plc:alicebskysocial');

    // 4. Post to clearCloud Social Feed (Feature 1.1)
    const post = {
      authorDid: userSession.did,
      text: preview.coreClaim,
      metrics: { factsPct: 85, opinionPct: 15, falsehoodPct: 0 }
    };
    const viewerDid = 'did:plc:bob';
    const feedRank = feedManager.rankPostForViewer(post, viewerDid, false);
    expect(feedRank.visible).toBe(true);
    expect(feedRank.groundednessIndex).toBeGreaterThan(0.8);

    // 5. Docket Case to clearCloud Courtroom (Feature 1.3)
    const courtCase = caseManager.openCase({
      title: 'Climate CO2 Concentration Case',
      claimText: preview.coreClaim,
      creatorDid: userSession.did,
      initialDeposit: 200
    });
    expect(courtCase.status).toBe(CASE_STATUS.OPEN);

    // 6. Connect to veracities.social Protocol Validation Market
    const market = new ValidationMarket();
    const claimMarket = market.createMarket({
      claimId: courtCase.caseId,
      claimText: courtCase.claimText,
      creatorDid: userSession.did,
      initialBounty: 200
    });
    market.placeStake({
      marketId: claimMarket.marketId,
      stakerDid: userSession.did,
      outcome: OUTCOMES.VERIFIED,
      amount: 150
    });

    // 7. Juror Deliberation in Courtroom
    juryEngine.castVote({
      caseId: courtCase.caseId,
      jurorDid: 'did:plc:juror_1',
      vote: 'AFFIRM',
      argument: 'Confirmed in NOAA/Scripps carbon monitoring database.',
      evidenceUrl: 'https://gml.noaa.gov/ccgg/trends/',
      weight: 10
    });
    juryEngine.castVote({
      caseId: courtCase.caseId,
      jurorDid: 'did:plc:juror_2',
      vote: 'AFFIRM',
      argument: 'Peer-reviewed Nature publication corroborates.',
      evidenceUrl: 'https://nature.com/articles/co2-2024',
      weight: 10
    });

    const judicialSynthesis = juryEngine.synthesizeJudicialVerdict(courtCase);
    expect(judicialSynthesis.recommendedVerdict).toBe('VERIFIED');

    // 8. Settle Case in Courtroom and Protocol Market
    caseManager.settleCase({
      caseId: courtCase.caseId,
      finalVerdict: judicialSynthesis.recommendedVerdict,
      judgeSummary: judicialSynthesis.reasoning
    });
    const marketSettlement = market.settleMarket(claimMarket.marketId, OUTCOMES.VERIFIED, 0.05);
    expect(marketSettlement.payouts[0].stakerDid).toBe('did:plc:alicebskysocial');

    // 9. Reputation accrual on author
    feedManager.adjustHiddenReputation(userSession.did, 'VERIFIED_POST');
    expect(feedManager.getHiddenReputation(userSession.did)).toBe(51.5);

    // 10. Generate in-feed overlay card
    const overlayCard = overlayService.createOverlayCard({
      platform: 'Bluesky',
      postId: 'at://did:plc:alicebskysocial/app.bsky.feed.post/123',
      claimText: preview.coreClaim,
      verdict: courtCase.finalVerdict,
      groundednessIndex: feedRank.groundednessIndex,
      courtroomCaseId: courtCase.caseId
    });
    expect(overlayCard.badge.label).toBe('VERIFIED');
    expect(overlayCard.actionUrl).toBe(`https://veracities.social/courtroom/${courtCase.caseId}`);
  });
});
