import { describe, it, expect } from 'vitest';
import { DaoRegistry, PROPOSAL_CATEGORIES } from '../src/governance/daoRegistry.js';

describe('Layer 1.1 / Layer 3 Epistemic DAO Subsystem (EnDAOsment)', () => {
  it('creates an active governance proposal', () => {
    const dao = new DaoRegistry();
    const proposal = dao.createProposal({
      title: 'Update Slashing Threshold for Courtroom Contests',
      description: 'Require 75% consensus before slashing contested jurors',
      proposerDid: 'did:plc:proposer',
      category: 'EPISTEMIC_RULE_UPDATE',
      consensusThresholdPct: 66.0
    });

    expect(proposal.proposalId).toBe('prop_1');
    expect(proposal.status).toBe('ACTIVE');
    expect(proposal.category).toBe('EPISTEMIC_RULE_UPDATE');
  });

  it('casts weighted votes on active proposals', () => {
    const dao = new DaoRegistry();
    const proposal = dao.createProposal({
      title: 'Treasury Grant for Veracity Indexing Node',
      description: 'Allocate 5000 tokens to subsidize P2P gossip relay',
      proposerDid: 'did:plc:proposer',
      category: 'TREASURY_ALLOCATION'
    });

    dao.castVote({
      proposalId: proposal.proposalId,
      voterDid: 'did:plc:alice',
      choice: 'FOR',
      weight: 10.0
    });
    dao.castVote({
      proposalId: proposal.proposalId,
      voterDid: 'did:plc:bob',
      choice: 'AGAINST',
      weight: 2.0
    });

    const tally = dao.tallyVotes(proposal.proposalId);
    expect(tally.votesFor).toBe(10.0);
    expect(tally.votesAgainst).toBe(2.0);
    expect(tally.totalWeight).toBe(12.0);
    expect(tally.approvalPct).toBe(83.3);
    expect(tally.meetsConsensus).toBe(true);
  });

  it('prevents double voting by the same DID', () => {
    const dao = new DaoRegistry();
    const proposal = dao.createProposal({
      title: 'Test Proposal',
      description: 'Testing double vote guard',
      proposerDid: 'did:plc:proposer'
    });

    dao.castVote({
      proposalId: proposal.proposalId,
      voterDid: 'did:plc:alice',
      choice: 'FOR'
    });

    expect(() => {
      dao.castVote({
        proposalId: proposal.proposalId,
        voterDid: 'did:plc:alice',
        choice: 'AGAINST'
      });
    }).toThrow('already voted');
  });

  it('executes proposal when consensus is achieved', () => {
    const dao = new DaoRegistry();
    const proposal = dao.createProposal({
      title: 'Approve Courtroom Protocol V1',
      description: 'Authorize deployment of courtroom staking contract',
      proposerDid: 'did:plc:proposer',
      consensusThresholdPct: 60.0
    });

    dao.castVote({
      proposalId: proposal.proposalId,
      voterDid: 'did:plc:alice',
      choice: 'FOR',
      weight: 80
    });
    dao.castVote({
      proposalId: proposal.proposalId,
      voterDid: 'did:plc:bob',
      choice: 'AGAINST',
      weight: 20
    });

    const execution = dao.executeProposal(proposal.proposalId);
    expect(execution.status).toBe('EXECUTED');
    expect(execution.approvalPct).toBe(80.0);
  });
});
