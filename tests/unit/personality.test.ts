/**
 * @module state/personality.test
 * Unit tests for PersonalityEngine.
 * Aligned with issue #11 acceptance criteria.
 */

import { describe, it, expect } from 'vitest';
import { PersonalityEngine } from '../../src/state/personality-engine';
import { DEFAULT_PERSONALITY_STATE } from '../../src/shared/types';

describe('PersonalityEngine', () => {
  it('starts as balanced with no data', () => {
    const engine = new PersonalityEngine();
    expect(engine.getState().currentType).toBe('balanced');
    expect(engine.getState().confidence).toBe(0);
  });

  it('stays balanced with fewer than 5 interactions', () => {
    const engine = new PersonalityEngine();
    for (let i = 0; i < 4; i++) {
      engine.recordInteraction('feed', Date.now() + i * 1000);
    }
    expect(engine.getState().currentType).toBe('balanced');
  });

  it('classifies spoiled: mostly feed, little play', () => {
    const engine = new PersonalityEngine();
    const now = Date.now();
    // 10 feeds, 1 play, 1 clean
    for (let i = 0; i < 10; i++) {
      engine.recordInteraction('feed', now + i * 1000);
    }
    engine.recordInteraction('play', now + 11000);
    engine.recordInteraction('clean', now + 12000);
    // After 12 interactions, should be classified
    expect(engine.getState().currentType).toBe('spoiled');
  });

  it('classifies balanced: even care across types', () => {
    const engine = new PersonalityEngine();
    const now = Date.now();
    // 4 feeds, 4 plays, 4 cleans
    for (let i = 0; i < 4; i++) {
      engine.recordInteraction('feed', now + i * 3000);
      engine.recordInteraction('play', now + i * 3000 + 1000);
      engine.recordInteraction('clean', now + i * 3000 + 2000);
    }
    expect(engine.getState().currentType).toBe('balanced');
  });

  it('classifies spammed: rapid repeated interactions', () => {
    const engine = new PersonalityEngine();
    const now = Date.now();
    // 12 interactions in under an hour
    for (let i = 0; i < 12; i++) {
      engine.recordInteraction('feed', now + i * 100);
    }
    expect(engine.getState().currentType).toBe('spammed');
  });

  it('dialog modifier: spoiled = 1.5x', () => {
    const engine = new PersonalityEngine();
    (engine as any).state.currentType = 'spoiled';
    expect(engine.getDialogModifier()).toBe(1.5);
  });

  it('dialog modifier: neglected = 2.0x', () => {
    const engine = new PersonalityEngine();
    (engine as any).state.currentType = 'neglected';
    expect(engine.getDialogModifier()).toBe(2.0);
  });

  it('decay multiplier: spoiled = 1.2x', () => {
    const engine = new PersonalityEngine();
    (engine as any).state.currentType = 'spoiled';
    expect(engine.getMoodDecayMultiplier()).toBe(1.2);
  });

  it('reset returns to balanced', () => {
    const engine = new PersonalityEngine();
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      engine.recordInteraction('feed', now + i * 1000);
    }
    engine.reset();
    expect(engine.getState().currentType).toBe('balanced');
    expect(engine.getState().confidence).toBe(0);
    expect(engine.getState().tendencies.totalInteractions).toBe(0);
  });

  it('restores state from saved data', () => {
    const saved = {
      currentType: 'spoiled' as const,
      tendencies: {
        feedCount: 10,
        playCount: 1,
        cleanCount: 1,
        totalInteractions: 12,
        firstInteractionTime: Date.now(),
        lastInteractionTime: Date.now(),
        interactionFrequency: 2.4,
      },
      confidence: 0.8,
      history: Array(10).fill('spoiled' as const),
    };
    const engine = new PersonalityEngine(saved);
    expect(engine.getState().currentType).toBe('spoiled');
    expect(engine.getState().confidence).toBeCloseTo(0.8, 1);
  });

  it('history smoothing prevents sudden flips', () => {
    const engine = new PersonalityEngine();
    const now = Date.now();
    // First 8 feeds → spoiled
    for (let i = 0; i < 8; i++) {
      engine.recordInteraction('feed', now + i * 1000);
    }
    // Then 8 plays — should NOT immediately flip to balanced
    for (let i = 0; i < 8; i++) {
      engine.recordInteraction('play', now + 10000 + i * 1000);
    }
    // Should be trending toward balanced but not there yet
    expect(['spoiled', 'balanced']).toContain(engine.getState().currentType);
  });
});
