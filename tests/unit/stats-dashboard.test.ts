/**
 * @module tests/unit/stats-dashboard.test.ts
 * Unit tests for StatsDashboard.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { StatsDashboard, DEFAULT_STATS_SUMMARY } from '../../src/main/stats-dashboard';
import { PetState, DEFAULT_PET_STATE } from '../../src/shared/types';

const createPetState = (overrides: Partial<PetState> = {}): PetState => ({
  ...DEFAULT_PET_STATE,
  ...overrides,
});

describe('StatsDashboard', () => {
  let dashboard: StatsDashboard;

  beforeEach(() => {
    dashboard = new StatsDashboard({ snapshotInterval: 0 });
  });

  describe('initialization', () => {
    test('starts with no snapshots', () => {
      expect(dashboard.getSnapshotCount()).toBe(0);
      expect(dashboard.getSnapshots()).toHaveLength(0);
    });

    test('starts with no interactions', () => {
      expect(dashboard.getInteractionCount()).toBe(0);
      expect(dashboard.getInteractions()).toHaveLength(0);
    });
  });

  describe('recordSnapshot', () => {
    test('records a snapshot', () => {
      const state = createPetState({ hunger: 80, happiness: 90 });
      const snapshot = dashboard.recordSnapshot(state, true);
      expect(snapshot).not.toBeNull();
      expect(dashboard.getSnapshotCount()).toBe(1);
    });

    test('respects snapshot interval', () => {
      const dashboard = new StatsDashboard({ snapshotInterval: 10000 });
      const state = createPetState();
      dashboard.recordSnapshot(state, false);
      const second = dashboard.recordSnapshot(state, false);
      expect(second).toBeNull();
    });

    test('force bypasses interval', () => {
      const dashboard = new StatsDashboard({ snapshotInterval: 10000 });
      const state = createPetState();
      dashboard.recordSnapshot(state, true);
      const second = dashboard.recordSnapshot(state, true);
      expect(second).not.toBeNull();
      expect(dashboard.getSnapshotCount()).toBe(2);
    });

    test('trims old snapshots when over max', () => {
      const dashboard = new StatsDashboard({ maxSnapshots: 3, snapshotInterval: 0 });
      for (let i = 0; i < 5; i++) {
        dashboard.recordSnapshot(createPetState({ hunger: i * 10 }), true);
      }
      expect(dashboard.getSnapshotCount()).toBe(3);
    });
  });

  describe('recordInteraction', () => {
    test('records a feed interaction', () => {
      const record = dashboard.recordInteraction('feed', 20);
      expect(record.type).toBe('feed');
      expect(record.value).toBe(20);
      expect(dashboard.getInteractionCount()).toBe(1);
    });

    test('records a play interaction', () => {
      dashboard.recordInteraction('play', 15);
      const playInteractions = dashboard.getInteractionsByType('play');
      expect(playInteractions).toHaveLength(1);
    });

    test('records a clean interaction', () => {
      dashboard.recordInteraction('clean', 25);
      const cleanInteractions = dashboard.getInteractionsByType('clean');
      expect(cleanInteractions).toHaveLength(1);
    });

    test('trims old interactions when over max', () => {
      const dashboard = new StatsDashboard({ maxInteractions: 3 });
      for (let i = 0; i < 5; i++) {
        dashboard.recordInteraction('feed', i);
      }
      expect(dashboard.getInteractionCount()).toBe(3);
    });
  });

  describe('getSnapshotsInRange', () => {
    test('returns snapshots within range', () => {
      const now = Date.now();
      dashboard.recordSnapshot(createPetState(), true);
      const snapshots = dashboard.getSnapshotsInRange(now - 1000, now + 1000);
      expect(snapshots).toHaveLength(1);
    });

    test('returns empty for out-of-range', () => {
      dashboard.recordSnapshot(createPetState(), true);
      const snapshots = dashboard.getSnapshotsInRange(0, 100);
      expect(snapshots).toHaveLength(0);
    });
  });

  describe('getRecentSnapshots', () => {
    test('returns last N snapshots', () => {
      for (let i = 0; i < 5; i++) {
        dashboard.recordSnapshot(createPetState({ hunger: i * 10 }), true);
      }
      const recent = dashboard.getRecentSnapshots(3);
      expect(recent).toHaveLength(3);
    });

    test('returns all if count exceeds total', () => {
      dashboard.recordSnapshot(createPetState(), true);
      const recent = dashboard.getRecentSnapshots(10);
      expect(recent).toHaveLength(1);
    });
  });

  describe('computeSummary', () => {
    test('returns default summary when no snapshots', () => {
      const summary = dashboard.computeSummary();
      expect(summary.averageHunger).toBe(100);
      expect(summary.averageHappiness).toBe(100);
      expect(summary.totalFeedings).toBe(0);
    });

    test('computes averages correctly', () => {
      dashboard.recordSnapshot(createPetState({ hunger: 80, happiness: 70 }), true);
      dashboard.recordSnapshot(createPetState({ hunger: 60, happiness: 50 }), true);

      const summary = dashboard.computeSummary();
      expect(summary.averageHunger).toBe(70);
      expect(summary.averageHappiness).toBe(60);
    });

    test('computes mood distribution', () => {
      dashboard.recordSnapshot(createPetState({ mood: 'happy' }), true);
      dashboard.recordSnapshot(createPetState({ mood: 'happy' }), true);
      dashboard.recordSnapshot(createPetState({ mood: 'sad' }), true);

      const summary = dashboard.computeSummary();
      expect(summary.moodDistribution.happy).toBe(67);
      expect(summary.moodDistribution.sad).toBe(33);
    });

    test('counts interactions by type', () => {
      dashboard.recordInteraction('feed', 10);
      dashboard.recordInteraction('feed', 20);
      dashboard.recordInteraction('play', 15);
      dashboard.recordInteraction('clean', 25);

      const summary = dashboard.computeSummary();
      expect(summary.totalFeedings).toBe(2);
      expect(summary.totalPlaySessions).toBe(1);
      expect(summary.totalCleanings).toBe(1);
    });
  });

  describe('getNeedTrend', () => {
    test('returns trend for hunger', () => {
      dashboard.recordSnapshot(createPetState({ hunger: 100 }), true);
      dashboard.recordSnapshot(createPetState({ hunger: 90 }), true);
      dashboard.recordSnapshot(createPetState({ hunger: 80 }), true);

      const trend = dashboard.getNeedTrend('hunger', 3);
      expect(trend).toEqual([100, 90, 80]);
    });

    test('returns trend for happiness', () => {
      dashboard.recordSnapshot(createPetState({ happiness: 50 }), true);
      dashboard.recordSnapshot(createPetState({ happiness: 60 }), true);

      const trend = dashboard.getNeedTrend('happiness', 2);
      expect(trend).toEqual([50, 60]);
    });
  });

  describe('getLatestSnapshot', () => {
    test('returns null when no snapshots', () => {
      expect(dashboard.getLatestSnapshot()).toBeNull();
    });

    test('returns the latest snapshot', () => {
      dashboard.recordSnapshot(createPetState({ hunger: 100 }), true);
      dashboard.recordSnapshot(createPetState({ hunger: 50 }), true);

      const latest = dashboard.getLatestSnapshot();
      expect(latest?.hunger).toBe(50);
    });
  });

  describe('clear', () => {
    test('removes all snapshots and interactions', () => {
      dashboard.recordSnapshot(createPetState(), true);
      dashboard.recordInteraction('feed', 10);
      dashboard.clear();
      expect(dashboard.getSnapshotCount()).toBe(0);
      expect(dashboard.getInteractionCount()).toBe(0);
    });
  });

  describe('toJSON/fromJSON', () => {
    test('serializes and restores', () => {
      dashboard.recordSnapshot(createPetState({ hunger: 75 }), true);
      dashboard.recordInteraction('feed', 20);

      const json = dashboard.toJSON();
      const restored = StatsDashboard.fromJSON(json);

      expect(restored.getSnapshotCount()).toBe(1);
      expect(restored.getInteractionCount()).toBe(1);
    });

    test('handles null data', () => {
      const restored = StatsDashboard.fromJSON(null);
      expect(restored.getSnapshotCount()).toBe(0);
    });
  });

  describe('default summary', () => {
    test('has correct defaults', () => {
      expect(DEFAULT_STATS_SUMMARY.totalPlayTime).toBe(0);
      expect(DEFAULT_STATS_SUMMARY.averageHunger).toBe(100);
      expect(DEFAULT_STATS_SUMMARY.averageHappiness).toBe(100);
      expect(DEFAULT_STATS_SUMMARY.totalFeedings).toBe(0);
    });
  });
});
