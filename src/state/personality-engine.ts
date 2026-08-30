/**
 * @module state/personality-engine
 * Calculates personality type from care interaction history.
 * Aligned with issue #11 and docs/state-machine-spec.md.
 */

import {
  PersonalityState,
  PersonalityType,
  DEFAULT_PERSONALITY_STATE,
} from '../shared/types';

// Minimum interactions before we can classify
const MIN_INTERACTIONS = 5;
// Minimum hours of data before personality stabilizes
const MIN_HOURS = 24;
// History length for smoothing
const HISTORY_LENGTH = 10;

/**
 * PersonalityEngine tracks care tendencies from interaction history
 * and classifies the pet into one of four personality types:
 * - spoiled: high feed, low play (pampered but bored)
 * - neglected: low everything (needs attention)
 * - balanced: even care across all types
 * - spammed: rapid repeated interactions
 *
 * Uses O(1) running totals, not full history.
 */
export class PersonalityEngine {
  private state: PersonalityState;

  constructor(savedState?: PersonalityState) {
    if (savedState) {
      this.state = {
        ...savedState,
        tendencies: { ...savedState.tendencies },
        history: [...savedState.history],
      };
    } else {
      this.state = {
        ...DEFAULT_PERSONALITY_STATE,
        tendencies: { ...DEFAULT_PERSONALITY_STATE.tendencies },
        history: [],
      };
    }
  }

  getState(): PersonalityState {
    return this.state;
  }

  /**
   * Record a care interaction.
   * O(1) per interaction.
   */
  recordInteraction(
    type: 'feed' | 'play' | 'clean',
    timestamp: number = Date.now()
  ): void {
    const t = this.state.tendencies;

    if (t.totalInteractions === 0) {
      t.firstInteractionTime = timestamp;
    }

    switch (type) {
      case 'feed':
        t.feedCount++;
        break;
      case 'play':
        t.playCount++;
        break;
      case 'clean':
        t.cleanCount++;
        break;
    }

    t.totalInteractions++;
    t.lastInteractionTime = timestamp;

    // Update interaction frequency (interactions per hour)
    const hoursSinceFirst =
      (timestamp - t.firstInteractionTime) / (1000 * 60 * 60);
    if (hoursSinceFirst > 0) {
      t.interactionFrequency = t.totalInteractions / hoursSinceFirst;
    }

    // Recalculate personality
    this.recalculate();
  }

  /**
   * Recalculate personality type from current tendencies.
   * Called after every interaction.
   */
  private recalculate(): void {
    const t = this.state.tendencies;

    // Not enough data yet — stay balanced
    if (t.totalInteractions < MIN_INTERACTIONS) {
      this.state.currentType = 'balanced';
      this.state.confidence = 0;
      return;
    }

    // Determine raw classification
    const rawType = this.classify(t);

    // Smooth with history to prevent sudden flips
    this.state.history.push(rawType);
    if (this.state.history.length > HISTORY_LENGTH) {
      this.state.history.shift();
    }

    // Use majority vote from history
    const counts = new Map<PersonalityType, number>();
    for (const h of this.state.history) {
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }

    let maxCount = 0;
    let majority: PersonalityType = 'balanced';
    for (const [type, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        majority = type;
      }
    }

    this.state.currentType = majority;
    // Spammed is an immediate behavior signal — override smoothed history
    if (rawType === 'spammed') {
      this.state.currentType = 'spammed';
    }
    this.state.confidence = maxCount / this.state.history.length;
  }

  /**
   * Classify a single personality type from tendencies.
   */
  private classify(t: {
    feedCount: number;
    playCount: number;
    cleanCount: number;
    totalInteractions: number;
    interactionFrequency: number;
  }): PersonalityType {
    const totalTimeSeconds =
      (t.lastInteractionTime - t.firstInteractionTime) / 1000;

    // Spammed: truly rapid (> 10 interactions in under 2 seconds)
    // This threshold distinguishes "spamming buttons" from "active care"
    if (totalTimeSeconds < 2 && t.totalInteractions > 10) {
      return 'spammed';
    }

    const hoursSinceFirst = totalTimeSeconds / 3600;

    // Neglected: very low interaction frequency over a long period
    if (hoursSinceFirst >= MIN_HOURS && t.interactionFrequency < 0.5) {
      return 'neglected';
    }

    // Calculate ratios
    const feedRatio = t.feedCount / t.totalInteractions;
    const playRatio = t.playCount / t.totalInteractions;
    const cleanRatio = t.cleanCount / t.totalInteractions;

    // Spoiled: mostly fed, little play
    if (feedRatio > 0.5 && playRatio < 0.2) {
      return 'spoiled';
    }

    // Balanced: all ratios within [0.2, 0.5]
    if (
      feedRatio >= 0.2 &&
      feedRatio <= 0.5 &&
      playRatio >= 0.2 &&
      playRatio <= 0.5 &&
      cleanRatio >= 0.2 &&
      cleanRatio <= 0.5
    ) {
      return 'balanced';
    }

    // Default: whatever dominates
    if (feedRatio >= playRatio && feedRatio >= cleanRatio) {
      return feedRatio > 0.4 ? 'spoiled' : 'balanced';
    }
    if (playRatio >= feedRatio && playRatio >= cleanRatio) {
      return 'balanced';
    }
    return 'balanced';
  }

  /**
   * Get dialog modifier based on personality type.
   * Spoiled pets complain more, neglected pets are clingy.
   */
  getDialogModifier(): number {
    switch (this.state.currentType) {
      case 'spoiled':
        return 1.5; // 50% more complaints
      case 'neglected':
        return 2.0; // 100% more clingy messages
      case 'spammed':
        return 1.2; // slightly annoyed
      default:
        return 1.0;
    }
  }

  /**
   * Get mood decay multiplier based on personality type.
   * Spoiled pets get unhappy faster when needs drop.
   */
  getMoodDecayMultiplier(): number {
    switch (this.state.currentType) {
      case 'spoiled':
        return 1.2; // 20% faster decay
      case 'neglected':
        return 0.9; // slightly resilient
      case 'spammed':
        return 1.1;
      default:
        return 1.0;
    }
  }

  /**
   * Reset personality to default.
   */
  reset(): void {
    this.state = {
      ...DEFAULT_PERSONALITY_STATE,
      tendencies: { ...DEFAULT_PERSONALITY_STATE.tendencies },
      history: [],
    };
  }
}
