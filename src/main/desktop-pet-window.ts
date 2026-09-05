/**
 * @module main/desktop-pet-window
 * Creates and manages the transparent desktop pet window with per-pixel
 * click-through, drag-to-move, position persistence, and passthrough toggle.
 *
 * Architecture:
 * - A single transparent BrowserWindow hosts the pet demo (HTML/CSS/JS)
 * - Mouse move events are intercepted to detect sprite vs transparent areas
 * - Click-through uses Electron's setIgnoreMouseEvents with forwarder IPC
 * - Position is saved on drag end, restored on launch
 */

import { BrowserWindow, ipcMain, screen, globalShortcut } from 'electron';
import * as path from 'path';
import { Settings } from './settings';

const PASSTHROUGH_TOGGLE_ACCEL = 'Ctrl+Shift+P';

export interface HitRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export class DesktopPetWindow {
  private window: BrowserWindow | null = null;
  private settings: Settings;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private hitRegions: HitRegion[] = [];
  private hitTestEnabled = true;
  private testMode = false;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  create(): BrowserWindow {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const { width, height } = primary.workAreaSize;

    // Get saved position or center on primary display
    const saved = this.settings.getWindowPosition();
    const scale = this.settings.getScale();
    const winWidth = Math.round(320 * scale);
    const winHeight = Math.round(380 * scale);
    const x = saved.x >= 0 ? saved.x : Math.round((width - winWidth) / 2);
    const y = saved.y >= 0 ? saved.y : Math.round((height - winHeight) / 2);

    this.window = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x,
      y,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      hasShadow: false,
      opacity: this.settings.getPassthrough() ? 0.85 : 1.0,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setAspectRatio(winWidth / winHeight);

    // Load the pet demo HTML
    this.window.loadFile(path.join(__dirname, '../../demo/index.html'));

    // Setup IPC handlers
    this.setupIpc();

    // Setup passthrough toggle hotkey
    this.setupHotkey();

    // Save position on move (debounced via renderer)
    this.window.on('moved', () => {
      if (this.window) {
        const [newX, newY] = this.window.getPosition();
        this.settings.setWindowPosition(newX, newY);
      }
    });

    // Apply initial passthrough state
    this.applyPassthrough(this.settings.getPassthrough());

    return this.window;
  }

  private setupIpc(): void {
    // Get cursor position for hit-testing
    ipcMain.handle('pet:getCursorPosition', () => {
      if (!this.window) return null;
      const cursor = screen.getCursorScreenPoint();
      const [winX, winY] = this.window.getPosition();
      return {
        cursorX: cursor.x,
        cursorY: cursor.y,
        winX,
        winY,
      };
    });

    // Set passthrough mode
    ipcMain.handle('pet:setPassthrough', (_, enabled: boolean) => {
      this.applyPassthrough(enabled);
      this.settings.setPassthrough(enabled);
    });

    // Toggle passthrough
    ipcMain.handle('pet:togglePassthrough', () => {
      const newState = !this.settings.getPassthrough();
      this.applyPassthrough(newState);
      this.settings.setPassthrough(newState);
      // Notify renderer of state change
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('pet:passthrough-changed', newState);
      }
      return newState;
    });

    // Get passthrough state
    ipcMain.handle('pet:getPassthrough', () => {
      return this.settings.getPassthrough();
    });

    // Scale controls
    ipcMain.handle('pet:setScale', (_, scale: number) => {
      this.setScale(scale);
    });

    ipcMain.handle('pet:getScale', () => {
      return this.settings.getScale();
    });

    // Send home (center on screen)
    ipcMain.handle('pet:sendHome', () => {
      this.sendHome();
    });

    // Drag handlers from renderer
    ipcMain.handle('pet:startDrag', () => {
      this.isDragging = true;
      const cursor = screen.getCursorScreenPoint();
      const [winX, winY] = this.window?.getPosition() ?? [0, 0];
      this.dragOffset = { x: cursor.x - winX, y: cursor.y - winY };
    });

