/**
 * @module tests/unit/lifecycle-manager.test.ts
 * Unit tests for LifecycleManager.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { LifecycleManager, DEFAULT_LIFECYCLE_CONFIG, CatchUpResult } from '../../src/main/lifecycle-manager';
import { PetState } from '../../src/shared/types';

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
    close: vi.fn(),
    isVisible: vi.fn().mockReturnValue(true),
  })),
  app: {
    on: vi.fn(),
  },
  powerMonitor: {
    on: vi.fn(),
  },
}));

describe('LifecycleManager', () => {
  let manager: LifecycleManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new LifecycleManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    test('has correct default config', () => {
      expect(DEFAULT_LIFECYCLE_CONFIG.catchUpEnabled).toBe(true);
      expect(DEFAULT_LIFECYCLE_CONFIG.maxCatchUpHours).toBe(24);
      expect(DEFAULT_LIFECYCLE_CONFIG.closeToTray).toBe(true);
      expect(DEFAULT_LIFECYCLE_CONFIG.minimizeToTray).toBe(true);
    });

    test('starts with current time as last active', () => {
      const now = Date.now();
      expect(manager.getLastActiveTime()).toBeGreaterThanOrEqual(now);
    });
  });

  describe('catch-up computation', () => {
    test('returns null when catch-up disabled', () => {
      const disabled = new LifecycleManager({ catchUpEnabled: false });
      const state = createPetState();
      expect(disabled.computeCatchUp(state)).toBeNull();
    });

    test('returns no changes for short elapsed time', () => {
      const state = createPetState();
      const result = manager.computeCatchUp(state);
      expect(result).not.toBeNull();
      expect(result!.hungerChange).toBe(0);
      expect(result!.happinessChange).toBe(0);
    });

    test('applies decay after 1 hour', () => {
      const state = createPetState();
      vi.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      const result = manager.computeCatchUp(state);

      expect(result).not.toBeNull();
      expect(result!.elapsedHours).toBeCloseTo(1, 0);
      expect(state.hunger).toBeLessThan(100);
      expect(state.happiness).toBeLessThan(100);
    });

    test('caps elapsed time at maxCatchUpHours', () => {
      const state = createPetState();
      vi.advanceTimersByTime(48 * 60 * 60 * 1000); // 48 hours
      const result = manager.computeCatchUp(state);

      expect(result).not.toBeNull();
      expect(result!.elapsedHours).toBeLessThanOrEqual(DEFAULT_LIFECYCLE_CONFIG.maxCatchUpHours);
    });

    test('updates last active time after catch-up', () => {
      const state = createPetState();
      vi.advanceTimersByTime(60 * 60 * 1000);
      manager.computeCatchUp(state);
      expect(manager.getElapsedMs()).toBeLessThan(1000);
    });

    test('detects mood changes', () => {
      const state = createPetState();
      state.hunger = 30;
      state.happiness = 30;
      state.energy = 30;
      state.cleanliness = 30;

      vi.advanceTimersByTime(60 * 60 * 1000);
      const result = manager.computeCatchUp(state);

      expect(result).not.toBeNull();
      expect(result!.moodChanged).toBe(true);
    });

    test('clamps values to 0-100 range', () => {
      const state = createPetState();
      state.hunger = 5;
      state.happiness = 5;
      state.energy = 5;
      state.cleanliness = 5;

      vi.advanceTimersByTime(60 * 60 * 1000);
      manager.computeCatchUp(state);

      expect(state.hunger).toBeGreaterThanOrEqual(0);
      expect(state.happiness).toBeGreaterThanOrEqual(0);
      expect(state.energy).toBeGreaterThanOrEqual(0);
      expect(state.cleanliness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('shutdown handling', () => {
    test('marks shutting down state', () => {
      manager.markShuttingDown();
      // No error thrown
    });

    test('setup shutdown handling without error', () => {
      manager.setupShutdownHandling();
      // No error thrown
    });
  });

  describe('toJSON/fromJSON', () => {
    test('serializes and restores', () => {
      const json = manager.toJSON();
      const restored = LifecycleManager.fromJSON(json);
      expect(restored.getLastActiveTime()).toBe(manager.getLastActiveTime());
    });
  });

  describe('active time tracking', () => {
    test('updates active time', () => {
      const before = manager.getLastActiveTime();
      vi.advanceTimersByTime(5000);
      manager.updateActiveTime();
      expect(manager.getLastActiveTime()).toBeGreaterThanOrEqual(before + 5000);
    });
  });
});

function createPetState(): PetState {
  return {
    hunger: 100,
    happiness: 100,
    energy: 100,
    cleanliness: 100,
    mood: 'happy',
  } as PetState;
}
