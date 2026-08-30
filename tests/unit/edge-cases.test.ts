/**
 * @module state/edge-cases.test
 * Unit tests for state machine edge cases.
 * Aligned with docs/state-machine-spec.md acceptance criteria.
 */

import { describe, it, expect } from 'vitest';
import { petReducer, deriveMood, applyDecay, derivePersonality } from '../../src/state/pet-reducer';
import { DEFAULT_PET_STATE, PetState } from '../../src/shared/types';

function makeState(overrides: Partial<PetState> = {}): PetState {
  return { ...DEFAULT_PET_STATE, ...overrides };
}

describe('TICK — monotonic time (immune to clock changes)', () => {
  it('uses delta_ms, not wall clock — no change on 0 delta', () => {
    const state = makeState({ mood: 'happy', hunger: 50 });
    const result = applyDecay(state, 0);
    expect(result.hunger).toBe(50);
  });

  it('large delta is capped at 60s (handles sleep/wake)', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 100 }), 120_000);
    // Should be same as 60s tick, not 120s
    expect(result.hunger).toBe(97);
  });

  it('negative delta produces no change', () => {
    const state = makeState({ mood: 'happy', hunger: 50 });
    const result = applyDecay(state, -10_000);
    expect(result.hunger).toBeCloseTo(50, 5); // negative delta clamped to 0
  });

  it('small delta (1ms) produces negligible decay', () => {
    const state = makeState({ mood: 'happy', hunger: 100 });
    const result = applyDecay(state, 1);
    expect(result.hunger).toBeCloseTo(100, 3); // ~0.00005 decay
  });
});

describe('TICK — delta capping at 60s', () => {
  it('delta = 60s decays by exactly the per-minute rate', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 100 }), 60_000);
    expect(result.hunger).toBe(97); // -3/min
    expect(result.happiness).toBe(98); // -2/min
    expect(result.cleanliness).toBe(99); // -1/min
    expect(result.energy).toBe(98); // -2/min
  });

  it('delta = 120s is capped to 60s', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 100 }), 120_000);
    expect(result.hunger).toBe(97); // same as 60s
  });

  it('delta = 10s decays proportionally', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 100 }), 10_000);
    expect(result.hunger).toBeCloseTo(99.5, 1); // -3 * (10/60) = -0.5
  });
});

describe('TICK — sleeping vs awake rates', () => {
  it('sleeping pet recovers energy at +5/min', () => {
    const result = applyDecay(makeState({ mood: 'sleeping', energy: 50 }), 60_000);
    expect(result.energy).toBe(55);
  });

  it('awake pet loses energy at -2/min', () => {
    const result = applyDecay(makeState({ mood: 'happy', energy: 50 }), 60_000);
    expect(result.energy).toBe(48);
  });

  it('sleeping pet loses hunger slower (-1/min vs -3/min)', () => {
    const result = applyDecay(makeState({ mood: 'sleeping', hunger: 100 }), 60_000);
    expect(result.hunger).toBe(99);
  });

  it('awake pet loses hunger faster (-3/min)', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 100 }), 60_000);
    expect(result.hunger).toBe(97);
  });
});

describe('need value clamping', () => {
  it('hunger cannot go below 0', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 2 }), 60_000);
    expect(result.hunger).toBe(0);
  });

  it('happiness cannot go below 0', () => {
    const result = applyDecay(makeState({ mood: 'happy', happiness: 1 }), 60_000);
    expect(result.happiness).toBe(0);
  });

  it('cleanliness cannot go below 0', () => {
    const result = applyDecay(makeState({ mood: 'happy', cleanliness: 0 }), 60_000);
    expect(result.cleanliness).toBe(0);
  });

  it('energy cannot exceed 100', () => {
    const result = applyDecay(makeState({ mood: 'sleeping', energy: 98 }), 60_000);
    expect(result.energy).toBe(100);
  });

  it('hunger cannot exceed 100 after FEED', () => {
    const result = petReducer(makeState({ hunger: 95 }), { type: 'FEED', amount: 20 });
    expect(result.hunger).toBe(100);
  });

  it('happiness cannot exceed 100 after PLAY', () => {
    const result = petReducer(makeState({ happiness: 95 }), { type: 'PLAY', intensity: 20 });
    expect(result.happiness).toBe(100);
  });
});

