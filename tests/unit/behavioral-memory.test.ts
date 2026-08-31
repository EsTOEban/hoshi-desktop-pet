/**
 * @module tests/unit/behavioral-memory.test.ts
 * Unit tests for BehavioralMemory.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { BehavioralMemory, DEFAULT_MEMORY_CONFIG, InteractionType } from '../../src/main/behavioral-memory';
import { PetState, DEFAULT_PET_STATE } from '../../src/shared/types';

const createPetState = (overrides: Partial<PetState> = {}): PetState => ({
  ...DEFAULT_PET_STATE,
  ...overrides,
});

describe('BehavioralMemory', () => {
  let memory: BehavioralMemory;

  beforeEach(() => {
    memory = new BehavioralMemory();
  });

  describe('initialization', () => {
    test('starts with no memories', () => {
      expect(memory.getMemoryCount()).toBe(0);
      expect(memory.getRecentMemories(10)).toHaveLength(0);
    });

    test('starts with no patterns', () => {
      expect(memory.getPatternCount()).toBe(0);
      expect(memory.getAllPatterns()).toHaveLength(0);
    });

    test('starts with no favorite activity', () => {
      expect(memory.getFavoriteActivity()).toBeNull();
      expect(memory.getLeastFavoriteActivity()).toBeNull();
    });
  });

  describe('recordInteraction', () => {
    test('records a feed interaction', () => {
      const state = createPetState({ hunger: 80 });
      const mem = memory.recordInteraction('feed', state, 0.8);
      expect(mem.type).toBe('feed');
      expect(mem.responseScore).toBe(0.8);
      expect(memory.getMemoryCount()).toBe(1);
    });

    test('records a play interaction', () => {
      memory.recordInteraction('play', createPetState(), 0.6);
      expect(memory.getMemoryCount()).toBe(1);
    });

    test('clamps response score to [-1, 1]', () => {
      const mem1 = memory.recordInteraction('feed', createPetState(), 2.0);
      expect(mem1.responseScore).toBe(1);
      const mem2 = memory.recordInteraction('feed', createPetState(), -2.0);
      expect(mem2.responseScore).toBe(-1);
    });

    test('trims old memories when over max', () => {
      const mem = new BehavioralMemory({ maxMemories: 3 });
      for (let i = 0; i < 5; i++) {
        mem.recordInteraction('feed', createPetState(), 0.5);
      }
      expect(mem.getMemoryCount()).toBe(3);
    });
  });

  describe('getPattern', () => {
    test('returns null for unknown type', () => {
      expect(memory.getPattern('feed')).toBeNull();
    });

    test('returns pattern after recording', () => {
      memory.recordInteraction('feed', createPetState(), 0.8);
      const pattern = memory.getPattern('feed');
      expect(pattern).not.toBeNull();
      expect(pattern?.type).toBe('feed');
      expect(pattern?.count).toBe(1);
    });
  });

  describe('predictResponse', () => {
    test('returns 0 for unknown type', () => {
      expect(memory.predictResponse('feed')).toBe(0);
    });

    test('returns average response for known type', () => {
      memory.recordInteraction('feed', createPetState(), 0.8);
      memory.recordInteraction('feed', createPetState(), 0.6);
      const predicted = memory.predictResponse('feed');
      expect(predicted).toBeGreaterThan(0);
      expect(predicted).toBeLessThanOrEqual(1);
    });
  });

  describe('favorite activities', () => {
    test('identifies favorite activity', () => {
      // Feed: high response
      for (let i = 0; i < 5; i++) {
        memory.recordInteraction('feed', createPetState(), 0.9);
      }
      // Play: low response
      for (let i = 0; i < 5; i++) {
        memory.recordInteraction('play', createPetState(), 0.2);
      }
      expect(memory.getFavoriteActivity()).toBe('feed');
    });

    test('identifies least favorite activity', () => {
      for (let i = 0; i < 5; i++) {
        memory.recordInteraction('feed', createPetState(), 0.9);
      }
      for (let i = 0; i < 5; i++) {
        memory.recordInteraction('play', createPetState(), 0.1);
      }
      expect(memory.getLeastFavoriteActivity()).toBe('play');
    });
  });

  describe('remembers', () => {
    test('returns false for unknown type', () => {
      expect(memory.remembers('feed')).toBe(false);
    });

    test('returns false with only 1 memory', () => {
      memory.recordInteraction('feed', createPetState(), 0.8);
      expect(memory.remembers('feed')).toBe(false);
    });

    test('returns true with 2+ memories', () => {
      memory.recordInteraction('feed', createPetState(), 0.8);
      memory.recordInteraction('feed', createPetState(), 0.6);
      expect(memory.remembers('feed')).toBe(true);
    });
  });

  describe('getMemoriesByType', () => {
    test('returns only memories of specified type', () => {
      memory.recordInteraction('feed', createPetState(), 0.8);
      memory.recordInteraction('play', createPetState(), 0.6);
      memory.recordInteraction('feed', createPetState(), 0.7);
      const feedMemories = memory.getMemoriesByType('feed');
      expect(feedMemories).toHaveLength(2);
    });
  });

  describe('getRecentMemories', () => {
    test('returns last N memories', () => {
      for (let i = 0; i < 5; i++) {
        memory.recordInteraction('feed', createPetState(), 0.5);
      }
      const recent = memory.getRecentMemories(3);
      expect(recent).toHaveLength(3);
    });

    test('returns all if count exceeds total', () => {
      memory.recordInteraction('feed', createPetState(), 0.5);
      const recent = memory.getRecentMemories(10);
      expect(recent).toHaveLength(1);
    });
  });

  describe('applyDecay', () => {
    test('reduces response scores over time', () => {
      const mem = new BehavioralMemory({ decayRate: 0.5 });
      mem.recordInteraction('feed', createPetState(), 1.0);
      const before = mem.predictResponse('feed');
      mem.applyDecay();
      const after = mem.predictResponse('feed');
      expect(after).toBeLessThanOrEqual(before);
    });
  });

  describe('clear', () => {
    test('removes all memories and patterns', () => {
      memory.recordInteraction('feed', createPetState(), 0.8);
      memory.recordInteraction('play', createPetState(), 0.6);
      memory.clear();
      expect(memory.getMemoryCount()).toBe(0);
      expect(memory.getPatternCount()).toBe(0);
      expect(memory.getFavoriteActivity()).toBeNull();
    });
  });

  describe('toJSON/fromJSON', () => {
    test('serializes and restores', () => {
      memory.recordInteraction('feed', createPetState(), 0.8);
      memory.recordInteraction('play', createPetState(), 0.6);

      const json = memory.toJSON();
      const restored = BehavioralMemory.fromJSON(json);

      expect(restored.getMemoryCount()).toBe(2);
      expect(restored.getPatternCount()).toBe(2);
    });

    test('handles null data', () => {
      const restored = BehavioralMemory.fromJSON(null);
      expect(restored.getMemoryCount()).toBe(0);
    });
  });

  describe('default config', () => {
    test('has correct defaults', () => {
      expect(DEFAULT_MEMORY_CONFIG.maxMemories).toBe(500);
      expect(DEFAULT_MEMORY_CONFIG.maxPatterns).toBe(50);
      expect(DEFAULT_MEMORY_CONFIG.decayRate).toBe(0.01);
      expect(DEFAULT_MEMORY_CONFIG.learningRate).toBe(0.3);
    });
  });
});
