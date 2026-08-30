/**
 * @module state/mood-derivation.test
 * Unit tests for mood derivation logic.
 * Aligned with docs/state-machine-spec.md acceptance criteria.
 */

import { describe, it, expect } from 'vitest';
import { deriveMood } from '../../src/state/pet-reducer';
import { Mood } from '../../src/shared/types';

describe('deriveMood — threshold boundaries', () => {
  it('happy: happiness = 70 (exact boundary)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 70 })).toBe('happy');
  });

  it('not happy: happiness = 69 (just below boundary)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 69 })).toBe('neutral');
  });

  it('excited: happiness = 90 AND energy = 50 (exact boundaries)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 50, hunger: 100, happiness: 90 })).toBe('excited');
  });

  it('not excited: happiness = 90 BUT energy = 49', () => {
    expect(deriveMood({ cleanliness: 100, energy: 49, hunger: 100, happiness: 90 })).toBe('happy');
  });

  it('hungry: hunger = 19 (just below threshold)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 19, happiness: 50 })).toBe('hungry');
  });

  it('not hungry: hunger = 20 (exact threshold)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 20, happiness: 50 })).toBe('neutral');
  });

  it('sick: cleanliness = 19 (just below threshold)', () => {
    expect(deriveMood({ cleanliness: 19, energy: 100, hunger: 100, happiness: 100 })).toBe('sick');
  });

  it('sleeping: energy = 9 (just below threshold)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 9, hunger: 100, happiness: 100 })).toBe('sleeping');
  });

  it('angry: happiness = 9 (just below threshold)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 9 })).toBe('angry');
  });

  it('sad: happiness = 19 (just below threshold)', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 50, happiness: 19 })).toBe('sad');
  });

  it('bored: happiness = 49 AND hunger >= 20', () => {
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 50, happiness: 49 })).toBe('bored');
  });
});

describe('deriveMood — priority ordering', () => {
  it('sick beats sleeping (sick has highest priority)', () => {
    // cleanliness < 20 AND energy < 10 → sick wins
    expect(deriveMood({ cleanliness: 10, energy: 5, hunger: 100, happiness: 100 })).toBe('sick');
  });

  it('sleeping beats angry', () => {
    // energy < 10 AND happiness < 10 → sleeping wins
    expect(deriveMood({ cleanliness: 100, energy: 5, hunger: 100, happiness: 5 })).toBe('sleeping');
  });

  it('angry beats hungry', () => {
    // happiness < 10 AND hunger < 20 → angry wins
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 10, happiness: 5 })).toBe('angry');
  });

  it('hungry beats sad', () => {
    // hunger < 20 AND happiness < 20 → hungry wins
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 10, happiness: 15 })).toBe('hungry');
  });

  it('sad beats excited', () => {
    // happiness < 20 (can't be excited) → sad wins
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 15 })).toBe('sad');
  });

  it('excited beats happy', () => {
    // happiness >= 90 AND energy >= 50 → excited (not just happy)
    expect(deriveMood({ cleanliness: 100, energy: 60, hunger: 100, happiness: 95 })).toBe('excited');
  });

  it('happy beats bored', () => {
    // happiness >= 70 → happy (not bored)
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 100, happiness: 80 })).toBe('happy');
  });

  it('bored beats neutral', () => {
    // happiness < 50 AND hunger >= 20 → bored (not neutral)
    expect(deriveMood({ cleanliness: 100, energy: 100, hunger: 50, happiness: 40 })).toBe('bored');
  });
});

describe('deriveMood — returns valid Mood enum', () => {
  const moods: Mood[] = ['happy', 'sad', 'sick', 'hungry', 'angry', 'sleeping', 'excited', 'bored', 'neutral'];

  it('always returns a valid Mood value', () => {
    for (let h = 0; h <= 100; h += 10) {
      for (let hap = 0; hap <= 100; hap += 10) {
        for (let c = 0; c <= 100; c += 25) {
          for (let e = 0; e <= 100; e += 25) {
            const mood = deriveMood({ cleanliness: c, energy: e, hunger: h, happiness: hap });
            expect(moods).toContain(mood);
          }
        }
      }
    }
  });
});
