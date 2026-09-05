/**
 * @module main/settings
 * Persistent settings: window position, scale, passthrough toggle.
 * Stored in userData/settings.json.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface AppSettings {
  window: {
    x: number;
    y: number;
    scale: number;
    passthrough: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  window: {
    x: -1, // -1 = center
    y: -1,
    scale: 1.0,
    passthrough: false,
  },
};

export class Settings {
  private settingsPath: string;
  private settings: AppSettings;

  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.load();
  }

  getWindowPosition(): { x: number; y: number } {
    return { x: this.settings.window.x, y: this.settings.window.y };
  }

  setWindowPosition(x: number, y: number): void {
    this.settings.window.x = x;
    this.settings.window.y = y;
    this.save();
  }

  getScale(): number {
    return this.settings.window.scale;
  }

  setScale(scale: number): void {
    this.settings.window.scale = Math.max(0.6, Math.min(2.0, scale));
    this.save();
  }

  getPassthrough(): boolean {
    return this.settings.window.passthrough;
  }

  setPassthrough(enabled: boolean): void {
    this.settings.window.passthrough = enabled;
    this.save();
  }

  private load(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          window: {
            x: parsed.window?.x ?? -1,
            y: parsed.window?.y ?? -1,
            scale: parsed.window?.scale ?? 1.0,
            passthrough: parsed.window?.passthrough ?? false,
          },
        };
      }
    } catch (err) {
      console.error('Failed to load settings, using defaults:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }
}
