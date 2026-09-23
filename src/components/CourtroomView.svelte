<script>
  import { caseManager, CASE_STATUS } from '../courtroom/caseManager.js';
  import { falsifiabilityGatekeeper } from '../courtroom/falsifiabilityGatekeeper.js';
  import { juryEngine } from '../courtroom/juryEngine.js';

  let {
    viewerDid = 'did:plc:viewer123',
    initialClaim = ''
  } = $props();

  let docketTitle = $state('');
  let docketClaim = $state('');
  let docketDeposit = $state(100);
  let docketError = $state('');
  let docketSuccess = $state('');

  // Selected case for deliberation
  let selectedCaseId = $state(null);

  // Juror vote form
  let jurorVote = $state('AFFIRM');
  let jurorArgument = $state('');
  let jurorEvidenceUrl = $state('');
  let voteFeedback = $state('');

  // Update docketClaim if initialClaim prop changes
  $effect(() => {
    if (initialClaim) {
      docketClaim = initialClaim;
      docketTitle = initialClaim.length > 40 ? initialClaim.slice(0, 40) + '...' : initialClaim;
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

      selectedCaseId = c1.caseId;
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
          <div class="claim-text-box">
            <span class="claim-quote">"{activeCase.claimText}"</span>
          </div>
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
</style>
