import { app, BrowserWindow, Tray, Menu, ipcMain, nativeTheme } from 'electron';
import * as path from 'path';
import { PetStateManager } from '../state/pet-state-manager';
import { createIpcHandlers, desktopAwareness } from './ipc';
import { DesktopPetWindow } from './desktop-pet-window';
import { Settings } from './settings';

// Minigame types
type MinigameId = 'memory-match' | 'reaction-time';

let minigameCallback: ((id: MinigameId) => void) | null = null;

export function setMinigameCallback(cb: (id: MinigameId) => void): void {
  minigameCallback = cb;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let petStateManager: PetStateManager | null = null;
let desktopPet: DesktopPetWindow | null = null;
let settings: Settings | null = null;

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
}

app.whenReady().then(() => {
  settings = new Settings();
  petStateManager = new PetStateManager();
  
  // Create the desktop pet window (transparent overlay)
  desktopPet = new DesktopPetWindow(settings);
  mainWindow = desktopPet.create();
  
  createTray();
  createIpcHandlers(ipcMain, petStateManager);
  
  // Start desktop awareness monitoring
  if (mainWindow) {
    desktopAwareness.attachWindow(mainWindow);
    desktopAwareness.start();
  }
});

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Hoshi — Darkness is here');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Pet', click: () => desktopPet?.show() },
    { label: 'Hide Pet', click: () => desktopPet?.hide() },
    { type: 'separator' },
    { label: 'Send Home', click: () => mainWindow && (mainWindow as any).sendHome?.() },
    { type: 'separator' },
    { label: 'Feed', click: () => petStateManager?.dispatch({ type: 'FEED', amount: 20 }) },
    { label: 'Play', click: () => petStateManager?.dispatch({ type: 'PLAY', intensity: 15 }) },
    { label: 'Clean', click: () => petStateManager?.dispatch({ type: 'CLEAN' }) },
    { label: 'Sleep', click: () => petStateManager?.dispatch({ type: 'SLEEP' }) },
    { label: 'Toggle Passthrough', click: () => desktopPet?.togglePassthrough() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => desktopPet?.show());
}

app.on('window-all-closed', () => {
  // don't quit — close-to-tray behavior (see Issue #24)
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  petStateManager?.persistState();
  desktopPet?.destroy();
});
