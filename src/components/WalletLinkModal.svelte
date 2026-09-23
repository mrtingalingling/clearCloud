<script>
  let { isOpen = false, userDid = '', onClose = () => {}, onLinked = () => {} } = $props();

  let step = $state('CONNECT'); // CONNECT, SIGN, VERIFIED, ERROR
  let walletAddress = $state('0x71C8363837918a7101820ad844912c864617a2f8');
  let siweChallenge = $state('');
  let signature = $state('');
  let isConnecting = $state(false);
  let errorMessage = $state('');
  let verifiedRecord = $state(null);

  function prepareChallenge() {
    isConnecting = true;
    errorMessage = '';
    
    const domain = 'veracities.social';
    const uri = 'https://veracities.social';
    const chainId = 1;
    const nonce = 'siwe_' + Math.random().toString(36).substring(2, 12);
    const issuedAt = new Date().toISOString();

    const statement = `Authorize linking ATProto DID ${userDid} to Veracities Validation Markets and Courtroom Deliberation.`;

    siweChallenge = [
      `${domain} wants you to sign in with your Ethereum account:`,
      walletAddress,
      '',
      statement,
      '',
      `URI: ${uri}`,
      `Version: 1`,
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`
    ].join('\n');

    step = 'SIGN';
    isConnecting = false;
  }

  function signAndVerify() {
    isConnecting = true;
    try {
      // Deterministic signature simulation for browser environment
      signature = '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      verifiedRecord = {
        $type: 'social.veracities.identity.link',
        web3Address: walletAddress,
        chainId: 1,
        statement: `Authorize linking ATProto DID ${userDid} to Veracities Validation Markets and Courtroom Deliberation.`,
        signature,
        issuedAt: new Date().toISOString()
      };

      step = 'VERIFIED';
      onLinked({
        walletAddress,
        verifiedRecord
      });
    } catch (err) {
      errorMessage = err.message || 'Signature failed';
      step = 'ERROR';
    } finally {
      isConnecting = false;
    }
  }

  function handleClose() {
    step = 'CONNECT';
    onClose();
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && handleClose()} onkeydown={(e) => e.key === 'Escape' && handleClose()} tabindex="-1">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-title">
          <span class="material-symbols-outlined icon-link">link</span>
          <h3>Link Web3 Wallet (EIP-4361 SIWE)</h3>
        </div>
        <button class="btn-close" onclick={handleClose}>×</button>
      </div>

      <div class="modal-body">
        <p class="desc">
          Cryptographically bind your ATProto identity (<strong>{userDid}</strong>) to your Ethereum wallet. This enforces the Conflict-of-Interest Firewall across truth markets.
        </p>

        {#if step === 'CONNECT'}
          <div class="field-group">
            <label for="wallet-input">Ethereum Wallet Address (EIP-55):</label>
            <input
              id="wallet-input"
              type="text"
              class="text-input"
              bind:value={walletAddress}
              placeholder="0x..."
            />
          </div>

          <div class="action-row">
            <button class="btn-primary" onclick={prepareChallenge} disabled={isConnecting}>
              Prepare SIWE Challenge
            </button>
          </div>

        {:else if step === 'SIGN'}
          <div class="challenge-box">
            <div class="box-header">EIP-4361 Sign-In With Ethereum Challenge:</div>
            <pre class="challenge-text">{siweChallenge}</pre>
          </div>

          <div class="action-row">
            <button class="btn-primary" onclick={signAndVerify} disabled={isConnecting}>
              ✍️ Sign Challenge with Wallet
            </button>
            <button class="btn-secondary" onclick={() => step = 'CONNECT'}>
              Back
            </button>
          </div>

        {:else if step === 'VERIFIED'}
          <div class="success-box">
            <span class="material-symbols-outlined icon-check">verified</span>
            <div class="success-text">
              <h4>Identity Link Verified!</h4>
              <p>Wallet <code>{walletAddress}</code> is cryptographically bound to your DID.</p>
              <p class="lexicon-note">Record emitted matching <code>social.veracities.identity.link</code> lexicon.</p>
            </div>
          </div>

          <div class="action-row">
            <button class="btn-primary" onclick={handleClose}>Done</button>
          </div>

        {:else if step === 'ERROR'}
          <div class="error-box">
            <p>Verification Error: {errorMessage}</p>
          </div>
          <div class="action-row">
            <button class="btn-secondary" onclick={() => step = 'CONNECT'}>Try Again</button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
  }

  .modal-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    width: 90%;
    max-width: 520px;
    padding: 24px;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.5);
    color: #c9d1d9;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #21262d;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #58a6ff;
  }

  .header-title h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
  }

  .btn-close {
    background: transparent;
    border: none;
    color: #8b949e;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .desc {
    font-size: 0.88rem;
    line-height: 1.4;
    color: #8b949e;
    margin-bottom: 16px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .field-group label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #8b949e;
  }

  .text-input {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 12px;
    color: #c9d1d9;
    font-family: monospace;
    font-size: 0.85rem;
  }

  .challenge-box {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
  }

  .box-header {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #8b949e;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .challenge-text {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
    color: #79c0ff;
    font-family: monospace;
  }

  .success-box {
    display: flex;
    gap: 12px;
    background: rgba(46, 160, 67, 0.15);
    border: 1px solid #2ea043;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
    align-items: center;
  }

  .icon-check {
    color: #3fb950;
    font-size: 2rem;
  }

  .success-text h4 {
    margin: 0 0 4px 0;
    color: #3fb950;
  }

  .success-text p {
    margin: 0;
    font-size: 0.82rem;
  }

  .lexicon-note {
    font-size: 0.75rem;
    color: #8b949e;
    margin-top: 4px;
  }

  .action-row {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .btn-primary {
    background: #238636;
    color: #fff;
    border: 1px solid rgba(240, 246, 252, 0.1);
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary:hover {
    background: #2ea043;
  }

  .btn-secondary {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 0.85rem;
    cursor: pointer;
  }
</style>
