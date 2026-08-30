/**
 * @module main/desktop-awareness
 * Detects user activity (typing, idle, returning) using Electron powerMonitor.
 * Privacy-first: polls system idle time only — never captures keystrokes.
 * Aligned with issue #12 acceptance criteria.
 */

import { powerMonitor, BrowserWindow } from 'electron';

export type AwarenessState = 'typing' | 'idle' | 'returning' | 'active';

export interface DesktopAwarenessOptions {
  idleThresholdMs: number; // Time before user considered idle (default 5 min)
  debounceMs: number; // Time before "typing" triggers (default 2 sec)
  pollIntervalMs: number; // How often to check idle time (default 500 ms)
}

const DEFAULT_OPTIONS: DesktopAwarenessOptions = {
  idleThresholdMs: 5 * 60 * 1000, // 5 minutes
  debounceMs: 2000, // 2 seconds
  pollIntervalMs: 500, // 500 ms
};

/**
 * DesktopAwareness monitors system idle time to infer user activity.
 *
 * State machine:
 * - typing:   user actively using keyboard/mouse (idle < debounceMs)
 * - active:   user present but not actively typing (debounceMs < idle < idleThresholdMs)
 * - idle:     user away (idle >= idleThresholdMs)
 * - returning: user just came back from idle state
 *
 * Privacy: Only reads system idle time. Never captures, logs, or stores
 * any keystroke or mouse event data.
 */
export class DesktopAwareness {
  private options: DesktopAwarenessOptions;
  private currentState: AwarenessState = 'active';
  private previousIdleTimeMs: number = 0;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private mainWindow: BrowserWindow | null = null;
  private enabled: boolean = true;

  // Callbacks
  onStateChange?: (state: AwarenessState) => void;

  constructor(options: Partial<DesktopAwarenessOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Attach to a BrowserWindow for IPC communication.
   */
  attachWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Start monitoring system idle time.
   */
  start(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      this.checkIdle();
    }, this.options.pollIntervalMs);
  }

  /**
   * Stop monitoring.
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Enable or disable monitoring.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.transitionTo('active');
    }
  }

  /**
   * Update idle threshold (from settings slider).
   */
  setIdleThreshold(minutes: number): void {
    this.options.idleThresholdMs = minutes * 60 * 1000;
  }

  /**
   * Get current awareness state.
   */
  getState(): AwarenessState {
    return this.currentState;
  }

  /**
   * Check system idle time and transition states.
   * Polls powerMonitor.getSystemIdleTime() — returns seconds since last input.
   */
  private checkIdle(): void {
    if (!this.enabled) return;

    const idleTimeMs = (powerMonitor.getSystemIdleTime() ?? 0) * 1000;

    let newState: AwarenessState;

    if (idleTimeMs >= this.options.idleThresholdMs) {
      // User has been away for threshold duration
      newState = 'idle';
    } else if (
      this.previousIdleTimeMs >= this.options.idleThresholdMs &&
      idleTimeMs < this.options.idleThresholdMs
    ) {
      // User just came back from idle
      newState = 'returning';
    } else if (idleTimeMs < this.options.debounceMs) {
      // User is actively using keyboard/mouse
      newState = 'typing';
    } else {
      // User is present but not actively typing
      newState = 'active';
    }

    if (newState !== this.currentState) {
      this.transitionTo(newState);
    }

    this.previousIdleTimeMs = idleTimeMs;
  }

  /**
   * Transition to a new state and notify listeners.
   */
  private transitionTo(state: AwarenessState): void {
    this.currentState = state;
    this.onStateChange?.(state);
    // Send to renderer via IPC
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('awareness:state-change', state);
    }
  }
}
