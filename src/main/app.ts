import { app, BrowserWindow, Tray, Menu, ipcMain, nativeTheme } from 'electron';
import * as path from 'path';
import { PetStateManager } from '../state/pet-state-manager';
import { createIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let petStateManager: PetStateManager | null = null;

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
}

app.whenReady().then(() => {
  petStateManager = new PetStateManager();
  createWindow();
  createTray();
  createIpcHandlers(ipcMain, petStateManager);
});

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullscreen: true });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Hoshi — Darkness is here');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Pet', click: () => mainWindow?.show() },
    { label: 'Hide Pet', click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Feed', click: () => petStateManager?.dispatch({ type: 'FEED', amount: 20 }) },
    { label: 'Play', click: () => petStateManager?.dispatch({ type: 'PLAY', intensity: 15 }) },
    { label: 'Clean', click: () => petStateManager?.dispatch({ type: 'CLEAN' }) },
    { label: 'Sleep', click: () => petStateManager?.dispatch({ type: 'SLEEP' }) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
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
});
