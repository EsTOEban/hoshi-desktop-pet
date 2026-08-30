/**
 * @module shared/types
 * Core TypeScript interfaces used by both main and renderer processes.
 * Aligned with docs/state-machine-spec.md v1.0.
 */

export type Mood =
  | 'happy'
  | 'sad'
  | 'sick'
  | 'hungry'
  | 'angry'
  | 'sleeping'
  | 'excited'
  | 'bored'
  | 'neutral';

export interface Needs {
  hunger: number;      // 0-100, 100 = full
  happiness: number;   // 0-100, 100 = ecstatic
  cleanliness: number; // 0-100, 100 = pristine
  energy: number;      // 0-100, 100 = rested
}

export interface PersonalityAxes {
  spoiled: number;     // -100 (neglected) ↔ 100 (spoiled)
  energetic: number;   // -100 (lazy) ↔ 100 (energetic)
  social: number;      // -100 (independent) ↔ 100 (social)
}

export interface PetState {
  // Needs (0-100, higher = better)
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;

  // Derived (computed, not stored — used for rendering cache)
  mood: Mood;
  isAlive: boolean;
  personalityAxes: PersonalityAxes;

  // Metadata
  lastTick: number;    // monotonic timestamp (ms)
  createdAt: number;
  playTime: number;    // total awake time (ms)
}

export const DEFAULT_PET_STATE: PetState = {
  hunger: 100,
  happiness: 100,
  cleanliness: 100,
  energy: 100,
  mood: 'neutral',
  isAlive: true,
  personalityAxes: {
    spoiled: 0,
    energetic: 0,
    social: 0,
  },
  lastTick: 0,
  createdAt: 0,
  playTime: 0,
};

// Mood priority order (first match wins)
export const MOOD_PRIORITY: Mood[] = [
  'sick',
  'sleeping',
  'angry',
  'hungry',
  'sad',
  'excited',
  'happy',
  'bored',
  'neutral',
];

// Decay rates per minute
export const DECAY_RATES = {
  awake: {
    hunger: -3,
    happiness: -2,
    cleanliness: -1,
    energy: -2,
  },
  sleeping: {
    hunger: -1,
    happiness: -1,
    cleanliness: -0.5,
    energy: +5,
  },
} as const;

// Personality evolution system types
export type PersonalityType = 'spoiled' | 'neglected' | 'balanced' | 'spammed';

export interface CareTendencies {
  feedCount: number;
  playCount: number;
  cleanCount: number;
  totalInteractions: number;
  firstInteractionTime: number;
  lastInteractionTime: number;
  interactionFrequency: number; // interactions per hour
}

export interface PersonalityState {
  currentType: PersonalityType;
  tendencies: CareTendencies;
  confidence: number; // 0-1, how confident we are in the classification
  history: PersonalityType[]; // last N classifications for smoothing
}

export const DEFAULT_PERSONALITY_STATE: PersonalityState = {
  currentType: 'balanced',
  tendencies: {
    feedCount: 0,
    playCount: 0,
    cleanCount: 0,
    totalInteractions: 0,
    firstInteractionTime: 0,
    lastInteractionTime: 0,
    interactionFrequency: 0,
  },
  confidence: 0,
  history: [],
};

// Personality axis weights for reducer-based evolution
export const PERSONALITY_WEIGHTS = {
  FEED: { spoiled: +2, energetic: 0, social: 0 },
  PLAY: { spoiled: 0, energetic: +2, social: 0 },
  CLEAN: { spoiled: 0, energetic: 0, social: +2 },
} as const;
