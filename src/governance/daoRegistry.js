/**
 * Layer 1.1 / Layer 3: Epistemic DAO Governance Registry ("EnDAOsment")
 * Manages protocol proposals, stake-weighted voting, and truth-settlement
 * consensus upgrades.
 */

export const PROPOSAL_CATEGORIES = [
  'EPISTEMIC_RULE_UPDATE',
  'ORACLE_WHITELIST',
  'SLASHING_DISPUTE_APPEAL',
  'TREASURY_ALLOCATION'
];

export class DaoRegistry {
  constructor() {
    this.proposals = new Map();
    this.votes = new Map(); // proposalId:voterDid -> vote object
    this.nextProposalId = 1;
  }

  /**
   * Submit a new DAO governance proposal.
   * @param {Object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.proposerDid
   * @param {string} [params.category="EPISTEMIC_RULE_UPDATE"]
   * @param {number} [params.votingPeriodHours=72]
   * @param {number} [params.consensusThresholdPct=66.0] Required supermajority %
   * @returns {Object} Created proposal
   */
  createProposal(params) {
    const {
      title,
      description,
      proposerDid,
      category = 'EPISTEMIC_RULE_UPDATE',
      votingPeriodHours = 72,
      consensusThresholdPct = 66.0
    } = params;

    if (!title || !description || !proposerDid) {
      throw new Error('Title, description, and proposer DID are required');
    }

    if (!PROPOSAL_CATEGORIES.includes(category)) {
      throw new Error(`Invalid proposal category. Must be one of: ${PROPOSAL_CATEGORIES.join(', ')}`);
    }

    const proposalId = `prop_${this.nextProposalId++}`;
    const now = Date.now();

    const proposal = {
      proposalId,
      title,
      description,
      proposerDid,
      category,
      status: 'ACTIVE', // 'ACTIVE' | 'PASSED' | 'FAILED' | 'EXECUTED'
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + votingPeriodHours * 3600 * 1000).toISOString(),
      consensusThresholdPct,
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      totalWeight: 0
    };

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  /**
   * Cast a vote on an active proposal.
   * @param {Object} params
   * @param {string} params.proposalId
   * @param {string} params.voterDid
   * @param {'FOR'|'AGAINST'|'ABSTAIN'} params.choice
   * @param {number} [params.weight=1.0] Epistemic or token-weighted voting power
   * @returns {Object} Vote record
   */
  castVote(params) {
    const { proposalId, voterDid, choice, weight = 1.0 } = params;

    if (!this.proposals.has(proposalId)) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const proposal = this.proposals.get(proposalId);
    if (proposal.status !== 'ACTIVE') {
      throw new Error(`Cannot vote on proposal in status: ${proposal.status}`);
    }

    if (!['FOR', 'AGAINST', 'ABSTAIN'].includes(choice)) {
      throw new Error('Vote choice must be FOR, AGAINST, or ABSTAIN');
    }

    const voteKey = `${proposalId}:${voterDid}`;
    if (this.votes.has(voteKey)) {
      throw new Error(`User ${voterDid} has already voted on proposal ${proposalId}`);
    }

    const vote = {
      proposalId,
      voterDid,
      choice,
      weight,
      votedAt: new Date().toISOString()
    };

    if (choice === 'FOR') proposal.votesFor += weight;
    if (choice === 'AGAINST') proposal.votesAgainst += weight;
    if (choice === 'ABSTAIN') proposal.votesAbstain += weight;
    proposal.totalWeight += weight;

    this.votes.set(voteKey, vote);
    return vote;
  }

  /**
   * Tally votes and compute current consensus standing.
   * @param {string} proposalId
   * @returns {Object} Proposal tally
   */
  tallyVotes(proposalId) {
    if (!this.proposals.has(proposalId)) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const proposal = this.proposals.get(proposalId);
    const nonAbstainWeight = proposal.votesFor + proposal.votesAgainst;
    const approvalPct = nonAbstainWeight > 0 ? (proposal.votesFor / nonAbstainWeight) * 100 : 0;
    const meetsConsensus = approvalPct >= proposal.consensusThresholdPct;

    return {
      proposalId,
      status: proposal.status,
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      votesAbstain: proposal.votesAbstain,
      totalWeight: proposal.totalWeight,
      approvalPct: Math.round(approvalPct * 10) / 10,
      meetsConsensus
    };
  }

  /**
   * Execute or finalize an approved proposal.
   * @param {string} proposalId
   * @returns {Object} Execution receipt
   */
  executeProposal(proposalId) {
    const tally = this.tallyVotes(proposalId);
    const proposal = this.proposals.get(proposalId);

    if (proposal.status !== 'ACTIVE') {
      throw new Error(`Proposal is not active (current status: ${proposal.status})`);
    }

    if (!tally.meetsConsensus) {
      proposal.status = 'FAILED';
      return { proposalId, status: 'FAILED', reason: 'Consensus threshold not reached' };
    }

    proposal.status = 'EXECUTED';
    proposal.executedAt = new Date().toISOString();

    return {
      proposalId,
      status: 'EXECUTED',
      approvalPct: tally.approvalPct
    };
  }
}
