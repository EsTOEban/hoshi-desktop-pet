/**
 * @module tests/unit/notifications.test.ts
 * Unit tests for NotificationManager.
 */

const { mockExec } = vi.hoisted(() => ({
  mockExec: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: mockExec,
}));

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NotificationManager } from '../../src/main/notifications';

describe('NotificationManager', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    manager = new NotificationManager();
    mockExec.mockClear();
  });

  describe('initialization', () => {
    test('starts enabled by default', () => {
      expect(manager.isEnabled()).toBe(true);
    });
  });

  describe('toggle', () => {
    test('can disable notifications', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);
    });

    test('can re-enable notifications', () => {
      manager.setEnabled(false);
      manager.setEnabled(true);
      expect(manager.isEnabled()).toBe(true);
    });
  });

  describe('show', () => {
    test('returns true when enabled', () => {
      const result = manager.show({ title: 'Test', message: 'Hello' });
      expect(result).toBe(true);
    });

    test('returns false when disabled', () => {
      manager.setEnabled(false);
      const result = manager.show({ title: 'Test', message: 'Hello' });
      expect(result).toBe(false);
    });

    test('respects cooldown', () => {
      manager.show({ title: 'First', message: 'Hello' });
      const result = manager.show({ title: 'Second', message: 'World' });
      expect(result).toBe(false);
    });

    test('allows after cooldown expires', () => {
      manager.setCooldown(0);
      manager.show({ title: 'First', message: 'Hello' });
      const result = manager.show({ title: 'Second', message: 'World' });
      expect(result).toBe(true);
    });

    test('exec is called with PowerShell command when enabled', () => {
      manager.setCooldown(0);
      manager.show({ title: "It's a test", message: "You're awesome" });
      expect(mockExec).toHaveBeenCalled();
      const call = mockExec.mock.calls[0][0] as string;
      expect(call).toContain('powershell');
      expect(call).toContain("It''s a test");
      expect(call).toContain("You''re awesome");
    });
  });

  describe('showPetReaction', () => {
    test('shows notification with mood emoji', () => {
      const result = manager.showPetReaction('happy', 'I am happy!');
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalled();
      const call = mockExec.mock.calls[0][0] as string;
      expect(call).toContain('Darkness');
    });

    test('uses default emoji for unknown mood', () => {
      manager.setCooldown(0);
      const result = manager.showPetReaction('unknown_mood', 'Test');
      expect(result).toBe(true);
    });
  });
});
