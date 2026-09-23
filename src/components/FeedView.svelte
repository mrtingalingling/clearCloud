<script>
  import { feedManager, CIRCLE_TIERS } from '../feed/feedManager.js';

  let {
    viewerDid = 'did:plc:viewer123',
    onDocketClaim = () => {}
  } = $props();

  let activeTier = $state(CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS);
  let filterRageBait = $state(true);

  // New Post Form
  let postContent = $state('');
  let postCircle = $state(1);
  let factsPct = $state(85);
  let opinionPct = $state(15);
  let falsehoodPct = $state(0);

  // Seed data
  let allPosts = $state([
    {
      id: 'post_1',
      authorDid: 'did:plc:alice_friend',
      authorHandle: '@alice.bsky.social',
      authorName: 'Alice Chen',
      text: 'Having morning coffee with family downtown before work. Beautiful sunny day in Seattle!',
      tier: CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS,
      metrics: { factsPct: 100, opinionPct: 0, falsehoodPct: 0 },
      timestamp: '10m ago'
    },
    {
      id: 'post_2',
      authorDid: 'did:plc:bob_close_contact',
      authorHandle: '@bob.bsky.social',
      authorName: 'Bob Vance',
      text: 'SHOCKING SECRET!! They are secretly spraying dangerous chemicals into our tap water right now!! Wake up sheeple!!',
      tier: CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS,
      metrics: { factsPct: 5, opinionPct: 15, falsehoodPct: 80 },
      timestamp: '25m ago'
    },
    {
      id: 'post_3',
      authorDid: 'did:plc:science_digest',
      authorHandle: '@science.news',
      authorName: 'Nature Science Digest',
      text: 'Peer-reviewed study confirms solar photovoltaic cell efficiency reached a new certified benchmark of 27.2% using perovskite-silicon tandem arrays.',
      tier: CIRCLE_TIERS.TIER_3_NETWORK,
      metrics: { factsPct: 92, opinionPct: 8, falsehoodPct: 0 },
      timestamp: '1h ago'
    },
    {
      id: 'post_4',
      authorDid: 'did:plc:health_rumors',
      authorHandle: '@health_truthteller',
      authorName: 'Anonymous Health Tips',
      text: 'Miracle cure doctors do not want you to know: Drinking boiling water with sea salt instantly neutralizes viral respiratory infections in 24 hours!',
      tier: CIRCLE_TIERS.TIER_3_NETWORK,
      metrics: { factsPct: 2, opinionPct: 8, falsehoodPct: 90 },
      timestamp: '2h ago'
    }
  ]);

  // Setup circle relations in manager
  $effect(() => {
    feedManager.setCircleRelation(viewerDid, 'did:plc:alice_friend', CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS);
    feedManager.setCircleRelation(viewerDid, 'did:plc:bob_close_contact', CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS);
    feedManager.setCircleRelation(viewerDid, 'did:plc:science_digest', CIRCLE_TIERS.TIER_3_NETWORK);
    feedManager.setCircleRelation(viewerDid, 'did:plc:health_rumors', CIRCLE_TIERS.TIER_3_NETWORK);
    feedManager.userReputations.set('did:plc:science_digest', 92.0);
    feedManager.userReputations.set('did:plc:health_rumors', 28.0);
    feedManager.userReputations.set('did:plc:alice_friend', 85.0);
    feedManager.userReputations.set('did:plc:bob_close_contact', 45.0);
  });

  let composerGIndex = $derived.by(() => {
    return feedManager.calculateGroundednessIndex({ factsPct, opinionPct, falsehoodPct });
  });

  let filteredFeed = $derived.by(() => {
    return allPosts
      .map(p => {
        const ranking = feedManager.rankPostForViewer(p, viewerDid, filterRageBait);
        return { ...p, ranking };
      })
      .filter(p => {
        if (activeTier === CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS) {
          return p.tier === CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS && p.ranking.visible;
        }
        if (activeTier === CIRCLE_TIERS.TIER_2_ACQUAINTANCES) {
          return p.tier <= CIRCLE_TIERS.TIER_2_ACQUAINTANCES && p.ranking.visible;
        }
        return p.ranking.visible;
      })
      .sort((a, b) => (b.ranking?.score || 0) - (a.ranking?.score || 0));
  });

  function handleCreatePost(e) {
    e.preventDefault();
    if (!postContent.trim()) return;

    const newPost = {
      id: `post_${Date.now()}`,
      authorDid: viewerDid,
      authorHandle: '@you.bsky.social',
      authorName: 'You (Current User)',
      text: postContent.trim(),
      tier: postCircle,
      metrics: { factsPct, opinionPct, falsehoodPct },
      timestamp: 'Just now'
    };

    feedManager.setCircleRelation(viewerDid, viewerDid, postCircle);
    allPosts = [newPost, ...allPosts];
    postContent = '';
  }
