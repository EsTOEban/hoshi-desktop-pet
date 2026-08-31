/**
 * @module main/behavioral-memory
 * Behavioral memory system that tracks and learns from pet interactions.
 * Remembers preferences, patterns, and adapts responses over time.
 */

import { PetState, Needs } from '../shared/types';

export type InteractionType = 'feed' | 'play' | 'clean' | 'sleep' | 'wake' | 'pet' | 'scold' | 'reward';

export interface InteractionMemory {
  type: InteractionType;
  timestamp: number;
  state: PetState;
  responseScore: number; // -1 to 1, how positive the response was
}

export interface BehaviorPattern {
  type: InteractionType;
  averageResponse: number;
  count: number;
  lastPerformed: number;
  preferredTimeOfDay: number | null; // 0-23, hour of day
}

export interface MemoryConfig {
  maxMemories: number;
  maxPatterns: number;
  decayRate: number; // 0-1, how fast old memories fade
  learningRate: number; // 0-1, how fast patterns update
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxMemories: 500,
  maxPatterns: 50,
  decayRate: 0.01,
  learningRate: 0.3,
};

export class BehavioralMemory {
  private memories: InteractionMemory[] = [];
  private patterns: Map<InteractionType, BehaviorPattern> = new Map();
  private config: MemoryConfig;
  private favoriteActivity: InteractionType | null = null;
  private leastFavoriteActivity: InteractionType | null = null;

  constructor(config?: Partial<MemoryConfig>) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  /**
   * Record an interaction and its response.
   */
  recordInteraction(
    type: InteractionType,
    state: PetState,
    responseScore: number
  ): InteractionMemory {
    const memory: InteractionMemory = {
      type,
      timestamp: Date.now(),
      state: { ...state },
      responseScore: Math.max(-1, Math.min(1, responseScore)),
    };

    this.memories.push(memory);

    // Trim if over max
    while (this.memories.length > this.config.maxMemories) {
      this.memories.shift();
    }

    // Update pattern for this interaction type
    this.updatePattern(type, memory);

    // Recalculate favorites
    this.recalculateFavorites();

    return memory;
  }

  /**
   * Update the behavior pattern for an interaction type.
   */
  private updatePattern(type: InteractionType, memory: InteractionMemory): void {
    const existing = this.patterns.get(type);
    const hour = new Date(memory.timestamp).getHours();

    if (!existing) {
      this.patterns.set(type, {
        type,
        averageResponse: memory.responseScore,
        count: 1,
        lastPerformed: memory.timestamp,
        preferredTimeOfDay: hour,
      });
    } else {
      const newCount = existing.count + 1;
      const lr = this.config.learningRate;

      // Exponential moving average for response
      const newAverage =
        existing.averageResponse * (1 - lr) + memory.responseScore * lr;

      // Time of day preference (circular mean)
      const existingHour = existing.preferredTimeOfDay ?? hour;
      const preferredHour = Math.round(
        existingHour * (1 - lr) + hour * lr
      );

      this.patterns.set(type, {
        type,
        averageResponse: newAverage,
        count: newCount,
        lastPerformed: memory.timestamp,
        preferredTimeOfDay: preferredHour % 24,
      });
    }
  }

  /**
   * Recalculate favorite and least favorite activities.
   */
  private recalculateFavorites(): void {
    let best: InteractionType | null = null;
    let worst: InteractionType | null = null;
    let bestScore = -Infinity;
    let worstScore = Infinity;

    for (const [type, pattern] of this.patterns) {
      if (pattern.count < 2) continue; // Need at least 2 data points

      if (pattern.averageResponse > bestScore) {
        bestScore = pattern.averageResponse;
        best = type;
      }
      if (pattern.averageResponse < worstScore) {
        worstScore = pattern.averageResponse;
        worst = type;
      }
    }

    this.favoriteActivity = best;
    this.leastFavoriteActivity = worst;
  }

  /**
   * Get the pattern for a specific interaction type.
   */
  getPattern(type: InteractionType): BehaviorPattern | null {
    return this.patterns.get(type) || null;
  }

  /**
   * Get all patterns.
   */
  getAllPatterns(): BehaviorPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get the favorite activity.
   */
  getFavoriteActivity(): InteractionType | null {
    return this.favoriteActivity;
  }

  /**
   * Get the least favorite activity.
   */
  getLeastFavoriteActivity(): InteractionType | null {
    return this.leastFavoriteActivity;
  }

  /**
   * Get recent memories (last N).
   */
  getRecentMemories(count: number): InteractionMemory[] {
    return this.memories.slice(-count);
  }

  /**
   * Get memories by interaction type.
   */
  getMemoriesByType(type: InteractionType): InteractionMemory[] {
    return this.memories.filter((m) => m.type === type);
  }

  /**
   * Get the predicted response for an interaction type.
   */
  predictResponse(type: InteractionType): number {
    const pattern = this.patterns.get(type);
    if (!pattern) return 0;
    return pattern.averageResponse;
  }

  /**
   * Get the best time of day for an interaction.
   */
  getPreferredTime(type: InteractionType): number | null {
    const pattern = this.patterns.get(type);
    return pattern?.preferredTimeOfDay ?? null;
  }

  /**
   * Check if the pet "remembers" a specific interaction type.
   */
  remembers(type: InteractionType): boolean {
    const pattern = this.patterns.get(type);
    return pattern !== undefined && pattern.count >= 2;
  }

  /**
   * Get the total number of memories.
   */
  getMemoryCount(): number {
    return this.memories.length;
  }

  /**
   * Get the total number of patterns.
   */
  getPatternCount(): number {
    return this.patterns.size;
  }

  /**
   * Apply time decay to old memories.
   */
  applyDecay(): void {
    const now = Date.now();
    const decayMs = 1000 * 60 * 60 * 24 * 7; // 1 week half-life

    for (const memory of this.memories) {
      const age = now - memory.timestamp;
      const decayFactor = Math.exp(-this.config.decayRate * (age / decayMs));
      memory.responseScore *= decayFactor;
    }
  }

  /**
   * Clear all memories and patterns.
   */
  clear(): void {
    this.memories = [];
    this.patterns.clear();
    this.favoriteActivity = null;
    this.leastFavoriteActivity = null;
  }

  /**
   * Serialize to JSON.
   */
  toJSON(): object {
    return {
      memories: this.memories,
      patterns: Array.from(this.patterns.entries()),
      favoriteActivity: this.favoriteActivity,
      leastFavoriteActivity: this.leastFavoriteActivity,
    };
  }

  /**
   * Restore from JSON.
   */
  static fromJSON(data: any): BehavioralMemory {
    const memory = new BehavioralMemory();
    if (data) {
      memory.memories = data.memories || [];
      memory.patterns = new Map(data.patterns || []);
      memory.favoriteActivity = data.favoriteActivity || null;
      memory.leastFavoriteActivity = data.leastFavoriteActivity || null;
    }
    return memory;
  }
}
