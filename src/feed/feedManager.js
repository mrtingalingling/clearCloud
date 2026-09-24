/**
 * Feature 1.1: ClearCloud Unified Social Feed & Relational Circles
 * Implements 3-Tier Circles, Groundedness Index (G), and Asymmetric Hidden Reputation Dynamics.
 */

import { reputationStakeGuard } from '../courtroom/reputationStakeGuard.js';

export const CIRCLE_TIERS = {
  TIER_1_CLOSE_FRIENDS: 1,
  TIER_2_ACQUAINTANCES: 2,
  TIER_3_NETWORK: 3
};

export class FeedManager {
  constructor() {
    this.posts = new Map(); // postId -> post
    this.userReputations = new Map(); // userDid -> score (0 to 100)
    this.userCircles = new Map(); // userDid -> { [targetDid]: tier }
    this.userFollowers = new Map(); // userDid -> follower count
    this.userDisinfoStrikes = new Map(); // userDid -> strike count
  }

  /**
   * Calculates the Groundedness Index (G) according to the PRD formula:
   * G = Facts / (Facts + Speculation + (Falsehood * 3))
   * @param {Object} metrics
   * @param {number} [metrics.factsPct=0]
   * @param {number} [metrics.opinionPct=0]
   * @param {number} [metrics.falsehoodPct=0]
   * @returns {number} Score from 0.0 to 1.0
   */
  calculateGroundednessIndex(metrics = {}) {
    const facts = Math.max(0, Number(metrics.factsPct || 0));
    const speculation = Math.max(0, Number(metrics.opinionPct || 0));
    const falsehood = Math.max(0, Number(metrics.falsehoodPct || 0));

    const denominator = facts + speculation + (falsehood * 3);
    if (denominator <= 0) return 0.5;

    const g = facts / denominator;
    return Math.round(g * 1000) / 1000;
  }

  /**
   * Retrieves a user's hidden reputation score (baseline: 50.0).
   * @param {string} userDid 
   * @returns {number}
   */
  getHiddenReputation(userDid) {
    if (!this.userReputations.has(userDid)) {
      this.userReputations.set(userDid, 50.0);
    }
    return this.userReputations.get(userDid);
  }

  /**
   * Adjusts hidden reputation with asymmetric dynamics ("Trust is hard to build, fast to lose"):
   * @param {string} userDid 
   * @param {'VERIFIED_POST'|'DEBUNKED_POST'|'RAGEBAIT_FLAG'|'JURY_CONSENSUS_AFFIRM'|'COURTROOM_SLASHED'} action 
   * @returns {number}
   */
  adjustHiddenReputation(userDid, action) {
    let current = this.getHiddenReputation(userDid);

    switch (action) {
      case 'VERIFIED_POST':
        current += 1.5;
        break;
      case 'JURY_CONSENSUS_AFFIRM':
        current += 2.0;
        break;
      case 'DEBUNKED_POST':
        current -= 18.0;
        break;
      case 'RAGEBAIT_FLAG':
        current -= 12.0;
        break;
      case 'COURTROOM_SLASHED':
        current -= 25.0;
        break;
      default:
        break;
    }

    const clamped = Math.max(0, Math.min(100, Math.round(current * 10) / 10));
    this.userReputations.set(userDid, clamped);
    return clamped;
  }

  /**
   * Assigns a user to a specific relational circle.
   * @param {string} viewerDid 
   * @param {string} targetDid 
   * @param {1|2|3} tier 
   */
  setCircleRelation(viewerDid, targetDid, tier) {
    if (!this.userCircles.has(viewerDid)) {
      this.userCircles.set(viewerDid, new Map());
    }
    this.userCircles.get(viewerDid).set(targetDid, tier);
  }

  getCircleRelation(viewerDid, targetDid) {
    if (viewerDid === targetDid) return CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS;
    if (!this.userCircles.has(viewerDid)) return CIRCLE_TIERS.TIER_3_NETWORK;
    return this.userCircles.get(viewerDid).get(targetDid) || CIRCLE_TIERS.TIER_3_NETWORK;
  }

  /**
   * Evaluates post distribution for a viewer across the 3 Circle Tiers.
   * @param {Object} post
   * @param {string} post.authorDid
   * @param {Object} post.metrics
   * @param {string} viewerDid
   * @param {boolean} [filterRageBait=false]
   * @returns {Object}
   */
  rankPostForViewer(post, viewerDid, filterRageBait = false) {
    const circleTier = this.getCircleRelation(viewerDid, post.authorDid);
    const gIndex = this.calculateGroundednessIndex(post.metrics);
    const rep = this.getHiddenReputation(post.authorDid);

    // Tier 1: Intimate Circle (Close Friends)
    if (circleTier === CIRCLE_TIERS.TIER_1_CLOSE_FRIENDS) {
      if (filterRageBait && gIndex < 0.25) {
        return {
          visible: false,
          circleTier,
          score: 0,
          reason: 'Filtered by Tier 1 Personal Rage-Bait Scrubber'
        };
      }
      return { visible: true, circleTier, score: 1.0, reason: 'Tier 1 Close Friends Priority' };
    }

    // Tier 2 & 3: Algorithmic distribution based on Groundedness (60%) + Reputation (40%)
    const compositeScore = (gIndex * 0.6) + ((rep / 100) * 0.4);
    const minThreshold = circleTier === CIRCLE_TIERS.TIER_2_ACQUAINTANCES ? 0.30 : 0.40;
    const isVisible = compositeScore >= minThreshold && rep >= 20.0;

    return {
      visible: isVisible,
      circleTier,
      score: Math.round(compositeScore * 100) / 100,
      groundednessIndex: gIndex,
      authorReputationTier: rep >= 75 ? 'HIGH' : rep >= 40 ? 'STANDARD' : 'THROTTLED',
      reason: isVisible ? 'Eligible for feed distribution' : 'Throttled due to low groundedness or reputation penalty'
    };
  }