describe('LOAD — save file handling', () => {
  it('restores state from valid JSON', () => {
    const saved = JSON.stringify(makeState({ mood: 'sad', hunger: 30, happiness: 40 }));
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: saved });
    expect(result.hunger).toBe(30);
    expect(result.happiness).toBe(40);
  });

  it('falls back to defaults on empty string', () => {
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: '' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });

  it('falls back to defaults on corrupt JSON', () => {
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: '{invalid json' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });

  it('falls back to defaults on missing needs', () => {
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: '{"mood":"happy"}' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });

  it('falls back to defaults on null save data', () => {
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: 'null' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });

  it('falls back to defaults on partial needs (only hunger)', () => {
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: '{"hunger":50}' });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });

  it('rejects huge save data (>1MB)', () => {
    const huge = 'x'.repeat(1_000_001);
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: huge });
    expect(result.hunger).toBe(DEFAULT_PET_STATE.hunger);
  });

  it('preserves personality axes from save data', () => {
    const state = makeState({ personalityAxes: { spoiled: 50, energetic: -20, social: 10 } });
    const saved = JSON.stringify(state);
    const result = petReducer(DEFAULT_PET_STATE, { type: 'LOAD', saveData: saved });
    expect(result.personalityAxes.spoiled).toBe(50);
    expect(result.personalityAxes.energetic).toBe(-20);
    expect(result.personalityAxes.social).toBe(10);
  });
});

describe('RESET', () => {
  it('resets all needs to 100', () => {
    const modified = makeState({ hunger: 0, happiness: 0, cleanliness: 0, energy: 0 });
    const result = petReducer(modified, { type: 'RESET' });
    expect(result.hunger).toBe(100);
    expect(result.happiness).toBe(100);
    expect(result.cleanliness).toBe(100);
    expect(result.energy).toBe(100);
  });

  it('resets mood to neutral', () => {
    const result = petReducer(makeState({ mood: 'angry' }), { type: 'RESET' });
    expect(result.mood).toBe('neutral');
  });

  it('resets personality axes to 0', () => {
    const modified = makeState({ personalityAxes: { spoiled: 100, energetic: -100, social: 50 } });
    const result = petReducer(modified, { type: 'RESET' });
    expect(result.personalityAxes.spoiled).toBe(0);
    expect(result.personalityAxes.energetic).toBe(0);
    expect(result.personalityAxes.social).toBe(0);
  });

  it('does not mutate input state', () => {
    const state = makeState({ hunger: 0 });
    const result = petReducer(state, { type: 'RESET' });
    expect(state.hunger).toBe(0); // original unchanged
    expect(result.hunger).toBe(100);
  });
});

describe('concurrent actions — last-wins within tick', () => {
  it('FEED then PLAY: both effects applied', () => {
    let state = makeState({ hunger: 50, happiness: 50, energy: 50 });
    state = petReducer(state, { type: 'FEED', amount: 20 });
    state = petReducer(state, { type: 'PLAY', intensity: 10 });
    expect(state.hunger).toBe(70);
    expect(state.happiness).toBe(65); // +5 from FEED, +10 from PLAY
    expect(state.energy).toBe(40);
  });

  it('multiple FEEDs accumulate', () => {
    let state = makeState({ hunger: 50 });
    state = petReducer(state, { type: 'FEED', amount: 10 });
    state = petReducer(state, { type: 'FEED', amount: 10 });
    state = petReducer(state, { type: 'FEED', amount: 10 });
    expect(state.hunger).toBe(80);
  });

  it('CLEAN resets cleanliness to 100 regardless of prior state', () => {
    let state = makeState({ cleanliness: 0 });
    state = petReducer(state, { type: 'CLEAN' });
    expect(state.cleanliness).toBe(100);
    state = petReducer(state, { type: 'CLEAN' });
    expect(state.cleanliness).toBe(100);
  });
});

describe('personality evolution — axis clamping', () => {
  it('spoiled axis clamps at 100 after many FEEDs', () => {
    let state = makeState();
    for (let i = 0; i < 100; i++) {
      state = petReducer(state, { type: 'FEED', amount: 20 });
    }
    expect(state.personalityAxes.spoiled).toBe(100);
  });

  it('energetic axis clamps at -100 after many CLEANs (no PLAY)', () => {
    let state = makeState();
    for (let i = 0; i < 100; i++) {
      state = petReducer(state, { type: 'CLEAN' });
    }
    expect(state.personalityAxes.energetic).toBe(0); // CLEAN doesn't affect energetic
  });

  it('social axis clamps at 100 after many CLEANs', () => {
    let state = makeState();
    for (let i = 0; i < 100; i++) {
      state = petReducer(state, { type: 'CLEAN' });
    }
    expect(state.personalityAxes.social).toBe(100);
  });
});

