import { AtprotoAuthProvider } from './atprotoProvider.js';
import { Web3NftAuthProvider } from './web3NftProvider.js';
import { AuthProvider } from './authProvider.js';

export { AuthProvider, AtprotoAuthProvider, Web3NftAuthProvider };

/**
 * Factory helper to instantiate identity providers.
 * @param {'atproto' | 'web3-nft'} type
 * @param {Object} [options]
 * @returns {AuthProvider}
 */
export function createAuthProvider(type = 'atproto', options = {}) {
  switch (type.toLowerCase()) {
    case 'atproto':
    case 'bluesky':
      return new AtprotoAuthProvider(options);
    case 'web3-nft':
    case 'web3':
    case 'nft':
      return new Web3NftAuthProvider(options);
    default:
      throw new Error(`Unsupported authentication provider type: ${type}`);
  }
}
