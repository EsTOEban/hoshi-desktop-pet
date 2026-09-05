/**
 * @module state/personality-engine
 * Personality Evolution System (#11)
 * 
 * Tracks care tendencies via running totals (O(1) per interaction),
 * classifies personality type, and provides mood threshold modifiers.
 * 
 * Aligned with docs/state-machine-spec.md and #11 acceptance criteria.
 * Implementation conforms to tests/unit/personality.test.ts.
 */

import {
  PersonalityType,
  CareTendencies,
  PersonalityState,
  DEFAULT_PERSONALITY_STATE,
} from '../shared/types';

// ---------------------------------------------------------------------------
// Classification thresholds
// ---------------------------------------------------------------------------

/** Minimum interactions before we trust the classification */
const MIN_INTERACTIONS = 5;

/** How many consecutive same-type classifications before switching */
const SMOOTHING_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// PersonalityEngine
// ---------------------------------------------------------------------------

export class PersonalityEngine {
  private state: PersonalityState;

  constructor(initialState?: PersonalityState) {
    this.state = initialState
      ? { ...initialState, tendencies: { ...initialState.tendencies }, history: [...(initialState.history || [])] }
      : JSON.parse(JSON.stringify(DEFAULT_PERSONALITY_STATE));
  }

  /**
   * Record a personality-relevant interaction. O(1) — only updates counters.
   * @param type - The interaction type
   * @param timestamp - Optional timestamp (defaults to Date.now()), used for testing
   */
  recordInteraction(type: 'feed' | 'play' | 'clean', timestamp?: number): void {
    const now = timestamp ?? Date.now();
    const t = this.state.tendencies;

    if (t.totalInteractions === 0) {
      t.firstInteractionTime = now;
    }
    t.lastInteractionTime = now;
    t.totalInteractions++;

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

    // Update interaction frequency (interactions per hour)
    const hoursSinceFirst = (now - t.firstInteractionTime) / 3_600_000;
    if (hoursSinceFirst > 0) {
      t.interactionFrequency = t.totalInteractions / hoursSinceFirst;
    }

    // Reclassify after each interaction
    this.reclassify();
  }

  /**
   * Get the current personality type with confidence.
   */
  getPersonalityType(): PersonalityType {
    return this.state.currentType;
  }

  /**
   * Get full personality state (for persistence).
   */
  getState(): PersonalityState {
    return { ...this.state, tendencies: { ...this.state.tendencies }, history: [...this.state.history] };
  }

  /**
   * Dialog tone hint based on personality.
   */
  getDialogModifier(): number {
    switch (this.state.currentType) {
      case 'spoiled':
        return 1.5;
      case 'neglected':
        return 2.0;
      case 'spammed':
        return 1.2;
      case 'balanced':
      default:
        return 1.0;
    }
  }

  /**
   * Mood decay multiplier: multiplies the base decay rate.
   */
  getMoodDecayMultiplier(): number {
    switch (this.state.currentType) {
      case 'spoiled':
        return 1.2; // 20% faster decay
      case 'neglected':
        return 0.8; // 20% slower decay
      case 'spammed':
        return 1.1; // slightly faster
      case 'balanced':
      default:
        return 1.0;
    }
  }

  /**
   * Reset personality to initial state.
   */
  reset(): void {
    this.state = JSON.parse(JSON.stringify(DEFAULT_PERSONALITY_STATE));
  }

  /**
   * Serialize to JSON for persistence.
   */
  toJSON(): PersonalityState {
    return this.getState();
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /**
   * Classify personality from running totals. O(1).
   */
  private reclassify(): void {
    const t = this.state.tendencies;

    // Not enough data yet
    if (t.totalInteractions < MIN_INTERACTIONS) {
      return; // stays balanced
    }

    const total = t.totalInteractions;
    const feedRatio = t.feedCount / total;
    const playRatio = t.playCount / total;
    const cleanRatio = t.cleanCount / total;
    const freq = t.interactionFrequency;

    // Classification logic
    let newType: PersonalityType;

    // Variety: how many distinct action types were actually used
    const distinctTypes = (t.feedCount > 0 ? 1 : 0) + (t.playCount > 0 ? 1 : 0) + (t.cleanCount > 0 ? 1 : 0);

    // Spammed: very high frequency (>60/hour) with low variety (only 1 action type)
    // Check first — pure spam pattern (user mashing one button)
    if (freq > 60 && distinctTypes <= 1) {
      newType = 'spammed';
    }
    // Spoiled: >50% feed, <20% play — check SECOND (specific care pattern)
    else if (feedRatio > 0.5 && playRatio < 0.2) {
      newType = 'spoiled';
    }
    // Balanced: ratios are roughly even
    else {
      newType = 'balanced';
    }

    // Confidence: ramps from 0 to 1 as interactions go from MIN to MIN*4
    this.state.confidence = Math.min(1, (total - MIN_INTERACTIONS) / (MIN_INTERACTIONS * 4));

    // Smoothing: only switch after enough consecutive same-type calls.
    // spammed is a transient state — exit it immediately when pattern changes.
    if (newType !== this.state.currentType) {
      const threshold = this.state.currentType === 'spammed' ? 1 : SMOOTHING_THRESHOLD;
      this.state.history.push(newType);
      if (this.state.history.length >= threshold) {
        const recent = this.state.history.slice(-threshold);
        if (recent.every((h) => h === newType)) {
          this.state.currentType = newType;
        }
      }
    } else {
      // Same type, reset history
      this.state.history = [];
    }
  }
}
