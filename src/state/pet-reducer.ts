/**
 * @module state/pet-reducer
 * Pure reducer function for pet state transitions.
 * Aligned with docs/state-machine-spec.md — no side effects, fully deterministic.
 *
 * Signature: (state, action) -> state
 * No timers, no I/O — just pure state transformation.
 */

import {
  PetState,
  DEFAULT_PET_STATE,
  Mood,
  MOOD_PRIORITY,
  DECAY_RATES,
  PERSONALITY_WEIGHTS,
  Needs,
} from '../shared/types';

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

export type PetAction =
  | { type: 'FEED'; amount: number }
  | { type: 'PLAY'; intensity: number }
  | { type: 'CLEAN' }
  | { type: 'SLEEP' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'LOAD'; saveData: string }
  | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Pure reducer
// ---------------------------------------------------------------------------

export function petReducer(state: PetState, action: PetAction): PetState {
  switch (action.type) {
    case 'FEED':
      return {
        ...state,
        hunger: clamp(state.hunger + action.amount),
        happiness: clamp(state.happiness + 5),
        lastTick: state.lastTick + 1, // monotonic increment
        personalityAxes: adjustPersonality(state.personalityAxes, 'FEED'),
      };

    case 'PLAY':
      return {
        ...state,
        happiness: clamp(state.happiness + action.intensity),
        energy: clamp(state.energy - 10),
        playTime: state.playTime + 60_000, // count play as 1 min awake
        lastTick: state.lastTick + 1,
        personalityAxes: adjustPersonality(state.personalityAxes, 'PLAY'),
      };

    case 'CLEAN':
      return {
        ...state,
        cleanliness: 100,
        happiness: clamp(state.happiness + 5),
        lastTick: state.lastTick + 1,
        personalityAxes: adjustPersonality(state.personalityAxes, 'CLEAN'),
      };

    case 'SLEEP':
      return {
        ...state,
        mood: 'sleeping',
        lastTick: state.lastTick + 1,
      };

    case 'TICK':
      return applyDecay(state, action.deltaMs);

    case 'LOAD': {
      try {
        const parsed = JSON.parse(action.saveData) as PetState;
        // Validate shape — must have all needs
        if (
          typeof parsed.hunger !== 'number' ||
          typeof parsed.happiness !== 'number' ||
          typeof parsed.cleanliness !== 'number' ||
          typeof parsed.energy !== 'number'
        ) {
          return { ...DEFAULT_PET_STATE, createdAt: Date.now(), lastTick: 0 };
        }
        return {
          ...parsed,
          mood: deriveMood(parsed),
          isAlive: true,
          personalityAxes: parsed.personalityAxes ?? { ...DEFAULT_PET_STATE.personalityAxes },
        };
      } catch {
        return { ...DEFAULT_PET_STATE, createdAt: Date.now(), lastTick: 0 };
      }
    }

    case 'RESET':
      return {
        ...DEFAULT_PET_STATE,
        createdAt: Date.now(),
        lastTick: 0,
        personalityAxes: { ...DEFAULT_PET_STATE.personalityAxes },
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Decay (pure function of state + delta)
// ---------------------------------------------------------------------------

const MAX_DELTA_MS = 60_000; // cap at 60 seconds per tick

export function applyDecay(state: PetState, deltaMs: number): PetState {
  const cappedDelta = Math.min(Math.max(deltaMs, 0), MAX_DELTA_MS);
  const minutes = cappedDelta / 60_000;
  const isSleeping = state.mood === 'sleeping';
  const rates = isSleeping ? DECAY_RATES.sleeping : DECAY_RATES.awake;

  const newNeeds: Needs = {
    hunger: clamp(state.hunger + rates.hunger * minutes),
    happiness: clamp(state.happiness + rates.happiness * minutes),
    cleanliness: clamp(state.cleanliness + rates.cleanliness * minutes),
    energy: clamp(state.energy + rates.energy * minutes),
  };

  const newMood = deriveMood({
    ...state,
    needs: newNeeds,
    energy: newNeeds.energy,
    hunger: newNeeds.hunger,
    happiness: newNeeds.happiness,
    cleanliness: newNeeds.cleanliness,
  });

  return {
    ...state,
    ...newNeeds,
    mood: newMood,
    lastTick: state.lastTick + cappedDelta,
    playTime: isSleeping ? state.playTime : state.playTime + cappedDelta,
    isAlive: true, // pet cannot die from neglect (UX research)
  };
}

// ---------------------------------------------------------------------------
// Mood derivation (pure function of needs, priority-ordered)
// ---------------------------------------------------------------------------

export function deriveMood(state: Pick<PetState, 'hunger' | 'happiness' | 'cleanliness' | 'energy'>): Mood {
  // Priority order (first match wins):
  // sick → sleeping → angry → hungry → sad → excited → happy → bored → neutral

  if (state.cleanliness < 20) return 'sick';
  if (state.energy < 10) return 'sleeping';
  if (state.happiness < 10 || (state.hunger < 20 && state.energy < 20)) return 'angry';
  if (state.hunger < 20) return 'hungry';
  if (state.happiness < 20) return 'sad';
  if (state.happiness >= 90 && state.energy >= 50) return 'excited';
  if (state.happiness >= 70) return 'happy';
  if (state.happiness < 50 && state.hunger >= 20) return 'bored';

  return 'neutral';
}

// ---------------------------------------------------------------------------
// Personality derivation (pure function of action history)
// ---------------------------------------------------------------------------

export function derivePersonality(state: PetState): PetState['personalityAxes'] {
  // Current personalityAxes already accumulates via adjustPersonality on each action
  return {
    spoiled: clampAxis(state.personalityAxes.spoiled),
    energetic: clampAxis(state.personalityAxes.energetic),
    social: clampAxis(state.personalityAxes.social),
  };
}

function adjustPersonality(
  axes: PetState['personalityAxes'],
  actionType: 'FEED' | 'PLAY' | 'CLEAN'
): PetState['personalityAxes'] {
  const weights = PERSONALITY_WEIGHTS[actionType];
  return {
    spoiled: clampAxis(axes.spoiled + weights.spoiled),
    energetic: clampAxis(axes.energetic + weights.energetic),
    social: clampAxis(axes.social + weights.social),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function clampAxis(value: number): number {
  return Math.min(100, Math.max(-100, value));
}