  getFollowerCount(userDid) {
    return this.userFollowers.get(userDid) || 0;
  }

  setFollowerCount(userDid, count) {
    this.userFollowers.set(userDid, Math.max(0, Number(count) || 0));
    return this.getFollowerCount(userDid);
  }

  getDisinfoStrikes(userDid) {
    return this.userDisinfoStrikes.get(userDid) || 0;
  }

  addDisinfoStrike(userDid) {
    const current = this.getDisinfoStrikes(userDid);
    this.userDisinfoStrikes.set(userDid, current + 1);
    return current + 1;
  }

  /**
   * Creates and registers a new post in the feed, passing through the reputation stake guard.
   * @param {Object} params
   * @param {string} params.authorDid
   * @param {string} params.text
   * @param {Object} [params.metrics={}]
   * @param {number} [params.stakeDeposit=0]
   * @returns {Object} Result with post details or rejection error
   */
  createPost(params = {}) {
    const { authorDid, text, metrics = {}, stakeDeposit = 0 } = params;
    if (!authorDid || !text) {
      throw new Error('authorDid and text are required to create a post');
    }

    const currentRep = this.getHiddenReputation(authorDid);
    const followers = this.getFollowerCount(authorDid);
    const disinfoStrikes = this.getDisinfoStrikes(authorDid);

    const guardResult = reputationStakeGuard.evaluateStakeToPost({
      authorDid,
      rep: currentRep,
      followers,
      disinfoStrikes,
      stakeDeposit
    });

    if (!guardResult.allowed) {
      return {
        success: false,
        post: null,
        error: guardResult.reason,
        guard: guardResult
      };
    }

    const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const post = {
      postId,
      authorDid,
      text,
      metrics,
      createdAt: Date.now(),
      stakeStatus: guardResult.status,
      stakeHeld: guardResult.stakeHeld || 0,
      authorReputation: currentRep,
      authorFollowers: followers,
      likes: [],
      weightedLikeCount: 0,
      reposts: []
    };

    this.posts.set(postId, post);
    return {
      success: true,
      post,
      guard: guardResult
    };
  }

  /**
   * Records a user like on a post, dynamically weighted by their epistemic credit score.
   * Low-reputation accounts have their likes significantly down-weighted.
   * @param {Object} params
   * @param {string} params.postId
   * @param {string} params.userDid
   * @returns {Object}
   */
  likePost(params = {}) {
    const { postId, userDid } = params;
    if (!postId || !userDid) {
      throw new Error('postId and userDid are required to like a post');
    }

    const post = this.posts.get(postId);
    if (!post) {
      throw new Error(`Post ${postId} does not exist`);
    }

    const rep = this.getHiddenReputation(userDid);
    const weightResult = reputationStakeGuard.calculateInteractionWeight({
      userDid,
      rep,
      interactionType: 'LIKE'
    });

    const likeRecord = {
      userDid,
      rep,
      weight: weightResult.weight,
      discounted: weightResult.discounted,
      timestamp: Date.now()
    };

    post.likes.push(likeRecord);
    post.weightedLikeCount = Math.round((post.weightedLikeCount + weightResult.weight) * 100) / 100;

    return {
      success: true,
      postId,
      userDid,
      weight: weightResult.weight,
      discounted: weightResult.discounted,
      weightedLikeCount: post.weightedLikeCount,
      reason: weightResult.reason
    };
  }

  /**
   * Reposts/amplifies content, enforcing stake-to-repost guards for low-reputation or high-reach users.
   * @param {Object} params
   * @param {string} params.originalPostId
   * @param {string} params.reposterDid
   * @param {number} [params.stakeDeposit=0]
   * @returns {Object}
   */
  repost(params = {}) {
    const { originalPostId, reposterDid, stakeDeposit = 0 } = params;
    if (!originalPostId || !reposterDid) {
      throw new Error('originalPostId and reposterDid are required to repost');
    }

    const originalPost = this.posts.get(originalPostId);
    if (!originalPost) {
      throw new Error(`Original post ${originalPostId} does not exist`);
    }

    const rep = this.getHiddenReputation(reposterDid);
    const followers = this.getFollowerCount(reposterDid);
    const disinfoStrikes = this.getDisinfoStrikes(reposterDid);

    const guardResult = reputationStakeGuard.evaluateStakeToRepost({
      reposterDid,
      originalPostId,
      rep,
      followers,
      disinfoStrikes,
      stakeDeposit
    });

    if (!guardResult.allowed) {
      return {
        success: false,
        repost: null,
        error: guardResult.reason,
        guard: guardResult
      };
    }

    const repostRecord = {
      repostId: `repost_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      originalPostId,
      reposterDid,
      createdAt: Date.now(),
      stakeStatus: guardResult.status,
      stakeHeld: guardResult.stakeHeld || 0,
      reposterReputation: rep
    };

    originalPost.reposts.push(repostRecord);
    return {
      success: true,
      repost: repostRecord,
      guard: guardResult
    };
  }
}

export const feedManager = new FeedManager();