</script>

<div class="feed-view-container">
  <!-- 3-Tier Circles Navigation Bar -->
  <div class="tier-nav-bar">
    <div class="tier-tabs">
      <button
        class="tier-tab {activeTier === CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS ? 'active' : ''}"
        onclick={() => activeTier = CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS}
      >
        <span class="material-symbols-outlined">favorite</span>
        <span>Close Friends (Tier 1)</span>
      </button>

      <button
        class="tier-tab {activeTier === CIRCLE_TIERS.TIER_2_ACQUAINTANCES ? 'active' : ''}"
        onclick={() => activeTier = CIRCLE_TIERS.TIER_2_ACQUAINTANCES}
      >
        <span class="material-symbols-outlined">group</span>
        <span>Acquaintances (Tier 2)</span>
      </button>

      <button
        class="tier-tab {activeTier === CIRCLE_TIERS.TIER_3_NETWORK ? 'active' : ''}"
        onclick={() => activeTier = CIRCLE_TIERS.TIER_3_NETWORK}
      >
        <span class="material-symbols-outlined">public</span>
        <span>Network-Wide (Tier 3)</span>
      </button>
    </div>

    {#if activeTier === CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS}
      <div class="rage-bait-toggle-wrap">
        <label class="switch-label">
          <input type="checkbox" bind:checked={filterRageBait} />
          <span class="toggle-slider"></span>
          <span class="toggle-text">Filter Non-Personal Rage-Bait</span>
        </label>
      </div>
    {/if}
  </div>

  <!-- Post Composer -->
  <div class="composer-card">
    <form onsubmit={handleCreatePost}>
      <textarea
        class="composer-textarea"
        placeholder="Share a thought, observation, or empirical claim..."
        bind:value={postContent}
        rows="2"
      ></textarea>

      <div class="composer-metrics-bar">
        <div class="metric-sliders">
          <label class="slider-field">
            <span>Facts: {factsPct}%</span>
            <input type="range" min="0" max="100" bind:value={factsPct} />
          </label>
          <label class="slider-field">
            <span>Speculation: {opinionPct}%</span>
            <input type="range" min="0" max="100" bind:value={opinionPct} />
          </label>
          <label class="slider-field">
            <span>Falsehood: {falsehoodPct}%</span>
            <input type="range" min="0" max="100" bind:value={falsehoodPct} />
          </label>
        </div>

        <div class="g-index-preview">
          <span class="g-title">Groundedness Index</span>
          <span class="g-val {composerGIndex >= 0.7 ? 'g-high' : composerGIndex >= 0.4 ? 'g-mid' : 'g-low'}">
            G = {composerGIndex.toFixed(2)}
          </span>
        </div>
      </div>

      <div class="composer-actions">
        <div class="circle-select-wrap">
          <label for="circle-select">Audience Circle:</label>
          <select id="circle-select" bind:value={postCircle} class="circle-select">
            <option value={1}>Tier 1 (Close Friends)</option>
            <option value={2}>Tier 2 (Acquaintances)</option>
            <option value={3}>Tier 3 (Network-Wide)</option>
          </select>
        </div>

        <button type="submit" class="btn-post">
          <span class="material-symbols-outlined">send</span>
          <span>Post to Feed</span>
        </button>
      </div>
    </form>
  </div>

  <!-- Stream of Posts -->
  <div class="posts-stream">
    {#if filteredFeed.length === 0}
      <div class="empty-feed">
        <span class="material-symbols-outlined empty-icon">filter_alt_off</span>
        <p>No posts in this circle match your active filters.</p>
      </div>
    {:else}
      {#each filteredFeed as post (post.id)}
        <div class="post-card">
          <div class="post-header">
            <div class="author-meta">
              <span class="author-avatar">{post.authorName[0]}</span>
              <div>
                <span class="author-name">{post.authorName}</span>
                <span class="author-handle">{post.authorHandle}</span>
              </div>
            </div>

            <div class="header-badges">
              <span class="tier-pill">Tier {post.tier}</span>
              {#if post.ranking?.groundednessIndex !== undefined}
                <span class="g-badge {post.ranking.groundednessIndex >= 0.7 ? 'g-badge-high' : post.ranking.groundednessIndex >= 0.4 ? 'g-badge-mid' : 'g-badge-low'}">
                  G: {post.ranking.groundednessIndex.toFixed(2)}
                </span>
              {/if}
              {#if post.ranking?.authorReputationTier}
                <span class="rep-badge rep-{post.ranking.authorReputationTier.toLowerCase()}">
                  Rep: {post.ranking.authorReputationTier}
                </span>
              {/if}
            </div>
          </div>

          <div class="post-body">
            {post.text}
          </div>

          <div class="post-footer">
            <span class="timestamp">{post.timestamp}</span>

            <button
              type="button"
              class="btn-courtroom-docket"
              onclick={() => onDocketClaim(post.text)}
              title="Escalate claim to formal Courtroom deliberation"
            >
              <span class="material-symbols-outlined">gavel</span>
              <span>Docket Case to Courtroom</span>
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .feed-view-container {
    max-width: 760px;
    margin: 0 auto;
    padding: 16px;
  }

  .tier-nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-surface, #161b22);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    border-radius: 12px;
    padding: 8px 14px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tier-tabs {
    display: flex;
    gap: 6px;
  }

  .tier-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-muted, #8b949e);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tier-tab:hover {
    color: var(--text, #f0f6fc);
    background: rgba(255, 255, 255, 0.05);
  }

  .tier-tab.active {
    color: #00f5d4;
    background: rgba(0, 245, 212, 0.1);
    border-color: rgba(0, 245, 212, 0.3);
  }

  .rage-bait-toggle-wrap {
    display: flex;
    align-items: center;
  }

  .switch-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.76rem;
    color: #f59e0b;
    cursor: pointer;
  }

  .composer-card {
    background: var(--bg-surface, #161b22);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .composer-textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.15));
    border-radius: 8px;
    color: #ffffff;
    padding: 10px;
    font-size: 0.88rem;
    resize: vertical;
    font-family: inherit;
    box-sizing: border-box;
  }

  .composer-textarea:focus {
    outline: none;
    border-color: #00f5d4;
  }

  .composer-metrics-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    background: rgba(0, 0, 0, 0.15);
    padding: 8px 12px;
    border-radius: 8px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .metric-sliders {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .slider-field {
    display: flex;
    flex-direction: column;
    font-size: 0.72rem;
    color: var(--text-muted, #8b949e);
  }

  .slider-field input {
    width: 85px;
    cursor: pointer;
  }

  .g-index-preview {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .g-title {
    font-size: 0.68rem;
    text-transform: uppercase;
    color: var(--text-muted, #8b949e);
  }

  .g-val {
    font-weight: 700;
    font-size: 0.92rem;
  }

  .g-high { color: #00f5d4; }
  .g-mid { color: #f59e0b; }
  .g-low { color: #ef4444; }

  .composer-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }

  .circle-select-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    color: var(--text-muted, #8b949e);
  }

  .circle-select {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
    border-radius: 6px;
    color: var(--text, #f0f6fc);
    padding: 4px 8px;
    font-size: 0.78rem;
  }

  .btn-post {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #00f5d4, #00b4d8);
    border: none;
    border-radius: 8px;
    color: #0b0f19;
    padding: 6px 14px;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-post:hover {
    filter: brightness(1.1);
  }

  .posts-stream {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .post-card {
    background: var(--bg-surface, #161b22);
    border: 1px solid var(--border, rgba(240, 246, 252, 0.1));
    border-radius: 12px;
    padding: 14px;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .post-card:hover {
    border-color: rgba(0, 245, 212, 0.3);
  }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .author-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .author-avatar {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #7000ff, #00b4d8);
    color: #ffffff;
    font-weight: bold;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
  }

  .author-name {
    font-weight: 600;
    font-size: 0.84rem;
    margin-right: 4px;
  }

  .author-handle {
    font-size: 0.76rem;
    color: var(--text-muted, #8b949e);
  }

  .header-badges {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tier-pill {
    font-size: 0.68rem;
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 6px;
    border-radius: 6px;
    color: var(--text-muted, #8b949e);
  }

  .g-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
  }

  .g-badge-high { background: rgba(0, 245, 212, 0.15); color: #00f5d4; }
  .g-badge-mid { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
  .g-badge-low { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

  .rep-badge {
    font-size: 0.68rem;
    padding: 2px 6px;
    border-radius: 6px;
  }

  .rep-high { background: rgba(16, 185, 129, 0.15); color: #10b981; }
  .rep-standard { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
  .rep-throttled { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

  .post-body {
    font-size: 0.88rem;
    line-height: 1.45;
    color: #e2e8f0;
    margin-bottom: 10px;
  }

  .post-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 8px;
  }

  .timestamp {
    font-size: 0.72rem;
    color: var(--text-muted, #8b949e);
  }

  .btn-courtroom-docket {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(112, 0, 255, 0.12);
    border: 1px solid rgba(112, 0, 255, 0.35);
    color: #c084fc;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.74rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-courtroom-docket:hover {
    background: rgba(112, 0, 255, 0.25);
    color: #ffffff;
  }

  .empty-feed {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-muted, #8b949e);
  }

  .empty-icon {
    font-size: 2.2rem;
    color: var(--text-muted, #8b949e);
    margin-bottom: 8px;
  }
</style>
