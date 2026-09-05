/**
 * @module main/lifecycle-manager
 * Application lifecycle: close-to-tray, shutdown handling, elapsed-time catch-up.
 */

import { BrowserWindow, app, powerMonitor } from 'electron';
import { PetState, Mood } from '../shared/types';

export interface CatchUpResult {
  elapsedMs: number;
  elapsedHours: number;
  hungerChange: number;
  happinessChange: number;
  energyChange: number;
  cleanlinessChange: number;
  moodChanged: boolean;
  previousMood: string;
  newMood: string;
}

export interface LifecycleConfig {
  catchUpEnabled: boolean;
  maxCatchUpHours: number; // Cap catch-up time to avoid extreme decay
  decayPerHour: {
    hunger: number;
    happiness: number;
    energy: number;
    cleanliness: number;
  };
  closeToTray: boolean;
  minimizeToTray: boolean;
}

export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  catchUpEnabled: true,
  maxCatchUpHours: 24,
  decayPerHour: {
    hunger: 5,
    happiness: 3,
    energy: 2,
    cleanliness: 4,
  },
  closeToTray: true,
  minimizeToTray: true,
};

export class LifecycleManager {
  private config: LifecycleConfig;
  private mainWindow: BrowserWindow | null = null;
  private lastActiveTime: number = Date.now();
  private isShuttingDown: boolean = false;
  private onStateChange: ((state: PetState) => void) | null = null;

  constructor(config?: Partial<LifecycleConfig>) {
    this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
  }

  /**
   * Initialize lifecycle management for the main window.
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.lastActiveTime = Date.now();

    // Close-to-tray: intercept close event
    mainWindow.on('close', (event) => {
      if (this.config.closeToTray && !this.isShuttingDown) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    // Minimize-to-tray
    mainWindow.on('minimize', () => {
      if (this.config.minimizeToTray) {
        mainWindow.hide();
      }
    });

    // Track active time
    mainWindow.on('show', () => {
      this.lastActiveTime = Date.now();
    });
  }

  /**
   * Register a callback for state changes.
   */
  onStateUpdate(callback: (state: PetState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Compute elapsed time and apply decay to pet state.
   */
  computeCatchUp(petState: PetState): CatchUpResult | null {
    if (!this.config.catchUpEnabled) return null;

    const now = Date.now();
    const elapsedMs = now - this.lastActiveTime;
    const elapsedHours = Math.min(
      elapsedMs / (1000 * 60 * 60),
      this.config.maxCatchUpHours
    );

    if (elapsedHours < 0.01) {
      return {
        elapsedMs,
        elapsedHours,
        hungerChange: 0,
        happinessChange: 0,
        energyChange: 0,
        cleanlinessChange: 0,
        moodChanged: false,
        previousMood: petState.mood || 'neutral',
        newMood: petState.mood || 'neutral',
      };
    }

    const decay = this.config.decayPerHour;
    const hungerChange = -(decay.hunger * elapsedHours);
    const happinessChange = -(decay.happiness * elapsedHours);
    const energyChange = -(decay.energy * elapsedHours);
    const cleanlinessChange = -(decay.cleanliness * elapsedHours);

    // Clamp values
    petState.hunger = Math.max(0, Math.min(100, petState.hunger + hungerChange));
    petState.happiness = Math.max(0, Math.min(100, petState.happiness + happinessChange));
    petState.energy = Math.max(0, Math.min(100, petState.energy + energyChange));
    petState.cleanliness = Math.max(0, Math.min(100, petState.cleanliness + cleanlinessChange));

    const previousMood = petState.mood || 'neutral';
    // Recompute mood based on new state (simplified)
    petState.mood = this.deriveMood(petState);
    const moodChanged = previousMood !== petState.mood;

    // Notify callback
    if (this.onStateChange) {
      this.onStateChange(petState);
    }

    this.lastActiveTime = now;

    return {
      elapsedMs,
      elapsedHours,
      hungerChange,
      happinessChange,
      energyChange,
      cleanlinessChange,
      moodChanged,
      previousMood,
      newMood: petState.mood,
    };
  }

  /**
   * Simple mood derivation from pet state.
   */
  private deriveMood(state: PetState): Mood {
    const avg = (state.hunger + state.happiness + state.energy + state.cleanliness) / 4;
    if (avg >= 80) return 'happy';
    if (avg >= 60) return 'content';
    if (avg >= 40) return 'neutral';
    if (avg >= 20) return 'sad';
    return 'upset';
  }

  /**
   * Mark the application as shutting down.
   */
  markShuttingDown(): void {
    this.isShuttingDown = true;
  }

  /**
   * Handle system shutdown/restart/logoff.
   */
  setupShutdownHandling(): void {
    app.on('before-quit', () => {
      this.isShuttingDown = true;
    });

    // Windows: handle WM_QUERYENDSESSION
    if (process.platform === 'win32') {
      powerMonitor.on('shutdown', () => {
        this.isShuttingDown = true;
        this.mainWindow?.close();
      });
    }
  }

  /**
   * Update the last active time.
   */
  updateActiveTime(): void {
    this.lastActiveTime = Date.now();
  }

  /**
   * Get the last active timestamp.
   */
  getLastActiveTime(): number {
    return this.lastActiveTime;
  }

  /**
   * Get the elapsed ms since last active.
   */
  getElapsedMs(): number {
    return Date.now() - this.lastActiveTime;
  }

  /**
   * Serialize state to JSON.
   */
  toJSON(): object {
    return {
      config: this.config,
      lastActiveTime: this.lastActiveTime,
    };
  }

  /**
   * Restore from JSON.
   */
  static fromJSON(data: any): LifecycleManager {
    const manager = new LifecycleManager(data.config);
    manager.lastActiveTime = data.lastActiveTime || Date.now();
    return manager;
  }
}
