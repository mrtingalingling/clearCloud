import { decentralizedStorageAdapter } from '../../../veracities.social/src/storage/storageService.js';
import { atprotoDocketService, LEXICON_IDS } from '../../../veracities.social/src/courtroom/atprotoDocketService.js';

export class AtprotoStorageBridge {
  constructor(storage = decentralizedStorageAdapter, docketService = atprotoDocketService) {
    this.storage = storage;
    this.docketService = docketService;
  }

  /**
   * Archives whistleblower or claimant evidence to the active decentralized storage provider.
   * Can be IPFS, Arweave, Walrus, Filecoin, etc.
   */
  async archiveEvidence(caseId, authorDid, evidenceContent, metadata = {}) {
    return await this.storage.storeEvidence({
      title: metadata.title || `Evidence for ${caseId}`,
      claimId: caseId,
      authorDid,
      content: evidenceContent,
      mimeType: metadata.mimeType || 'application/json'
    });
  }

  /**
   * Publishes a Courtroom Case Docket to the ATProto network.
   */
  async publishCaseDocket(courtroomCase) {
    return await this.docketService.createFederatedDocketRecord(courtroomCase);
  }

  /**
   * Publishes a settled judicial verdict to the ATProto network.
   */
  async publishVerdict(verdictData) {
    return await this.docketService.createFederatedVerdictRecord(verdictData);
  }

  /**
   * Hot-swaps the underlying decentralized storage provider.
   * E.g. 'ipfs' -> 'arweave'
   */
  setStorageProvider(providerName) {
    return this.storage.setActiveProvider(providerName);
  }

  getActiveProviderName() {
    return this.storage.activeProviderName;
  }
}

export const atprotoStorageBridge = new AtprotoStorageBridge();
