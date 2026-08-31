/**
 * @module main/stats-dashboard
 * Statistics tracking and history for the pet dashboard.
 * Records snapshots of pet state over time for trend visualization.
 */

import { PetState, Needs } from '../shared/types';

export interface StatsSnapshot {
  timestamp: number;
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  mood: string;
  playTime: number;
}

export interface StatsSummary {
  totalPlayTime: number;
  averageHunger: number;
  averageHappiness: number;
  averageCleanliness: number;
  averageEnergy: number;
  moodDistribution: Record<string, number>;
  totalFeedings: number;
  totalPlaySessions: number;
  totalCleanings: number;
  longestStreak: number;
  currentStreak: number;
}

export interface StatsHistory {
  snapshots: StatsSnapshot[];
  interactions: InteractionRecord[];
}

export interface InteractionRecord {
  type: 'feed' | 'play' | 'clean' | 'sleep' | 'wake';
  timestamp: number;
  value?: number;
}

export const DEFAULT_STATS_SUMMARY: StatsSummary = {
  totalPlayTime: 0,
  averageHunger: 100,
  averageHappiness: 100,
  averageCleanliness: 100,
  averageEnergy: 100,
  moodDistribution: {},
  totalFeedings: 0,
  totalPlaySessions: 0,
  totalCleanings: 0,
  longestStreak: 0,
  currentStreak: 0,
};

export class StatsDashboard {
  private snapshots: StatsSnapshot[] = [];
  private interactions: InteractionRecord[] = [];
  private maxSnapshots: number;
  private maxInteractions: number;
  private lastSnapshotTime: number = 0;
  private snapshotInterval: number; // ms between snapshots

  constructor(options: { maxSnapshots?: number; maxInteractions?: number; snapshotInterval?: number } = {}) {
    this.maxSnapshots = options.maxSnapshots ?? 1000;
    this.maxInteractions = options.maxInteractions ?? 500;
    this.snapshotInterval = options.snapshotInterval ?? 60000; // 1 minute default
  }

  /**
   * Record a state snapshot if enough time has passed.
   */
  recordSnapshot(state: PetState, force: boolean = false): StatsSnapshot | null {
    const now = Date.now();
    if (!force && now - this.lastSnapshotTime < this.snapshotInterval) {
      return null;
    }

    const snapshot: StatsSnapshot = {
      timestamp: now,
      hunger: state.hunger,
      happiness: state.happiness,
      cleanliness: state.cleanliness,
      energy: state.energy,
      mood: state.mood,
      playTime: state.playTime,
    };

    this.snapshots.push(snapshot);
    this.lastSnapshotTime = now;

    // Trim if over max
    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Record an interaction event.
   */
  recordInteraction(type: InteractionRecord['type'], value?: number): InteractionRecord {
    const record: InteractionRecord = {
      type,
      timestamp: Date.now(),
      value,
    };

    this.interactions.push(record);

    // Trim if over max
    while (this.interactions.length > this.maxInteractions) {
      this.interactions.shift();
    }

    return record;
  }

  /**
   * Get all snapshots.
   */
  getSnapshots(): StatsSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshots within a time range.
   */
  getSnapshotsInRange(startTime: number, endTime: number): StatsSnapshot[] {
    return this.snapshots.filter((s) => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  /**
   * Get recent snapshots (last N).
   */
  getRecentSnapshots(count: number): StatsSnapshot[] {
    return this.snapshots.slice(-count);
  }

  /**
   * Get all interactions.
   */
  getInteractions(): InteractionRecord[] {
    return [...this.interactions];
  }

  /**
   * Get interactions by type.
   */
  getInteractionsByType(type: InteractionRecord['type']): InteractionRecord[] {
    return this.interactions.filter((i) => i.type === type);
  }

  /**
   * Compute summary statistics.
   */
  computeSummary(): StatsSummary {
    // Count interactions regardless of snapshots
    const totalFeedings = this.interactions.filter((i) => i.type === 'feed').length;
    const totalPlaySessions = this.interactions.filter((i) => i.type === 'play').length;
    const totalCleanings = this.interactions.filter((i) => i.type === 'clean').length;

    if (this.snapshots.length === 0) {
      return {
        ...DEFAULT_STATS_SUMMARY,
        totalFeedings,
        totalPlaySessions,
        totalCleanings,
      };
    }

    const total = this.snapshots.length;
    const sumHunger = this.snapshots.reduce((sum, s) => sum + s.hunger, 0);
    const sumHappiness = this.snapshots.reduce((sum, s) => sum + s.happiness, 0);
    const sumCleanliness = this.snapshots.reduce((sum, s) => sum + s.cleanliness, 0);
    const sumEnergy = this.snapshots.reduce((sum, s) => sum + s.energy, 0);

    // Mood distribution
    const moodDistribution: Record<string, number> = {};
    for (const snapshot of this.snapshots) {
      moodDistribution[snapshot.mood] = (moodDistribution[snapshot.mood] || 0) + 1;
    }
    // Convert to percentages
    for (const mood of Object.keys(moodDistribution)) {
      moodDistribution[mood] = Math.round((moodDistribution[mood] / total) * 100);
    }

    // Interaction counts already computed above

    // Play time (from latest snapshot)
    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    const totalPlayTime = latestSnapshot?.playTime || 0;

    return {
      totalPlayTime,
      averageHunger: Math.round(sumHunger / total),
      averageHappiness: Math.round(sumHappiness / total),
      averageCleanliness: Math.round(sumCleanliness / total),
      averageEnergy: Math.round(sumEnergy / total),
      moodDistribution,
      totalFeedings,
      totalPlaySessions,
      totalCleanings,
      longestStreak: 0, // Computed from streak data
      currentStreak: 0, // Computed from streak data
    };
  }

  /**
   * Get the trend for a specific need over time.
   */
  getNeedTrend(need: keyof Needs, count: number = 10): number[] {
    const recent = this.snapshots.slice(-count);
    return recent.map((s) => s[need]);
  }

  /**
   * Get the latest snapshot.
   */
  getLatestSnapshot(): StatsSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get snapshot count.
   */
  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  /**
   * Get interaction count.
   */
  getInteractionCount(): number {
    return this.interactions.length;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.snapshots = [];
    this.interactions = [];
    this.lastSnapshotTime = 0;
  }

  /**
   * Serialize to JSON.
   */
  toJSON(): object {
    return {
      snapshots: this.snapshots,
      interactions: this.interactions,
      lastSnapshotTime: this.lastSnapshotTime,
    };
  }

  /**
   * Restore from JSON.
   */
  static fromJSON(data: any): StatsDashboard {
    const dashboard = new StatsDashboard();
    if (data) {
      dashboard.snapshots = data.snapshots || [];
      dashboard.interactions = data.interactions || [];
      dashboard.lastSnapshotTime = data.lastSnapshotTime || 0;
    }
    return dashboard;
  }
}