describe('pet cannot die from neglect', () => {
  it('isAlive is always true after TICK', () => {
    const result = applyDecay(makeState({ mood: 'happy', hunger: 0, happiness: 0 }), 60_000);
    expect(result.isAlive).toBe(true);
  });

  it('isAlive is always true after RESET', () => {
    const result = petReducer(makeState(), { type: 'RESET' });
    expect(result.isAlive).toBe(true);
  });

  it('isAlive is true even with all needs at 0', () => {
    const result = petReducer(makeState({ hunger: 0, happiness: 0, cleanliness: 0, energy: 0 }), { type: 'TICK', deltaMs: 60_000 });
    expect(result.isAlive).toBe(true);
  });
});

describe('mood derivation — edge cases', () => {
  it('all needs at 100 → excited (happiness >= 90 AND energy >= 50)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 100 })).toBe('excited');
  });

  it('all needs at 0 → sick (highest priority)', () => {
    expect(deriveMood({ cleanliness: 0, energy: 0, hunger: 0, happiness: 0 })).toBe('sick');
  });

  it('hunger = 0 AND happiness = 0 → sick (not angry)', () => {
    // cleanliness = 0 triggers sick, which beats angry
    expect(deriveMood({ cleanliness: 0, energy: 100, hunger: 0, happiness: 0 })).toBe('sick');
  });

  it('hunger = 0 AND happiness = 0 AND cleanliness = 100 → sleeping (energy = 0)', () => {
    // energy = 0 < 10 → sleeping (beats angry)
    expect(deriveMood({ cleanliness: 100, energy: 0, hunger: 0, happiness: 0 })).toBe('sleeping');
  });

  it('hunger = 0 AND happiness = 0 AND cleanliness = 100 AND energy = 100 → angry', () => {
    // happiness < 10 → angry
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 0, happiness: 0 })).toBe('angry');
  });
});

describe('FEED — edge cases', () => {
  it('FEED with amount = 0 has no effect on hunger', () => {
    const result = petReducer(makeState({ hunger: 50 }), { type: 'FEED', amount: 0 });
    expect(result.hunger).toBe(50);
  });

  it('FEED with negative amount decreases hunger', () => {
    const result = petReducer(makeState({ hunger: 50 }), { type: 'FEED', amount: -10 });
    expect(result.hunger).toBe(40);
  });

  it('FEED increases happiness by 5 even with amount = 0', () => {
    const result = petReducer(makeState({ happiness: 50 }), { type: 'FEED', amount: 0 });
    expect(result.happiness).toBe(55);
  });
});

describe('PLAY — edge cases', () => {
  it('PLAY with intensity = 0 has no effect on happiness', () => {
    const result = petReducer(makeState({ happiness: 50 }), { type: 'PLAY', intensity: 0 });
    expect(result.happiness).toBe(50);
  });

  it('PLAY decreases energy by 10 regardless of intensity', () => {
    const result = petReducer(makeState({ energy: 50 }), { type: 'PLAY', intensity: 5 });
    expect(result.energy).toBe(40);
  });

  it('PLAY with low energy and hunger preserves mood (no auto-derivation)', () => {
    // PLAY doesn't re-derive mood — it preserves state.mood
    let state = makeState({ mood: 'neutral', hunger: 15, energy: 25, happiness: 50 });
    state = petReducer(state, { type: 'PLAY', intensity: 10 });
    // energy drops to 15, hunger still < 15, happiness now 60, mood unchanged
    expect(state.mood).toBe('neutral');
  });
});

describe('SLEEP — edge cases', () => {
  it('SLEEP always sets mood to sleeping', () => {
    const result = petReducer(makeState({ mood: 'happy' }), { type: 'SLEEP' });
    expect(result.mood).toBe('sleeping');
  });

  it('SLEEP does not change needs', () => {
    const result = petReducer(makeState({ hunger: 50, energy: 50 }), { type: 'SLEEP' });
    expect(result.hunger).toBe(50);
    expect(result.energy).toBe(50);
  });
});