    ipcMain.handle('pet:dragTo', (_, { x, y }: { x: number; y: number }) => {
      if (this.window && this.isDragging) {
        this.window.setPosition(Math.round(x), Math.round(y));
      }
    });

    ipcMain.handle('pet:endDrag', () => {
      this.isDragging = false;
    });

    // Test Mode IPC (AC10.x) — for automated QA
    ipcMain.handle('pet:setHitTestEnabled', (_, enabled: boolean) => {
      this.hitTestEnabled = enabled;
    });

    ipcMain.handle('pet:getHitTestEnabled', () => {
      return this.hitTestEnabled;
    });

    ipcMain.handle('pet:setHitRegions', (_, regions: HitRegion[]) => {
      this.hitRegions = regions;
    });

    ipcMain.handle('pet:getHitRegions', () => {
      return this.hitRegions;
    });

    ipcMain.handle('pet:simulateClick', (_, x: number, y: number) => {
      if (!this.window) return null;
      const [winX, winY] = this.window.getPosition();
      const screenX = winX + x;
      const screenY = winY + y;
      // Check if click hits any region
      const hit = this.hitTestEnabled && this.hitRegions.some(r =>
        x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
      );
      return { hit, screenX, screenY, x, y };
    });

    ipcMain.handle('pet:getWindowState', () => {
      if (!this.window) return null;
      const [winX, winY] = this.window.getPosition();
      const [width, height] = this.window.getSize();
      return {
        x: winX,
        y: winY,
        width,
        height,
        scale: this.settings.getScale(),
        passthrough: this.settings.getPassthrough(),
        hitTestEnabled: this.hitTestEnabled,
        hitRegions: this.hitRegions,
        isDragging: this.isDragging,
        visible: this.window.isVisible(),
        destroyed: this.window.isDestroyed(),
      };
    });

    ipcMain.handle('pet:setTestMode', (_, enabled: boolean) => {
      this.testMode = enabled;
    });

    ipcMain.handle('pet:getTestMode', () => {
      return this.testMode;
    });
  }

  private setupHotkey(): void {
    try {
      globalShortcut.register(PASSTHROUGH_TOGGLE_ACCEL, () => {
        const newState = !this.settings.getPassthrough();
        this.applyPassthrough(newState);
        this.settings.setPassthrough(newState);
        // Notify renderer
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('pet:passthrough-changed', newState);
        }
      });
    } catch (err) {
      console.warn('Failed to register passthrough hotkey:', err);
    }
  }

  private applyPassthrough(enabled: boolean): void {
    if (!this.window) return;
    if (enabled) {
      // Pass all mouse events through to the desktop behind
      this.window.setIgnoreMouseEvents(true, { forward: true });
      this.window.setOpacity(0.85);
    } else {
      this.window.setIgnoreMouseEvents(false);
      this.window.setOpacity(1.0);
    }
  }

  private setScale(scale: number): void {
    if (!this.window) return;
    this.settings.setScale(scale);
    const newWidth = Math.round(320 * scale);
    const newHeight = Math.round(380 * scale);
    this.window.setSize(newWidth, newHeight);
    this.window.setAspectRatio(newWidth / newHeight);
  }

  private sendHome(): void {
    if (!this.window) return;
    const primary = screen.getPrimaryDisplay();
    const { width, height } = primary.workAreaSize;
    const [winWidth, winHeight] = this.window.getSize();
    const centerX = Math.round((width - winWidth) / 2);
    const centerY = Math.round((height - winHeight) / 2);
    this.window.setPosition(centerX, centerY);
    this.settings.setWindowPosition(centerX, centerY);
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  show(): void {
    this.window?.show();
  }

  hide(): void {
    this.window?.hide();
  }

  togglePassthrough(): void {
    const newState = !this.settings.getPassthrough();
    this.applyPassthrough(newState);
    this.settings.setPassthrough(newState);
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('pet:passthrough-changed', newState);
    }
  }

  destroy(): void {
    try {
      globalShortcut.unregister(PASSTHROUGH_TOGGLE_ACCEL);
    } catch {}
    this.window?.destroy();
    this.window = null;
  }
}
