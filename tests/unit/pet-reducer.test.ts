/**
 * @module state/pet-reducer.test
 * Unit tests for the pet state reducer.
 * Covers: mood derivation, decay rates, edge cases, personality evolution.
 * Aligned with docs/state-machine-spec.md acceptance criteria.
 */

import { describe, it, expect } from 'vitest';
import { petReducer, deriveMood, applyDecay, derivePersonality } from './pet-reducer';
import { DEFAULT_PET_STATE, PetState } from '../shared/types';

function makeState(overrides: Partial<PetState> = {}): PetState {
  return { ...DEFAULT_PET_STATE, ...overrides };
}

describe('petReducer — purity', () => {
  it('returns new state (does not mutate input)', () => {
    const state = makeState();
    const result = petReducer(state, { type: 'FEED', amount: 20 });
    expect(result).not.toBe(state);
  });

  it('same input → same output', () => {
    const state = makeState();
    const a = petReducer(state, { type: 'FEED', amount: 20 });
    const b = petReducer(state, { type: 'FEED', amount: 20 });
    expect(a).toEqual(b);
  });
});

describe('FEED', () => {
  it('increases hunger by amount', () => {
    const result = petReducer(makeState({ hunger: 50 }), { type: 'FEED', amount: 20 });
    expect(result.hunger).toBe(70);
  });

  it('caps hunger at 100', () => {
    const result = petReducer(makeState({ hunger: 90 }), { type: 'FEED', amount: 20 });
    expect(result.hunger).toBe(100);
  });

  it('increases happiness by 5', () => {
    const result = petReducer(makeState({ happiness: 50 }), { type: 'FEED', amount: 10 });
    expect(result.happiness).toBe(55);
  });

  it('does not produce negative values', () => {
    const result = petReducer(makeState({ hunger: 0 }), { type: 'FEED', amount: 0 });
    expect(result.hunger).toBe(0);
    expect(result.happiness).toBeGreaterThanOrEqual(0);
  });
});

describe('PLAY', () => {
  it('increases happiness by intensity', () => {
    const result = petReducer(makeState({ happiness: 50 }), { type: 'PLAY', intensity: 15 });
    expect(result.happiness).toBe(65);
  });

  it('decreases energy by 10', () => {
    const result = petReducer(makeState({ energy: 50 }), { type: 'PLAY', intensity: 10 });
    expect(result.energy).toBe(40);
  });
});

describe('CLEAN', () => {
  it('sets cleanliness to 100', () => {
    const result = petReducer(makeState({ cleanliness: 30 }), { type: 'CLEAN' });
    expect(result.cleanliness).toBe(100);
  });

  it('increases happiness by 5', () => {
    const result = petReducer(makeState({ happiness: 50 }), { type: 'CLEAN' });
    expect(result.happiness).toBe(55);
  });
});

describe('SLEEP', () => {
  it('sets mood to sleeping', () => {
    const result = petReducer(makeState({ mood: 'happy' }), { type: 'SLEEP' });
    expect(result.mood).toBe('sleeping');
  });
});

describe('TICK — decay rates', () => {
  it('decays hunger at 3/min when awake', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 100 }), 60_000);
    expect(result.hunger).toBe(97);
  });

  it('decays happiness at 2/min when awake', () => {
    const result = applyDecay(makeState({ mood: 'happy', happiness: 100 }), 60_000);
    expect(result.happiness).toBe(98);
  });

  it('recovers energy at 5/min when sleeping', () => {
    const result = applyDecay(makeState({ mood: 'sleeping', energy: 50 }), 60_000);
    expect(result.energy).toBe(55);
  });

  it('caps delta at 60 seconds', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 100 }), 120_000);
    // Should be same as 60s tick, not 120s
    expect(result.hunger).toBe(97);
  });

  it('does not go below 0', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 2 }), 60_000);
    expect(result.hunger).toBe(0);
  });

  it('does not change on 0 delta', () => {
    const state = makeState({ mood: 'happy', hunger: 50 });
    const result = applyDecay(state, 0);
    expect(result.hunger).toBe(50);
  });
});

describe('LOAD', () => {
  it('restores state from valid JSON', () => {
    const saved = JSON.stringify(makeState({ mood: 'sad', hunger: 30 }));
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: saved });
    expect(result.hunger).toBe(30);
  });

  it('falls back to defaults on corrupt JSON', () => {
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: 'not json' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });

  it('falls back to defaults on missing needs', () => {
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: '{"mood":"happy"}' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });
});

describe('RESET', () => {
  it('resets to default state', () => {
    const modified = makeState({ hunger: 0, happiness: 0, cleanliness: 0, energy: 0 });
    const result = petReducer(modified, { type: 'RESET' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
    expect(result.happiness).toBe(DEFAULT_PET_STATE.happiness);
  });
});

describe('deriveMood — priority order', () => {
  it('sick: cleanliness < 20 (highest priority)', () => {
    expect(deriveMood({ cleanliness: 10, energy: 100, hunger: 100, happiness: 100 })).toBe('sick');
  });

  it('sleeping: energy < 10 (2nd highest)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 5, hunger: 100, happiness: 100 })).toBe('sleeping');
  });

  it('angry: happiness < 10', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 5 })).toBe('angry');
  });

  it('angry: hunger < 20 AND energy < 20', () => {
    expect(deriveMood({ cleanliness: 100, energy: 10, hunger: 10, happiness: 50 })).toBe('angry');
  });

  it('hungry: hunger < 20', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 15, happiness: 50 })).toBe('hungry');
  });

  it('sad: happiness < 20', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 50, happiness: 15 })).toBe('sad');
  });

  it('excited: happiness >= 90 AND energy >= 50', () => {
    expect(deriveMood({ cleanliness: 100, energy: 60, hunger: 100, happiness: 95 })).toBe('excited');
  });

  it('happy: happiness >= 70', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 75 })).toBe('happy');
  });

  it('bored: happiness < 50 AND hunger >= 20', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 50, happiness: 40 })).toBe('bored');
  });

  it('neutral: default when no condition matches', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 60 })).toBe('neutral');
  });
});

describe('personality evolution', () => {
  it('FEED increases spoiled axis', () => {
    const result = petReducer(makeState(), { type: 'FEED', amount: 20 });
    expect(result.personalityAxes.spoiled).toBe(2);
  });

  it('PLAY increases energetic axis', () => {
    const result = petReducer(makeState(), { type: 'PLAY', intensity: 15 });
    expect(result.personalityAxes.energetic).toBe(2);
  });

  it('CLEAN increases social axis', () => {
    const result = petReducer(makeState(), { type: 'CLEAN' });
    expect(result.personalityAxes.social).toBe(2);
  });

  it('axes clamp to [-100, 100]', () => {
    let state = makeState();
    for (let i = 0; i < 100; i++) {
      state = petReducer(state, { type: 'FEED', amount: 20 });
    }
    expect(state.personalityAxes.spoiled).toBeLessThanOrEqual(100);
  });
});
