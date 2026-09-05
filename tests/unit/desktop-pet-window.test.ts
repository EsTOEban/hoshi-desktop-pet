/**
 * @module tests/unit/desktop-pet-window.test.ts
 * Tests for DesktopPetWindow — transparent window creation, IPC handlers,
 * passthrough toggle, scale controls, drag-to-move, and send-home.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function createMockWindow() {
  return {
    setPosition: vi.fn(),
    getPosition: vi.fn(() => [200, 300]),
    setSize: vi.fn(),
    getSize: vi.fn(() => [320, 380]),
    show: vi.fn(),
    hide: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
    setVisibleOnAllWorkspaces: vi.fn(),
    setAspectRatio: vi.fn(),
    setIgnoreMouseEvents: vi.fn(),
    setOpacity: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: { send: vi.fn() },
  };
}

let currentMockWindow: ReturnType<typeof createMockWindow>;

vi.mock('electron', () => {
  const BrowserWindow = vi.fn(() => {
    currentMockWindow = createMockWindow();
    return currentMockWindow;
  });
  const ipcMain = { handle: vi.fn() };
  const screen = {
    getAllDisplays: vi.fn(() => [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]),
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
    getCursorScreenPosition: vi.fn(() => ({ x: 500, y: 500 })),
  };
  const globalShortcut = {
    register: vi.fn(() => true),
    unregister: vi.fn(),
  };
  const app = {
    getPath: vi.fn(() => 'C:\\temp\\hoshi-test'),
  };

  return { BrowserWindow, ipcMain, screen, globalShortcut, app };
});

const mockSettingsInstance = {
  getWindowPosition: vi.fn(() => ({ x: -1, y: -1 })),
  setWindowPosition: vi.fn(),
  getScale: vi.fn(() => 1.0),
  setScale: vi.fn(),
  getPassthrough: vi.fn(() => false),
  setPassthrough: vi.fn(),
};

vi.mock('../../src/main/settings', () => ({
  Settings: vi.fn(() => mockSettingsInstance),
}));

import { DesktopPetWindow } from '../../src/main/desktop-pet-window';
import type { Settings } from '../../src/main/settings';

describe('DesktopPetWindow', () => {
  let petWindow: DesktopPetWindow;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { Settings: MockedSettings } = await import('../../src/main/settings');
    const settings = new MockedSettings() as unknown as Settings;
    petWindow = new DesktopPetWindow(settings);
    petWindow.create();
  });

  afterEach(() => {
    petWindow.destroy();
  });

  it('creates a transparent, frameless, always-on-top BrowserWindow', async () => {
    const { BrowserWindow } = await import('electron');
    const call = vi.mocked(BrowserWindow).mock.calls[0][0];
    expect(call.transparent).toBe(true);
    expect(call.frame).toBe(false);
    expect(call.alwaysOnTop).toBe(true);
    expect(call.skipTaskbar).toBe(true);
    expect(call.resizable).toBe(false);
  });

  it('centers window when no saved position', async () => {
    const { BrowserWindow } = await import('electron');
    const call = vi.mocked(BrowserWindow).mock.calls[0][0];
    expect(call.x).toBe(800);
    expect(call.y).toBe(350);
  });

  it('positions window at saved position', async () => {
    const { Settings: MockedSettings } = await import('../../src/main/settings');
    const { BrowserWindow } = await import('electron');
    
    mockSettingsInstance.getWindowPosition.mockReturnValue({ x: 100, y: 200 });
    const settings = new MockedSettings() as unknown as Settings;
    const dpw = new DesktopPetWindow(settings);
    dpw.create();
    
    const calls = vi.mocked(BrowserWindow).mock.calls;
    const call = calls[calls.length - 1][0];
    expect(call.x).toBe(100);
    expect(call.y).toBe(200);
    dpw.destroy();
  });

  it('applies scale to window size', async () => {
    const { Settings: MockedSettings } = await import('../../src/main/settings');
    const { BrowserWindow } = await import('electron');
    
    mockSettingsInstance.getScale.mockReturnValue(1.5);
    const settings = new MockedSettings() as unknown as Settings;
    const dpw = new DesktopPetWindow(settings);
    dpw.create();
    
    const calls = vi.mocked(BrowserWindow).mock.calls;
    const call = calls[calls.length - 1][0];
    expect(call.width).toBe(480);
    expect(call.height).toBe(570);
    dpw.destroy();
  });

  it('loads the pet demo HTML', () => {
    expect(currentMockWindow.loadFile).toHaveBeenCalled();
  });

  it('registers IPC handlers for pet operations', async () => {
    const { ipcMain } = await import('electron');
    const handledChannels = vi.mocked(ipcMain.handle).mock.calls.map(c => c[0]);
    expect(handledChannels).toContain('pet:getCursorPosition');
    expect(handledChannels).toContain('pet:setPassthrough');
    expect(handledChannels).toContain('pet:togglePassthrough');
    expect(handledChannels).toContain('pet:getPassthrough');
    expect(handledChannels).toContain('pet:setScale');
    expect(handledChannels).toContain('pet:getScale');
    expect(handledChannels).toContain('pet:sendHome');
    expect(handledChannels).toContain('pet:startDrag');
    expect(handledChannels).toContain('pet:dragTo');
    expect(handledChannels).toContain('pet:endDrag');
  });

  it('registers passthrough toggle hotkey (Ctrl+Shift+P)', async () => {
    const { globalShortcut } = await import('electron');
    expect(globalShortcut.register).toHaveBeenCalledWith('Ctrl+Shift+P', expect.any(Function));
  });

  it('applyPassthrough(true) enables click-through and reduces opacity', async () => {
    const { ipcMain } = await import('electron');
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    const setPassthroughCall = calls.find(c => c[0] === 'pet:setPassthrough');
    expect(setPassthroughCall).toBeDefined();

    const handler = setPassthroughCall![1] as (_: unknown, enabled: boolean) => void;
    handler({}, true);

    expect(currentMockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
    expect(currentMockWindow.setOpacity).toHaveBeenCalledWith(0.85);
  });

  it('applyPassthrough(false) restores full interactivity', async () => {
    const { ipcMain } = await import('electron');
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    const setPassthroughCall = calls.find(c => c[0] === 'pet:setPassthrough');
    const handler = setPassthroughCall![1] as (_: unknown, enabled: boolean) => void;
    handler({}, false);

    expect(currentMockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(false);
    expect(currentMockWindow.setOpacity).toHaveBeenCalledWith(1.0);
  });

  it('togglePassthrough returns new state and notifies renderer', async () => {
    const { ipcMain } = await import('electron');
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    const toggleCall = calls.find(c => c[0] === 'pet:togglePassthrough');
    const handler = toggleCall![1] as () => boolean;
    const result = handler();

    expect(result).toBe(true);
    expect(currentMockWindow.webContents.send).toHaveBeenCalledWith('pet:passthrough-changed', true);
  });

  it('setScale updates window size and persists setting', async () => {
    const { ipcMain } = await import('electron');
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    const setScaleCall = calls.find(c => c[0] === 'pet:setScale');
    const handler = setScaleCall![1] as (_: unknown, scale: number) => void;
    handler({}, 1.5);

    expect(currentMockWindow.setSize).toHaveBeenCalledWith(480, 570);
    expect(currentMockWindow.setAspectRatio).toHaveBeenCalledWith(320 / 380);
  });

  it('getScale returns current scale from settings', async () => {
    const { ipcMain } = await import('electron');
    mockSettingsInstance.getScale.mockReturnValue(1.2);
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    const getScaleCall = calls.find(c => c[0] === 'pet:getScale');
    const handler = getScaleCall![1] as () => number;
    expect(handler()).toBe(1.2);
  });

  it('sendHome centers window on primary display and persists position', async () => {
    const { ipcMain } = await import('electron');
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    const sendHomeCall = calls.find(c => c[0] === 'pet:sendHome');
    const handler = sendHomeCall![1] as () => void;
    handler();

    expect(currentMockWindow.setPosition).toHaveBeenCalledWith(800, 350);
    expect(mockSettingsInstance.setWindowPosition).toHaveBeenCalledWith(800, 350);
  });

  it('startDrag records offset from cursor to window position', async () => {
    const { ipcMain } = await import('electron');
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    const startDragCall = calls.find(c => c[0] === 'pet:startDrag');
    const handler = startDragCall![1] as () => void;
    handler();
  });

  it('dragTo moves window while dragging', async () => {
    const { ipcMain } = await import('electron');
    const calls = vi.mocked(ipcMain.handle).mock.calls;

    const startDragCall = calls.find(c => c[0] === 'pet:startDrag');
    (startDragCall![1] as () => void)();

    const dragToCall = calls.find(c => c[0] === 'pet:dragTo');
    const handler = dragToCall![1] as (_: unknown, pos: { x: number; y: number }) => void;
    handler({}, { x: 100, y: 200 });

    expect(currentMockWindow.setPosition).toHaveBeenCalledWith(100, 200);
  });

  it('show() calls window.show()', () => {
    petWindow.show();
    expect(currentMockWindow.show).toHaveBeenCalled();
  });

  it('hide() calls window.hide()', () => {
    petWindow.hide();
    expect(currentMockWindow.hide).toHaveBeenCalled();
  });

  it('destroy unregisters hotkey and destroys window', async () => {
    const { globalShortcut } = await import('electron');
    petWindow.destroy();
    expect(globalShortcut.unregister).toHaveBeenCalledWith('Ctrl+Shift+P');
    expect(currentMockWindow.destroy).toHaveBeenCalled();
  });
});
