import { describe, it, expect } from 'vitest';
import { createAuthProvider, AtprotoAuthProvider, Web3NftAuthProvider } from '../src/identity/index.js';

describe('Layer 1.1 Identity Subsystem: ATProto Authentication', () => {
  it('instantiates AtprotoAuthProvider via factory', () => {
    const provider = createAuthProvider('atproto', { isTestEnv: true });
    expect(provider).toBeInstanceOf(AtprotoAuthProvider);
    expect(provider.type).toBe('atproto');
    expect(provider.isAuthenticated()).toBe(false);
  });

  it('resolves ATProto handles to valid DID:PLC format', async () => {
    const provider = new AtprotoAuthProvider({ isTestEnv: true });
    const did = await provider.resolveDid('alice.bsky.social');
    expect(did).toMatch(/^did:plc:/);
  });

  it('preserves already-resolved DID URIs', async () => {
    const provider = new AtprotoAuthProvider({ isTestEnv: true });
    const existingDid = 'did:plc:ragtjsm2j2vknqki3eczgahb';
    const did = await provider.resolveDid(existingDid);
    expect(did).toBe(existingDid);
  });

  it('authenticates user and generates session with JWT tokens', async () => {
    const provider = new AtprotoAuthProvider({ isTestEnv: true });
    const session = await provider.authenticate({ identifier: 'veratester.bsky.social', mock: true });

    expect(session.provider).toBe('atproto');
    expect(session.handle).toBe('veratester.bsky.social');
    expect(session.did).toMatch(/^did:plc:/);
    expect(session.accessJwt).toBeDefined();
    expect(provider.isAuthenticated()).toBe(true);

    const profile = await provider.getUserProfile();
    expect(profile.handle).toBe('veratester.bsky.social');
    expect(profile.displayName).toBe('veratester');
  });

  it('exports session state and handles logout', async () => {
    const provider = new AtprotoAuthProvider({ isTestEnv: true });
    await provider.authenticate({ identifier: 'bob.bsky.social', mock: true });

    const exported = provider.exportSession();
    expect(exported.handle).toBe('bob.bsky.social');

    await provider.logout();
    expect(provider.isAuthenticated()).toBe(false);
    expect(provider.getSession()).toBeNull();
  });
});

describe('Layer 1.1 Identity Subsystem: Web3 & NFT Identity', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';

  it('instantiates Web3NftAuthProvider via factory', () => {
    const provider = createAuthProvider('web3-nft', { chainId: 8453 }); // Base
    expect(provider).toBeInstanceOf(Web3NftAuthProvider);
    expect(provider.type).toBe('web3-nft');
    expect(provider.chainId).toBe(8453);
  });

  it('resolves Ethereum address to W3C DID:PKH identifier', async () => {
    const provider = new Web3NftAuthProvider({ chainId: 1 });
    const did = await provider.resolveDid(testAddress);
    expect(did).toBe(`did:pkh:eip155:1:${testAddress.toLowerCase()}`);
  });

  it('constructs standard EIP-4361 SIWE challenge message', () => {
    const provider = new Web3NftAuthProvider({ chainId: 1 });
    const message = provider.createSiweMessage({ address: testAddress, domain: 'clearcloud.network' });

    expect(message).toContain('clearcloud.network wants you to sign in with your Ethereum account');
    expect(message).toContain(testAddress);
    expect(message).toContain('Chain ID: 1');
  });

  it('authenticates Web3 address with optional NFT gate', async () => {
    const provider = new Web3NftAuthProvider({ chainId: 1 });
    const session = await provider.authenticate({
      address: testAddress,
      nftGate: {
        contractAddress: '0x0000000000000000000000000000000000000001',
        minBalance: 1
      }
    });

    expect(session.provider).toBe('web3-nft');
    expect(session.address).toBe(testAddress.toLowerCase());
    expect(session.verifiedNfts.length).toBe(1);
    expect(provider.isAuthenticated()).toBe(true);
  });
});
