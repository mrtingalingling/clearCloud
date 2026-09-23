<script>
  import { caseManager, CASE_STATUS } from '../courtroom/caseManager.js';
  import { falsifiabilityGatekeeper } from '../courtroom/falsifiabilityGatekeeper.js';
  import { localNanoGatekeeper } from '../courtroom/localNanoGatekeeper.js';
  import { juryEngine } from '../courtroom/juryEngine.js';
  import { blindTrialEngine } from '../courtroom/blindTrialEngine.js';
  import { sortitionEngine } from '../courtroom/sortitionEngine.js';

  let {
    viewerDid = 'did:plc:alice.bsky.social',
    initialClaim = ''
  } = $props();

  let docketTitle = $state('');
  let docketClaim = $state('');
  let docketDeposit = $state(100);
  let docketError = $state('');
  let docketSuccess = $state('');
  let nanoPreview = $state(null);

  // Selected case for deliberation
  let selectedCaseId = $state(null);

  // Blind trial & Sortition states
  let isBlindTrialMode = $state(true);
  let exportedAttestation = $state(null);
  let copyFeedback = $state('');

  // Juror vote form
  let jurorVote = $state('AFFIRM');
  let jurorArgument = $state('');
  let jurorEvidenceUrl = $state('');
  let voteFeedback = $state('');

  // Substantive Evidence & Anti-Griefing form state (PRD §4.3.B & Caveat 6)
  let newEvidenceCid = $state('');
  let newEvidenceDeposit = $state(0);
  let newEvidenceRelevance = $state(0.85);
  let evidenceFeedback = $state('');
  let evidenceError = $state('');

  function handleEvidenceSubmit(e) {
    e.preventDefault();
    evidenceFeedback = '';
    evidenceError = '';

    if (!activeCase) return;
    if (!newEvidenceCid.trim()) {
      evidenceError = 'Please provide an IPFS/Arweave CID or DOI URL.';
      return;
    }

    try {
      const res = caseManager.submitEvidence(activeCase.caseId, {
        evidenceUrl: newEvidenceCid.trim(),
        submitterDid: viewerDid,
        relevanceScore: Number(newEvidenceRelevance),
        depositAmount: Number(newEvidenceDeposit)
      });

      if (res.timerReset) {
        evidenceFeedback = `✓ Substantive evidence accepted! 14-day inactivity clock reset (Reset count: ${res.timerResetCount}).`;
      } else {
        evidenceFeedback = `✓ Evidence logged for jury review (${res.reason}). Timer was not reset.`;
      }
      newEvidenceCid = '';
    } catch (err) {
      evidenceError = err.message;
    }
  }

  // Update docketClaim if initialClaim prop changes
  $effect(() => {
    if (initialClaim) {
      docketClaim = initialClaim;
      docketTitle = initialClaim.length > 40 ? initialClaim.slice(0, 40) + '...' : initialClaim;
    }
  });

  // Local Chrome Gemini Nano Semantic Evaluation
  $effect(() => {
    const claim = docketClaim.trim();
    if (claim.length >= 8) {
      localNanoGatekeeper.evaluateSemanticFalsifiability(claim).then(res => {
        nanoPreview = res;
      });
    } else {
      nanoPreview = null;
    }
  });

  // Seed default cases if none exist
  $effect(() => {
    if (caseManager.getAllCases().length === 0) {
      const c1 = caseManager.openCase({
        title: 'Global Atmospheric CO2 2024 Benchmark',
        claimText: 'Atmospheric CO2 reached 420 ppm in 2024 due to industrial emissions',
        creatorDid: 'did:plc:science_digest',
        initialDeposit: 250,
        evidence: ['https://noaa.gov/co2-levels-2024']
      });

      const c2 = caseManager.openCase({
        title: 'Solar Photovoltaic Silicon Efficiency Record',
        claimText: 'Solar cell efficiency crossed 27% in commercial silicon cells',
        creatorDid: 'did:plc:nature_news',
        initialDeposit: 150,
        evidence: ['https://nrel.gov/pv-efficiency-chart']
      });

      // Cast initial juror votes
      juryEngine.castVote({
        caseId: c1.caseId,
        jurorDid: 'did:plc:juror_alpha',
        vote: 'AFFIRM',
        argument: 'NOAA Mauna Loa observatory confirms 420.5 ppm annual mean for 2024.',
        evidenceUrl: 'https://noaa.gov/data',
        weight: 1.0
      });

      juryEngine.castVote({
        caseId: c1.caseId,
        jurorDid: 'did:plc:juror_beta',
        vote: 'AFFIRM',
        argument: 'Scripps institution telemetry aligns precisely with NOAA findings.',
        evidenceUrl: 'https://scripps.ucsd.edu/co2',
        weight: 1.2
      });

      const c3 = caseManager.openCase({
        title: 'Disputed Monday Sightings of Official',
        claimText: 'John was corruptly golfing on Monday instead of working in office',
        creatorDid: 'did:plc:citizen_watch',
        initialDeposit: 100,
        evidence: ['https://clinic.internal/appointment-receipt-monday-10am.pdf']
      });

      juryEngine.castVote({
        caseId: c3.caseId,
        jurorDid: 'did:plc:whistleblower_dr',
        vote: 'DENY',
        argument: 'Primary hospital intake records confirm patient was admitted to outpatient surgery clinic on Monday 10:00-14:00.',
        evidenceUrl: 'https://clinic.internal/appointment-receipt-monday-10am.pdf',
        weight: 1.5
      });

      juryEngine.castVote({
        caseId: c3.caseId,
        jurorDid: 'did:plc:nurse_witness',
        vote: 'DENY',
        argument: 'Attending physician records corroborate patient presence at medical center all Monday morning.',
        evidenceUrl: 'https://clinic.internal/intake-badge.png',
        weight: 1.2
      });

      selectedCaseId = c3.caseId;
    }
  });

  let allCases = $derived.by(() => {
    return caseManager.getAllCases();
  });

  let activeCase = $derived.by(() => {
    if (!selectedCaseId && allCases.length > 0) {
      return allCases[0];
    }
    return allCases.find(c => c.caseId === selectedCaseId) || null;
  });

  let blindDocket = $derived.by(() => {
    if (!activeCase) return null;
    return blindTrialEngine.generateBlindDocket(activeCase);
  });

  let isSummoned = $derived.by(() => {
    if (!activeCase) return false;
    return sortitionEngine.isJurorSummoned(activeCase.caseId, viewerDid);
  });

  function handleExportAttestation() {
    if (!activeCase || !aiSynthesis || !tally?.isConsensusReached) return;
    const payload = {
      attestationId: `attest_${activeCase.caseId}_${Date.now()}`,
      domain: {
        name: 'veracities.social',
        purpose: 'Courtroom-Verdict-Oracle',
        version: '1.0.0'
      },
      message: {
        caseId: activeCase.caseId,
        claimText: activeCase.claimText,
        verdict: aiSynthesis.verdict,
        confidence: aiSynthesis.confidence,
        decisiveEvidenceUrl: aiSynthesis.decisiveEvidenceUrl || 'https://clinic.internal/appointment-receipt-monday-10am.pdf',
        decisiveEvidenceContributorDid: aiSynthesis.decisiveEvidenceContributorDid || 'did:plc:whistleblower_dr',
        participatingJurorDids: aiSynthesis.participatingJurorDids?.length ? aiSynthesis.participatingJurorDids : ['did:plc:whistleblower_dr', 'did:plc:nurse_witness'],
        jurySize: tally.totalVotes,
        judgeDid: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        timestamp: Date.now(),
        nonce: `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      },
      signature: `0x_judge_ai_ed25519_${Date.now()}`
    };
    exportedAttestation = JSON.stringify(payload, null, 2);
  }


  let tally = $derived.by(() => {
    if (!activeCase) return null;
    return juryEngine.tallyJury(activeCase.caseId);
  });

  let aiSynthesis = $derived.by(() => {
    if (!activeCase) return null;
    return juryEngine.synthesizeJudicialVerdict(activeCase.caseId, activeCase.claimText);
  });

  function handleDocketSubmit(e) {
    e.preventDefault();
    docketError = '';
    docketSuccess = '';

    if (!docketClaim.trim()) {
      docketError = 'Claim text cannot be empty';
      return;
    }

    const title = docketTitle.trim() || (docketClaim.length > 35 ? docketClaim.slice(0, 35) + '...' : docketClaim);

    try {
      const newCase = caseManager.openCase({
        title,
        claimText: docketClaim.trim(),
        creatorDid: viewerDid,
        initialDeposit: Number(docketDeposit) || 50
      });

      docketSuccess = `Case #${newCase.caseId} docketed successfully! Gatekeeper admitted claim.`;
      docketTitle = '';
      docketClaim = '';
      selectedCaseId = newCase.caseId;
    } catch (err) {
      docketError = err.message;
    }
  }

  function handleVoteSubmit(e) {
    e.preventDefault();
    voteFeedback = '';

    if (!activeCase) return;
    if (!jurorArgument.trim()) {
      voteFeedback = 'Please provide an evidentiary argument before submitting.';
      return;
    }

    try {
      juryEngine.castVote({
        caseId: activeCase.caseId,
        jurorDid: viewerDid,
        vote: jurorVote,
        argument: jurorArgument.trim(),
        evidenceUrl: jurorEvidenceUrl.trim() || null,
        weight: 1.0
      });

      voteFeedback = '✓ Your juror deliberation vote has been anonymously cast and weighted!';
      jurorArgument = '';
      jurorEvidenceUrl = '';
    } catch (err) {
      voteFeedback = `Vote error: ${err.message}`;
    }
  }
</script>

<div class="courtroom-container">
  <!-- Intake Form: Falsifiability Gatekeeper -->
  <div class="docket-intake-card">
    <div class="card-header">
      <div class="header-left">
        <span class="material-symbols-outlined icon-gavel">balance</span>
        <h3>The Courtroom: Docket New Deliberation Case</h3>
      </div>
      <span class="gate-tag">Falsifiability Gatekeeper Active</span>
    </div>

    <form onsubmit={handleDocketSubmit} class="docket-form">
      <div class="form-row">
        <input
          type="text"
          class="input-field"
          placeholder="Case Title (e.g. Tokyo Medical Advisory Inquiry)"
          bind:value={docketTitle}
        />
        <input
          type="number"
          class="input-deposit"
          placeholder="Deposit"
          bind:value={docketDeposit}
          min="10"
        />
      </div>

      <textarea
        class="textarea-field"
        placeholder="Enter empirical claim to try in the Courtroom (e.g. 'Atmospheric CO2 reached 420 ppm in 2024 because industrial emissions increased')..."
        bind:value={docketClaim}
        rows="2"
      ></textarea>

      {#if nanoPreview}
        <div class="nano-preview-badge {nanoPreview.isFalsifiable ? 'valid' : 'invalid'}">
          <span class="material-symbols-outlined icon-nano">{nanoPreview.isFalsifiable ? 'verified_user' : 'block'}</span>
          <div class="nano-text">
            <span class="nano-headline">
              <strong>{nanoPreview.isFalsifiable ? 'Admissible: ' + nanoPreview.category : 'Gatekeeper: ' + nanoPreview.category}</strong>
              <span class="nano-tag">Local Chrome Nano SLM</span>
            </span>
            <p class="nano-desc">{nanoPreview.isFalsifiable ? nanoPreview.falsificationCondition : nanoPreview.reason}</p>
          </div>
        </div>
      {/if}

      <div class="docket-actions">
        <span class="gate-helper">Claims containing subjective aesthetic or metaphysical opinions are strictly rejected by the Gatekeeper.</span>
        <button type="submit" class="btn-docket-submit">
          <span class="material-symbols-outlined">folder_open</span>
          <span>Docket Case</span>
        </button>
      </div>

      {#if docketError}
        <div class="alert-box alert-error">
          <span class="material-symbols-outlined">error</span>
          <span>{docketError}</span>
        </div>
      {/if}

      {#if docketSuccess}
        <div class="alert-box alert-success">
          <span class="material-symbols-outlined">check_circle</span>
          <span>{docketSuccess}</span>
        </div>
      {/if}
    </form>
  </div>

  <div class="courtroom-grid">
    <!-- Left Column: Case Dockets List -->
    <div class="cases-sidebar">
      <div class="sidebar-header">
        <h4>Active Dockets ({allCases.length})</h4>
      </div>

      <div class="cases-list">
        {#each allCases as c (c.caseId)}
          <button
            type="button"
            class="case-item {activeCase?.caseId === c.caseId ? 'case-item-active' : ''}"
            onclick={() => { selectedCaseId = c.caseId; voteFeedback = ''; }}
          >
            <div class="case-item-top">
              <span class="case-id">#{c.caseId}</span>
              <span class="status-pill status-{c.status.toLowerCase()}">{c.status}</span>
            </div>
            <div class="case-item-title">{c.title}</div>
            <div class="case-item-meta">
              <span>{c.dagNodes.length} Sub-Claims</span>
              <span>Deposit: {c.totalDeposit}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Right Column: Case Deliberation Details & Jury Console -->
    <div class="deliberation-console">
      {#if activeCase}
        <div class="case-detail-header">
          <div class="case-title-row">
            <h2>{activeCase.title}</h2>
            <span class="status-pill status-{activeCase.status.toLowerCase()}">{activeCase.status}</span>
          </div>

          <!-- Separation of Powers: Read-Only Validation Market Metadata Badge -->
          <div class="market-connection-badge">
            <div class="badge-left">
              <span class="material-symbols-outlined icon-market">price_change</span>
              <div class="badge-text-group">
                <div class="badge-headline">
                  <span class="market-status-dot"></span>
                  <strong>Active Validation Market Linked</strong>
                  <span class="round-badge">Round 2: Evidence Drop</span>
                </div>
                <span class="recusal-warning">
                  Civic Juror Firewall: Active wagers on this claim legally recuse and disqualify you from juror voting.
                </span>
              </div>
            </div>
            <div class="badge-right">
              <span class="market-pool-stat">$3,280 USDC Pool</span>
              <a href="http://localhost:5174" target="_blank" rel="noopener noreferrer" class="btn-market-link">
                <span>View Market</span>
                <span class="material-symbols-outlined">open_in_new</span>
              </a>
            </div>
          </div>

          <!-- Deliberation Mode & Civic Duty Bar -->
          <div class="deliberation-mode-bar">
            <div class="mode-toggles">
              <button
                type="button"
                class="btn-mode {isBlindTrialMode ? 'btn-mode-active' : ''}"
                onclick={() => isBlindTrialMode = true}
              >
                🎭 Blind Trial Mode (AI Sanitized)
              </button>
              <button
                type="button"
                class="btn-mode {!isBlindTrialMode ? 'btn-mode-active' : ''}"
                onclick={() => isBlindTrialMode = false}
              >
                📜 Raw Public Docket
              </button>
            </div>

            <div class="summons-badge-container">
              {#if isSummoned}
                <span class="summons-badge badge-active">
                  ⚖️ Summoned Citizen Juror (Active Duty)
                </span>
              {:else}
                <span class="summons-badge badge-observer">
                  👁️ Citizen Observer
                </span>
              {/if}
            </div>
          </div>

          <!-- Blind Deliberation Proposition Card vs Raw Claim Box -->
          {#if isBlindTrialMode && blindDocket}
            <div class="blind-trial-card">
              <div class="blind-header">
                <span class="material-symbols-outlined">visibility_off</span>
                <span class="blind-title">Abstracted Epistemic Proposition (PII & Prejudicial Terms Stripped)</span>
              </div>
              <div class="blind-proposition-text">
                "{blindDocket.anonymizedClaim}"
              </div>

              {#if blindDocket.mutualExclusivityAnalysis}
                <div class="exclusivity-box {blindDocket.mutualExclusivityAnalysis.isContradiction ? 'exclusivity-violation' : ''}">
                  <div class="exclusivity-title">
                    <span class="material-symbols-outlined">bolt</span>
                    <span>Spatio-Temporal Mutual Exclusivity Matrix</span>
                  </div>
                  <p class="exclusivity-desc">{blindDocket.mutualExclusivityAnalysis.logicalProof}</p>
                  <div class="exclusivity-verdict">
                    <span>Inference: Claim is physically refuted by timestamped clinic counter-evidence.</span>
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <div class="claim-text-box">
              <span class="claim-quote">"{activeCase.claimText}"</span>
            </div>
          {/if}
        </div>

        <!-- Compound Claim DAG Visualizer -->
        <div class="dag-visualizer-card">
          <div class="card-subtitle">
            <span class="material-symbols-outlined">account_tree</span>
            <span>Compound Claim Directed Acyclic Graph (DAG)</span>
          </div>

          <div class="dag-nodes-flow">
            {#each activeCase.dagNodes as node, idx}
              <div class="dag-node {node.status === 'RESOLVED' ? 'node-resolved' : 'node-open'}">
                <div class="node-id">{node.nodeId}</div>
                <div class="node-text">{node.text}</div>
                <div class="node-status">{node.status}</div>
              </div>
              {#if idx < activeCase.dagNodes.length - 1}
                <div class="dag-arrow">
                  <span class="material-symbols-outlined">arrow_forward</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- Live Supermajority Consensus Meter -->
        {#if tally}
          <div class="consensus-card">
            <div class="card-subtitle">
              <span class="material-symbols-outlined">how_to_vote</span>
              <span>Anonymous Jury Consensus (66.7% Supermajority Threshold)</span>
            </div>

            <div class="gauge-container">
              <div class="gauge-bar">
                <div class="gauge-fill-affirm" style="width: {tally.affirmPct}%" title="Affirm: {tally.affirmPct}%"></div>
                <div class="gauge-fill-deny" style="width: {tally.denyPct}%" title="Deny: {tally.denyPct}%"></div>
                <div class="gauge-fill-need" style="width: {tally.needProofPct}%" title="Need Proof: {tally.needProofPct}%"></div>
              </div>

              <div class="threshold-marker" style="left: 66.7%">
                <span class="marker-label">66.7% Quorum</span>
              </div>
            </div>

            <div class="tally-breakdown">
              <span class="tally-pill t-affirm">🟢 Affirm: {tally.affirmPct}%</span>
              <span class="tally-pill t-deny">🔴 Deny: {tally.denyPct}%</span>
              <span class="tally-pill t-need">🟣 Need Proof: {tally.needProofPct}%</span>
              <span class="total-weight">Total Votes: {tally.totalVotes}</span>
            </div>
          </div>
        {/if}

        <!-- AI Judicial Synthesis Card -->
        {#if aiSynthesis}
          <div class="ai-synthesis-card">
            <div class="card-subtitle">
              <span class="material-symbols-outlined">psychology</span>
              <span>AI Judicial Synthesis</span>
            </div>
            <p class="synthesis-text">{aiSynthesis.reasoning}</p>
          </div>
        {/if}

        <!-- Export Signed Oracle Attestation Box -->
        {#if tally?.isConsensusReached}
          <div class="oracle-export-card">
            <div class="oracle-export-header">
              <div class="export-status-left">
                <span class="material-symbols-outlined text-success">verified</span>
                <span>Consensus Reached ({Math.max(tally.affirmPct, tally.denyPct)}%) — Attestation Ready</span>
              </div>
              <button
                type="button"
                class="btn-export-attestation"
                onclick={handleExportAttestation}
              >
                🔏 Generate Oracle Attestation
              </button>
            </div>

            {#if exportedAttestation}
              <div class="exported-json-box">
                <div class="json-header">
                  <span>EIP-712 / JSON Oracle Attestation Payload</span>
                  <span class="copy-tag">Ready for veracities.social Settlement</span>
                </div>
                <pre class="json-code">{exportedAttestation}</pre>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Juror Voting & Deliberation Form -->
        <div class="juror-form-card">
          <div class="card-subtitle">
            <span class="material-symbols-outlined">rate_review</span>
            <span>Cast Anonymous Juror Deliberation</span>
          </div>

          <form onsubmit={handleVoteSubmit} class="vote-form">
            <div class="vote-buttons-row">
              <button
                type="button"
                class="btn-vote-choice {jurorVote === 'AFFIRM' ? 'v-active-affirm' : ''}"
                onclick={() => jurorVote = 'AFFIRM'}
              >
                🟢 Affirm Claim
              </button>
              <button
                type="button"
                class="btn-vote-choice {jurorVote === 'DENY' ? 'v-active-deny' : ''}"
                onclick={() => jurorVote = 'DENY'}
              >
                🔴 Deny Claim
              </button>
              <button
                type="button"
                class="btn-vote-choice {jurorVote === 'NEED_MORE_PROOF' ? 'v-active-need' : ''}"
                onclick={() => jurorVote = 'NEED_MORE_PROOF'}
              >
                🟣 Need Proof
              </button>
            </div>

            <input
              type="url"
              class="input-field"
              placeholder="Primary Evidence URL / Archive Hash (e.g. https://...)"
              bind:value={jurorEvidenceUrl}
            />

            <textarea
              class="textarea-field"
              placeholder="Evidentiary justification or counter-argument..."
              bind:value={jurorArgument}
              rows="2"
            ></textarea>

            <button type="submit" class="btn-submit-vote">
              <span class="material-symbols-outlined">send</span>
              <span>Submit Juror Deliberation</span>
            </button>

            {#if voteFeedback}
              <div class="alert-box alert-info">
                <span>{voteFeedback}</span>
              </div>
            {/if}
        <!-- Substantive Evidence & Anti-Griefing Clock Reset Card (PRD §4.3.B & Caveat 6) -->
        <div class="evidence-submission-card">
          <div class="card-subtitle">
            <span class="material-symbols-outlined">attachment</span>
            <span>Submit Substantive Evidence (CID / DOI) & Reset Clock</span>
          </div>
          <p class="evidence-notice">
            Anti-griefing gate: Submitting empirical evidence resets the 14-day cold case clock.
            Requires valid decentralized CID (`ipfs://...`, `ar://...`) or DOI, relevance ≥ 0.70, and escalating reset deposits
            (Current reset deposit: <strong>${activeCase.timerResetCount === 0 ? '0 (Free)' : 50 * Math.pow(2, activeCase.timerResetCount - 1)}</strong>).
          </p>

          <form onsubmit={handleEvidenceSubmit} class="evidence-form">
            <input
              type="text"
              class="input-field"
              placeholder="ipfs://bafk... or ar://... or https://doi.org/..."
              bind:value={newEvidenceCid}
            />

            <div class="evidence-inputs-row">
              <div class="input-half">
                <label for="ev-relevance">AI Relevance Rating</label>
                <input
                  id="ev-relevance"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  class="input-field"
                  bind:value={newEvidenceRelevance}
                />
              </div>
              <div class="input-half">
                <label for="ev-deposit">Reset Deposit ($)</label>
                <input
                  id="ev-deposit"
                  type="number"
                  min="0"
                  class="input-field"
                  bind:value={newEvidenceDeposit}
                />
              </div>
            </div>

            <button type="submit" class="btn-submit-evidence">
              <span class="material-symbols-outlined">upload_file</span>
              <span>Submit Verified Evidence</span>
            </button>

            {#if evidenceFeedback}
              <div class="alert-box alert-success">
                <span>{evidenceFeedback}</span>
              </div>
            {/if}

            {#if evidenceError}
              <div class="alert-box alert-error">
                <span>{evidenceError}</span>
              </div>
            {/if}
          </form>
        </div>
      {:else}
        <div class="empty-deliberation">
          <p>Select a case from the docket list to begin deliberation.</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .courtroom-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
  }

  .docket-intake-card {
    background: var(--bg-surface, #161b22);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-gavel {
    color: #7000ff;
    font-size: 1.4rem;
  }

  .gate-tag {
    font-size: 0.72rem;
    color: #00f5d4;
    background: rgba(0, 245, 212, 0.1);
    border: 1px solid rgba(0, 245, 212, 0.25);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .form-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .input-field {
    flex: 1;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
    border-radius: 8px;
    color: #ffffff;
    padding: 8px 12px;
    font-size: 0.82rem;
  }

  .input-deposit {
    width: 100px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
    border-radius: 8px;
    color: #00f5d4;
    padding: 8px 12px;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .textarea-field {
    width: 100%;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
    border-radius: 8px;
    color: #ffffff;
    padding: 10px;
    font-size: 0.85rem;
    box-sizing: border-box;
    font-family: inherit;
  }

  .docket-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .nano-preview-badge {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 14px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 0.78rem;
    transition: all 0.2s ease;
  }

  .nano-preview-badge.valid {
    background: rgba(46, 160, 67, 0.12);
    border: 1px solid #2ea043;
    color: #3fb950;
  }

  .nano-preview-badge.invalid {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #f85149;
  }

  .icon-nano {
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .nano-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nano-headline {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nano-tag {
    font-size: 0.65rem;
    font-weight: 700;
    background: rgba(88, 166, 255, 0.2);
    color: #58a6ff;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .nano-desc {
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.3;
    opacity: 0.9;
  }

  .gate-helper {
    font-size: 0.72rem;
    color: var(--text-muted, #8b949e);
  }

  .btn-docket-submit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #7000ff, #9d4edd);
    border: none;
    border-radius: 8px;
    color: #ffffff;
    padding: 7px 16px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .alert-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.78rem;
    margin-top: 10px;
  }

  .alert-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .alert-success {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .alert-info {
    background: rgba(0, 245, 212, 0.1);
    border: 1px solid rgba(0, 245, 212, 0.25);
    color: #00f5d4;
  }

  .courtroom-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 16px;
  }

  .cases-sidebar {
    background: var(--bg-surface, #161b22);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    border-radius: 12px;
    padding: 12px;
    max-height: 700px;
    overflow-y: auto;
  }

  .sidebar-header h4 {
    font-size: 0.82rem;
    color: var(--text-muted, #8b949e);
    margin-bottom: 10px;
  }

  .cases-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .case-item {
    text-align: left;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: inherit;
    width: 100%;
  }

  .case-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(112, 0, 255, 0.4);
  }

  .case-item-active {
    background: rgba(112, 0, 255, 0.12);
    border-color: #7000ff;
  }

  .case-item-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .case-id {
    font-weight: 700;
    font-size: 0.76rem;
    color: #00f5d4;
  }

  .case-item-title {
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 6px;
  }

  .case-item-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.68rem;
    color: var(--text-muted, #8b949e);
  }

  .status-pill {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 6px;
    text-transform: uppercase;
  }

  .status-open { background: rgba(0, 245, 212, 0.15); color: #00f5d4; }
  .status-resolved { background: rgba(16, 185, 129, 0.15); color: #10b981; }
  .status-cold { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
  .status-appealed { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

  .deliberation-console {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .case-detail-header {
    background: var(--bg-surface, #161b22);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    border-radius: 12px;
    padding: 14px;
  }

  .case-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .case-title-row h2 {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .claim-text-box {
    background: rgba(0, 0, 0, 0.2);
    border-left: 3px solid #7000ff;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 0.86rem;
    color: #e2e8f0;
  }

  .card-subtitle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-muted, #8b949e);
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dag-visualizer-card, .consensus-card, .ai-synthesis-card, .juror-form-card {
    background: var(--bg-surface, #161b22);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    border-radius: 12px;
    padding: 14px;
  }

  .dag-nodes-flow {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dag-node {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    border-radius: 8px;
    padding: 8px 12px;
    max-width: 200px;
  }

  .node-id {
    font-size: 0.68rem;
    font-weight: 700;
    color: #7000ff;
    margin-bottom: 2px;
  }

  .node-text {
    font-size: 0.76rem;
    line-height: 1.3;
    margin-bottom: 4px;
  }

  .node-status {
    font-size: 0.65rem;
    color: var(--text-muted, #8b949e);
  }

  .dag-arrow {
    color: var(--text-muted, #8b949e);
  }

  .gauge-container {
    position: relative;
    margin-bottom: 12px;
  }

  .gauge-bar {
    height: 14px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.06);
    display: flex;
    overflow: hidden;
  }

  .gauge-fill-affirm { background: #10b981; }
  .gauge-fill-deny { background: #ef4444; }
  .gauge-fill-need { background: #a855f7; }

  .threshold-marker {
    position: absolute;
    top: -18px;
    border-left: 2px dashed #f59e0b;
    height: 36px;
  }

  .marker-label {
    position: absolute;
    top: -12px;
    left: 4px;
    font-size: 0.64rem;
    color: #f59e0b;
    white-space: nowrap;
  }

  .tally-breakdown {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .tally-pill {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
  }

  .t-affirm { color: #10b981; }
  .t-deny { color: #ef4444; }
  .t-need { color: #a855f7; }

  .total-weight {
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--text-muted, #8b949e);
  }

  .synthesis-text {
    font-size: 0.82rem;
    line-height: 1.45;
    color: #cbd5e1;
  }

  .vote-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .vote-buttons-row {
    display: flex;
    gap: 8px;
  }

  .btn-vote-choice {
    flex: 1;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    background: rgba(255, 255, 255, 0.03);
    color: var(--text, #f0f6fc);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
  }

  .v-active-affirm {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    color: #10b981;
  }

  .v-active-deny {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
    color: #ef4444;
  }

  .v-active-need {
    background: rgba(168, 85, 247, 0.2);
    border-color: #a855f7;
    color: #a855f7;
  }

  .btn-submit-vote {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(135deg, #00f5d4, #00b4d8);
    border: none;
    border-radius: 8px;
    color: #0b0f19;
    padding: 8px 16px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 4px;
  }

  .btn-submit-vote:hover {
    filter: brightness(1.1);
  }

  .empty-deliberation {
    text-align: center;
    padding: 40px;
    color: var(--text-muted, #8b949e);
  }

  /* Deliberation Mode & Civic Duty Bar */
  .deliberation-mode-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 8px;
  }

  .mode-toggles {
    display: flex;
    gap: 6px;
  }

  .btn-mode {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-muted, #8b949e);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.74rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-mode-active {
    background: rgba(0, 245, 212, 0.12);
    border-color: #00f5d4;
    color: #00f5d4;
  }

  .summons-badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 6px;
  }

  .badge-active {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #f59e0b;
  }

  .badge-observer {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #8b949e;
  }

  /* Blind Trial Card */
  .blind-trial-card {
    background: rgba(112, 0, 255, 0.06);
    border: 1px solid rgba(112, 0, 255, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .blind-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.74rem;
    font-weight: 700;
    color: #c084fc;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .blind-proposition-text {
    font-size: 0.88rem;
    font-style: italic;
    color: #f0f6fc;
    line-height: 1.4;
    background: rgba(0, 0, 0, 0.25);
    padding: 8px 12px;
    border-radius: 6px;
    border-left: 3px solid #7000ff;
    margin-bottom: 10px;
  }

  .exclusivity-box {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 10px;
  }

  .exclusivity-violation {
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.08);
  }

  .exclusivity-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.74rem;
    font-weight: 700;
    color: #ef4444;
    margin-bottom: 4px;
  }

  .exclusivity-desc {
    font-size: 0.78rem;
    color: #e6edf3;
    margin: 0 0 6px 0;
    font-family: monospace;
  }

  .exclusivity-verdict {
    font-size: 0.72rem;
    color: #fca5a5;
    font-weight: 600;
  }

  /* Oracle Export Card */
  .oracle-export-card {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
  }

  .oracle-export-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .export-status-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #10b981;
  }

  .btn-export-attestation {
    background: linear-gradient(135deg, #10b981, #059669);
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 6px 12px;
    cursor: pointer;
  }

  .btn-export-attestation:hover {
    filter: brightness(1.1);
  }

  .exported-json-box {
    margin-top: 10px;
    background: #090d16;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 10px;
  }

  .json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.72rem;
    color: #8b949e;
    margin-bottom: 6px;
  }

  .copy-tag {
    color: #00f5d4;
    font-weight: 600;
  }

  .json-code {
    margin: 0;
    font-size: 0.72rem;
    font-family: monospace;
    color: #a7f3d0;
    max-height: 140px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* Separation of Powers: Validation Market Read-Only Badge */
  .market-connection-badge {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(245, 158, 11, 0.05);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 8px;
    padding: 10px 14px;
    margin: 12px 0;
    gap: 16px;
    flex-wrap: wrap;
  }

  .badge-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-market {
    font-size: 1.5rem;
    color: #f59e0b;
  }

  .badge-text-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .badge-headline {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: #f8fafc;
  }

  .market-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
  }

  .round-badge {
    font-size: 0.65rem;
    font-weight: 700;
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    padding: 1px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .recusal-warning {
    font-size: 0.72rem;
    color: #f59e0b;
  }

  .badge-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .market-pool-stat {
    font-size: 0.82rem;
    font-weight: 700;
    color: #f59e0b;
  }

  .btn-market-link {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .btn-market-link:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #f59e0b;
    color: #f59e0b;
  }

  /* Substantive Evidence Submission Card */
  .evidence-submission-card {
    background: rgba(0, 245, 212, 0.03);
    border: 1px solid rgba(0, 245, 212, 0.2);
    border-radius: 8px;
    padding: 14px;
    margin-top: 14px;
  }

  .evidence-notice {
    font-size: 0.74rem;
    color: #8b949e;
    margin: 6px 0 12px 0;
    line-height: 1.4;
  }

  .evidence-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .evidence-inputs-row {
    display: flex;
    gap: 12px;
  }

  .input-half {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .input-half label {
    font-size: 0.7rem;
    color: #8b949e;
    font-weight: 600;
    text-transform: uppercase;
  }

  .btn-submit-evidence {
    background: rgba(0, 245, 212, 0.15);
    border: 1px solid #00f5d4;
    color: #00f5d4;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 0.78rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-submit-evidence:hover {
    background: rgba(0, 245, 212, 0.25);
  }
</style>
