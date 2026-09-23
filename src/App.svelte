<script>
  import FeedView from './components/FeedView.svelte';
  import CourtroomView from './components/CourtroomView.svelte';
  import WalletLinkModal from './components/WalletLinkModal.svelte';

  const VIEWS = {
    FEED: 'FEED',
    COURTROOM: 'COURTROOM'
  };

  let activeView = $state(VIEWS.FEED);
  let pendingDocketClaim = $state('');
  let isWalletModalOpen = $state(false);
  let linkedWallet = $state(null);

  // Mock authenticated ATProto user
  let user = $state({
    handle: 'alice.bsky.social',
    did: 'did:plc:z72i7hdynmk6r22z27h6tvur',
    displayName: 'Alice Chen',
    reputation: 85.0
  });

  function handleDocketClaimFromFeed(claimText) {
    pendingDocketClaim = claimText;
    activeView = VIEWS.COURTROOM;
  }
</script>

<div class="app-layout">
  <!-- Global Application Header -->
  <header class="app-header">
    <div class="header-content">
      <div class="brand">
        <div class="logo-icon">
          <span class="material-symbols-outlined">filter_drama</span>
        </div>
        <div class="brand-text">
          <h1>clearCloud</h1>
          <span class="brand-subtitle">Epistemic Social Media & Courtroom</span>
        </div>
      </div>

      <!-- Epistemic Health Summary & ATProto Identity -->
      <div class="header-right">
        <div class="epistemic-meter" title="Platform Groundedness Index Average">
          <span class="meter-label">Platform Groundedness</span>
          <span class="meter-val">G = 0.88</span>
        </div>

        {#if linkedWallet}
          <div class="wallet-badge" title="Cryptographically Linked via EIP-4361">
            <span class="material-symbols-outlined icon-eth">verified</span>
            <span class="wallet-addr">{linkedWallet.slice(0, 6)}...{linkedWallet.slice(-4)}</span>
          </div>
        {:else}
          <button class="btn-link-wallet" onclick={() => isWalletModalOpen = true}>
            <span class="material-symbols-outlined">link</span>
            <span>Link Web3 Wallet</span>
          </button>
        {/if}

        <div class="atproto-badge">
          <span class="material-symbols-outlined icon-atproto">cloud</span>
          <div class="user-meta">
            <span class="user-handle">{user.handle}</span>
            <span class="user-rep">Rep: {user.reputation.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Primary Navigation Tabs -->
    <nav class="nav-tabs-bar">
      <button
        class="nav-tab {activeView === VIEWS.FEED ? 'active' : ''}"
        onclick={() => activeView = VIEWS.FEED}
      >
        <span class="material-symbols-outlined">public</span>
        <span>The Feed & Relational Circles</span>
      </button>

      <button
        class="nav-tab {activeView === VIEWS.COURTROOM ? 'active' : ''}"
        onclick={() => activeView = VIEWS.COURTROOM}
      >
        <span class="material-symbols-outlined">gavel</span>
        <span>The Courtroom Deliberation Docket</span>
      </button>
    </nav>
  </header>

  <!-- Main View Container -->
  <main class="main-content">
    {#if activeView === VIEWS.FEED}
      <FeedView
        viewerDid={user.did}
        onDocketClaim={handleDocketClaimFromFeed}
      />
    {:else if activeView === VIEWS.COURTROOM}
      <CourtroomView
        viewerDid={user.did}
        initialClaim={pendingDocketClaim}
      />
    {/if}
  </main>

  <WalletLinkModal
    isOpen={isWalletModalOpen}
    userDid={user.did}
    onClose={() => isWalletModalOpen = false}
    onLinked={(res) => {
      linkedWallet = res.walletAddress;
      isWalletModalOpen = false;
    }}
  />
</div>

<style>
  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-page, #0d1117);
  }

  .app-header {
    background: var(--bg-surface, #161b22);
    border-bottom: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    max-width: 1040px;
    margin: 0 auto;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #00f5d4, #7000ff);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 2px 10px rgba(0, 245, 212, 0.3);
  }

  .brand-text h1 {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff, #cbd5e1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .brand-subtitle {
    font-size: 0.72rem;
    color: var(--text-muted, #8b949e);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .epistemic-meter {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    background: rgba(0, 245, 212, 0.08);
    border: 1px solid rgba(0, 245, 212, 0.2);
    padding: 4px 10px;
    border-radius: 8px;
  }

  .meter-label {
    font-size: 0.65rem;
    color: var(--text-muted, #8b949e);
    text-transform: uppercase;
  }

  .meter-val {
    font-size: 0.82rem;
    font-weight: 700;
    color: #00f5d4;
  }

  .btn-link-wallet {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(88, 166, 255, 0.1);
    color: #58a6ff;
    border: 1px solid rgba(88, 166, 255, 0.3);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-link-wallet:hover {
    background: rgba(88, 166, 255, 0.2);
    border-color: #58a6ff;
  }

  .wallet-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(46, 160, 67, 0.15);
    border: 1px solid #2ea043;
    border-radius: 20px;
    padding: 4px 12px;
    color: #3fb950;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .icon-eth {
    font-size: 1rem;
    color: #3fb950;
  }

  .atproto-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    padding: 4px 12px;
    border-radius: 20px;
  }

  .icon-atproto {
    color: #00b4d8;
    font-size: 1.1rem;
  }

  .user-meta {
    display: flex;
    flex-direction: column;
  }

  .user-handle {
    font-size: 0.78rem;
    font-weight: 600;
    color: #f0f6fc;
  }

  .user-rep {
    font-size: 0.68rem;
    color: #10b981;
  }

  .nav-tabs-bar {
    max-width: 1040px;
    margin: 0 auto;
    display: flex;
    padding: 0 20px;
    gap: 12px;
  }

  .nav-tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted, #8b949e);
    font-size: 0.86rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-tab:hover {
    color: #ffffff;
  }

  .nav-tab.active {
    color: #00f5d4;
    border-bottom-color: #00f5d4;
  }

  .main-content {
    flex: 1;
    padding-top: 10px;
  }
</style>
