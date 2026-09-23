import { describe, it, expect } from 'vitest';
import { analyzeClaimLocally, createP2PNode } from '../../vera/frontend/src/index.js';

describe('Cross-Repo Integration: clearCloud referencing @vera/core', () => {
  it('imports and executes Layer 0 epistemic claim evaluation from vera', async () => {
    const text = 'According to satellite radar telemetry, the sea level has been rising at 3.4mm per year.';
    const result = await analyzeClaimLocally(text);

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.claims).toBeDefined();
    expect(result.claims[0].verdict).toBe('verified');
    expect(result.metrics).toBeDefined();
    expect(typeof result.metrics.factsPct).toBe('number');
  });

  it('imports and instantiates Layer 0 P2P swarm gossip node from vera', () => {
    const node = createP2PNode({ peerId: 'clearcloud-peer-1' });
    expect(node).toBeDefined();
    expect(node.peerId).toBe('clearcloud-peer-1');
    expect(node.status).toBe('connected');
    expect(typeof node.publishClaim).toBe('function');
  });
});
