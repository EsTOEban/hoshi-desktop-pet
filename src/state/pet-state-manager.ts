/**
 * @module state/pet-state-manager
 * Owns the single source of truth for pet state.
 * Subscribes to state changes, persists to disk, dispatches actions.
 */

import { PetState, DEFAULT_PET_STATE } from '../shared/types';
import { petReducer, PetAction } from './pet-reducer';
import { PersonalityEngine } from './personality-engine';
import { DailyStreak, StreakData } from '../main/daily-streak';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

type Subscriber = (state: PetState) => void;

export class PetStateManager {
  private state: PetState;
  private personality: PersonalityEngine;
  private streak: DailyStreak;
  private subscribers: Set<Subscriber> = new Set();
  private statePath: string;

  constructor() {
    this.statePath = path.join(app.getPath('userData'), 'state.json');
    const { petState, streakData } = this.loadState();
    this.state = petState;
    this.personality = new PersonalityEngine();
    this.streak = new DailyStreak(streakData);
  }

  getState(): PetState {
    return this.state;
  }

  getMood(): string {
    return this.state.mood;
  }

  dispatch(action: PetAction): void {
    this.state = petReducer(this.state, action);
    // Record personality-relevant interactions
    if (action.type === 'FEED') this.personality.recordInteraction('feed');
    if (action.type === 'PLAY') this.personality.recordInteraction('play');
    if (action.type === 'CLEAN') this.personality.recordInteraction('clean');
    this.notify();
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  persistState(): void {
    try {
      const saveData = {
        pet: this.state,
        streak: this.streak.toJSON(),
      };
      fs.writeFileSync(this.statePath, JSON.stringify(saveData, null, 2));
    } catch (err) {
      console.error('Failed to persist state:', err);
    }
  }

  /**
   * Process a daily login and return the reward.
   */
  login(): { reward: number; streakContinued: boolean; streakBroken: boolean; milestoneBonus: number } {
    const result = this.streak.login();
    this.persistState();
    return result;
  }

  /**
   * Get the daily streak tracker.
   */
  getStreak(): DailyStreak {
    return this.streak;
  }

  private loadState(): { petState: PetState; streakData: StreakData | undefined } {
    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, 'utf-8');
        if (raw.length > 1_000_000) {
          console.warn('Save file too large, using defaults');
          return { petState: this.defaultState(), streakData: undefined };
        }
        const parsed = JSON.parse(raw);
        // New format with pet and streak
        if (parsed.pet) {
          const petState = parsed.pet as PetState;
          if (
            typeof petState.hunger !== 'number' ||
            typeof petState.happiness !== 'number' ||
            typeof petState.cleanliness !== 'number' ||
            typeof petState.energy !== 'number'
          ) {
            return { petState: this.defaultState(), streakData: parsed.streak };
          }
          return { petState, streakData: parsed.streak as StreakData };
        }
        // Legacy format — only pet state
        const petState = parsed as PetState;
        if (
          typeof petState.hunger !== 'number' ||
          typeof petState.happiness !== 'number' ||
          typeof petState.cleanliness !== 'number' ||
          typeof petState.energy !== 'number'
        ) {
          return { petState: this.defaultState(), streakData: undefined };
        }
        return { petState, streakData: undefined };
      }
    } catch (err) {
      console.error('Failed to load state, using defaults:', err);
    }
    return { petState: this.defaultState(), streakData: undefined };
  }

  private defaultState(): PetState {
    return {
      ...DEFAULT_PET_STATE,
      createdAt: Date.now(),
      lastTick: 0,
    };
  }

  private notify(): void {
    for (const fn of this.subscribers) {
      fn(this.state);
    }
  }
}
