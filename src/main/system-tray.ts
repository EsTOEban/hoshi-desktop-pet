/**
 * @module main/system-tray
 * System tray integration with run model tracking.
 * Manages tray icon, tooltip, context menu, and session tracking.
 */

import { Tray, Menu, BrowserWindow, ipcMain, nativeImage } from 'electron';
import * as path from 'path';
import { PetState } from '../shared/types';

export interface RunSession {
  startTime: number;
  endTime: number | null;
  duration: number; // ms
}

export interface RunModel {
  currentSession: RunSession | null;
  totalRunTime: number; // ms across all sessions
  sessionCount: number;
  lastStartTime: number | null;
  longestSession: number; // ms
  averageSession: number; // ms
}

export interface TrayConfig {
  showPetStatus: boolean;
  showRunTime: boolean;
  quickActions: string[]; // 'feed' | 'play' | 'clean' | 'sleep' | 'stats'
  updateIntervalMs: number;
}

export const DEFAULT_TRAY_CONFIG: TrayConfig = {
  showPetStatus: true,
  showRunTime: true,
  quickActions: ['feed', 'play', 'clean', 'sleep'],
  updateIntervalMs: 30000, // 30 seconds
};

export class SystemTrayManager {
  private tray: Tray | null = null;
  private config: TrayConfig;
  private runModel: RunModel;
  private mainWindow: BrowserWindow | null = null;
  private petState: PetState | null = null;
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private iconPath: string;
  private onActionCallbacks: Map<string, () => void> = new Map();

  constructor(config?: Partial<TrayConfig>) {
    this.config = { ...DEFAULT_TRAY_CONFIG, ...config };
    this.runModel = {
      currentSession: null,
      totalRunTime: 0,
      sessionCount: 0,
      lastStartTime: null,
      longestSession: 0,
      averageSession: 0,
    };
    this.iconPath = path.join(__dirname, '../../assets/tray-icon.png');
    this.startSession();
  }

  /**
   * Initialize the system tray.
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.tray = new Tray(nativeImage.createEmpty()); // placeholder, will be updated
    this.tray.setToolTip('Hoshi — Loading...');

    this.buildContextMenu();
    this.startSession();
    this.startUpdateTimer();

    this.tray.on('double-click', () => this.toggleWindow());
  }

  /**
   * Build the context menu.
   */
  private buildContextMenu(): void {
    if (!this.tray) return;

    const template: Electron.MenuItemConstructorOptions[] = [
      { label: 'Show Pet', click: () => this.showWindow() },
      { label: 'Hide Pet', click: () => this.hideWindow() },
      { type: 'separator' },
    ];

    // Quick actions
    if (this.config.quickActions.includes('feed')) {
      template.push({ label: '🍖 Feed', click: () => this.triggerAction('feed') });
    }
    if (this.config.quickActions.includes('play')) {
      template.push({ label: '🎮 Play', click: () => this.triggerAction('play') });
    }
    if (this.config.quickActions.includes('clean')) {
      template.push({ label: '🧼 Clean', click: () => this.triggerAction('clean') });
    }
    if (this.config.quickActions.includes('sleep')) {
      template.push({ label: '😴 Sleep', click: () => this.triggerAction('sleep') });
    }
    if (this.config.quickActions.includes('stats')) {
      template.push({ label: '📊 Stats', click: () => this.triggerAction('stats') });
    }

    template.push({ type: 'separator' });

    // Run time display
    if (this.config.showRunTime) {
      const runTime = this.formatDuration(this.getCurrentSessionDuration());
      template.push({ label: `⏱️ Session: ${runTime}`, enabled: false });
      const totalTime = this.formatDuration(this.runModel.totalRunTime);
      template.push({ label: `📈 Total: ${totalTime}`, enabled: false });
    }

    template.push({ type: 'separator' });
    template.push({ label: 'Quit', click: () => this.quit() });

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Start a new run session.
   */
  startSession(): void {
    const now = Date.now();
    this.runModel.currentSession = {
      startTime: now,
      endTime: null,
      duration: 0,
    };
    this.runModel.lastStartTime = now;
    this.runModel.sessionCount++;
  }

  /**
   * End the current run session.
   */
  endSession(): void {
    if (!this.runModel.currentSession) return;

    const now = Date.now();
    const session = this.runModel.currentSession;
    session.endTime = now;
    session.duration = now - session.startTime;

    this.runModel.totalRunTime += session.duration;
    if (session.duration > this.runModel.longestSession) {
      this.runModel.longestSession = session.duration;
    }
    this.runModel.averageSession =
      this.runModel.totalRunTime / this.runModel.sessionCount;

    this.runModel.currentSession = null;
  }

  /**
   * Get the current session duration in ms.
   */
  getCurrentSessionDuration(): number {
    if (!this.runModel.currentSession) return 0;
    return Date.now() - this.runModel.currentSession.startTime;
  }

  /**
   * Update the pet state for tray display.
   */
  updatePetState(state: PetState): void {
    this.petState = state;
    this.updateTooltip();
  }

  /**
   * Update the tray tooltip.
   */
  private updateTooltip(): void {
    if (!this.tray) return;

    const lines: string[] = ['Hoshi — Darkness'];

    if (this.config.showPetStatus && this.petState) {
      const mood = this.petState.mood || 'neutral';
      lines.push(`Mood: ${mood}`);
      if (this.petState.hunger !== undefined) {
        lines.push(`Hunger: ${Math.round(this.petState.hunger)}%`);
      }
      if (this.petState.happiness !== undefined) {
        lines.push(`Happy: ${Math.round(this.petState.happiness)}%`);
      }
    }

    if (this.config.showRunTime) {
      const session = this.formatDuration(this.getCurrentSessionDuration());
      lines.push(`Session: ${session}`);
    }

    this.tray.setToolTip(lines.join('\n'));
  }

  /**
   * Start the periodic update timer.
   */
  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      this.updateTooltip();
      this.buildContextMenu();
    }, this.config.updateIntervalMs);
  }

  /**
   * Stop the update timer.
   */
  private stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Register a callback for a quick action.
   */
  onAction(action: string, callback: () => void): void {
    this.onActionCallbacks.set(action, callback);
  }

  /**
   * Trigger a quick action.
   */
  private triggerAction(action: string): void {
    const callback = this.onActionCallbacks.get(action);
    if (callback) callback();
  }

  /**
   * Toggle window visibility.
   */
  private toggleWindow(): void {
    if (!this.mainWindow) return;
    if (this.mainWindow.isVisible()) {
      this.hideWindow();
    } else {
      this.showWindow();
    }
  }

  /**
   * Show the main window.
   */
  private showWindow(): void {
    this.mainWindow?.show();
  }

  /**
   * Hide the main window.
   */
  private hideWindow(): void {
    this.mainWindow?.hide();
  }

  /**
   * Quit the application.
   */
  private quit(): void {
    this.endSession();
    this.stopUpdateTimer();
    this.tray?.destroy();
    this.tray = null;
  }

  /**
   * Get the run model data.
   */
  getRunModel(): RunModel {
    return { ...this.runModel };
  }

  /**
   * Format a duration in ms to human-readable string.
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Serialize run model to JSON.
   */
  toJSON(): object {
    return {
      runModel: this.runModel,
      config: this.config,
    };
  }

  /**
   * Restore from JSON.
   */
  static fromJSON(data: any): SystemTrayManager {
    const manager = new SystemTrayManager(data.config);
    if (data.runModel) {
      manager.runModel = data.runModel;
    }
    return manager;
  }

  /**
   * Destroy the tray and cleanup.
   */
  destroy(): void {
    this.stopUpdateTimer();
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
