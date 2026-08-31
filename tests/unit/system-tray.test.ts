/**
 * @module tests/unit/system-tray.test.ts
 * Unit tests for SystemTrayManager.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemTrayManager, DEFAULT_TRAY_CONFIG } from '../../src/main/system-tray';

// Mock electron
vi.mock('electron', () => ({
  Tray: vi.fn().mockImplementation(() => ({
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  })),
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({}),
  },
  BrowserWindow: vi.fn(),
  nativeImage: {
    createEmpty: vi.fn().mockReturnValue({}),
  },
}));

describe('SystemTrayManager', () => {
  let manager: SystemTrayManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new SystemTrayManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.destroy();
  });

  describe('initialization', () => {
    test('constructor starts a session automatically', () => {
      expect(manager.getRunModel().sessionCount).toBe(1);
      expect(manager.getRunModel().currentSession).not.toBeNull();
    });

    test('has correct default config', () => {
      expect(DEFAULT_TRAY_CONFIG.showPetStatus).toBe(true);
      expect(DEFAULT_TRAY_CONFIG.showRunTime).toBe(true);
      expect(DEFAULT_TRAY_CONFIG.quickActions).toContain('feed');
      expect(DEFAULT_TRAY_CONFIG.updateIntervalMs).toBe(30000);
    });
  });

  describe('session tracking', () => {
    test('tracks session duration', () => {
      // Constructor already started a session, so just advance time
      vi.advanceTimersByTime(5000);
      expect(manager.getCurrentSessionDuration()).toBeGreaterThanOrEqual(5000);
    });

    test('ends session correctly', () => {
      vi.advanceTimersByTime(10000);
      manager.endSession();
      expect(manager.getCurrentSessionDuration()).toBe(0);
      expect(manager.getRunModel().totalRunTime).toBeGreaterThanOrEqual(10000);
    });

    test('calculates average session time', () => {
      vi.advanceTimersByTime(10000);
      manager.endSession();

      manager.startSession();
      vi.advanceTimersByTime(20000);
      manager.endSession();

      expect(manager.getRunModel().averageSession).toBeGreaterThanOrEqual(15000);
    });

    test('tracks longest session', () => {
      vi.advanceTimersByTime(5000);
      manager.endSession();

      manager.startSession();
      vi.advanceTimersByTime(30000);
      manager.endSession();

      expect(manager.getRunModel().longestSession).toBeGreaterThanOrEqual(30000);
    });
  });

  describe('formatDuration', () => {
    test('formats seconds', () => {
      expect(manager.formatDuration(5000)).toBe('5s');
    });

    test('formats minutes', () => {
      expect(manager.formatDuration(60000)).toBe('1m 0s');
      expect(manager.formatDuration(90000)).toBe('1m 30s');
    });

    test('formats hours', () => {
      expect(manager.formatDuration(3600000)).toBe('1h 0m');
      expect(manager.formatDuration(5400000)).toBe('1h 30m');
    });

    test('formats days', () => {
      expect(manager.formatDuration(86400000)).toBe('1d 0h');
      expect(manager.formatDuration(90000000)).toBe('1d 1h');
    });
  });

  describe('toJSON/fromJSON', () => {
    test('serializes and restores run data', () => {
      vi.advanceTimersByTime(5000);
      manager.endSession();

      const json = manager.toJSON();
      const restored = SystemTrayManager.fromJSON(json);

      // Verify total run time is preserved (exact count varies due to constructor auto-start)
      expect(restored.getRunModel().totalRunTime).toBeGreaterThanOrEqual(5000);
      expect(restored.getRunModel().longestSession).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('run model', () => {
    test('initial run model has active session from constructor', () => {
      const runModel = manager.getRunModel();
      expect(runModel.totalRunTime).toBe(0);
      expect(runModel.averageSession).toBe(0);
      expect(runModel.longestSession).toBe(0);
      expect(runModel.sessionCount).toBe(1);
      expect(runModel.currentSession).not.toBeNull();
    });
  });
});
