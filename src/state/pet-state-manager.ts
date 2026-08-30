/**
 * @module state/pet-state-manager
 * Owns the single source of truth for pet state.
 * Subscribes to state changes, persists to disk, dispatches actions.
 */

import { PetState, DEFAULT_PET_STATE } from '../shared/types';
import { petReducer, PetAction } from './pet-reducer';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

type Subscriber = (state: PetState) => void;

export class PetStateManager {
  private state: PetState;
  private subscribers: Set<Subscriber> = new Set();
  private statePath: string;

  constructor() {
    this.statePath = path.join(app.getPath('userData'), 'state.json');
    this.state = this.loadState();
  }

  getState(): PetState {
    return this.state;
  }

  getMood(): string {
    return this.state.mood;
  }

  dispatch(action: PetAction): void {
    this.state = petReducer(this.state, action);
    this.notify();
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  persistState(): void {
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('Failed to persist state:', err);
    }
  }

  private loadState(): PetState {
    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, 'utf-8');
        if (raw.length > 1_000_000) {
          console.warn('Save file too large, using defaults');
          return this.defaultState();
        }
        const parsed = JSON.parse(raw) as PetState;
        if (
          typeof parsed.hunger !== 'number' ||
          typeof parsed.happiness !== 'number' ||
          typeof parsed.cleanliness !== 'number' ||
          typeof parsed.energy !== 'number'
        ) {
          return this.defaultState();
        }
        return parsed;
      }
    } catch (err) {
      console.error('Failed to load state, using defaults:', err);
    }
    return this.defaultState();
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
