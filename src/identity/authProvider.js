/**
 * Base Abstract Authentication Provider Interface for clearCloud.
 * Supports extensible decentralized identity protocols (ATProto, Web3/NFT).
 */

export class AuthProvider {
  constructor(type) {
    if (new.target === AuthProvider) {
      throw new TypeError("Cannot construct AuthProvider instances directly");
    }
    this.type = type; // 'atproto' | 'web3-nft'
    this.currentSession = null;
  }

  /**
   * Authenticate a user with given credentials.
   * @param {Object} credentials 
   * @returns {Promise<Object>} session object
   */
  async authenticate(credentials) {
    throw new Error("Method authenticate() must be implemented");
  }

  /**
   * Resolve a decentralized identifier (DID) or public address.
   * @param {string} identifier 
   * @returns {Promise<string>} DID URI
   */
  async resolveDid(identifier) {
    throw new Error("Method resolveDid() must be implemented");
  }

  /**
   * Retrieve the active authentication session.
   * @returns {Object|null}
   */
  getSession() {
    return this.currentSession;
  }

  /**
   * Terminate active session.
   */
  async logout() {
    this.currentSession = null;
  }

  /**
   * Check if user is authenticated.
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.currentSession !== null;
  }
}
