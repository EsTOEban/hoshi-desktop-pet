/**
 * @module tests/unit/voice-reactions.test.ts
 * Unit tests for VoiceReactionManager.
 */

import { vi, describe, test, expect, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { VoiceReactionManager, DEFAULT_VOICE_CONFIG } from '../../src/main/voice-reactions';
import { exec } from 'child_process';

const mockExec = vi.mocked(exec);

describe('VoiceReactionManager', () => {
  let manager: VoiceReactionManager;

  beforeEach(() => {
    manager = new VoiceReactionManager();
    mockExec.mockClear();
  });

  describe('initialization', () => {
    test('starts with default config', () => {
      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.volume).toBe(80);
      expect(config.rate).toBe(0);
    });

    test('can override config', () => {
      manager = new VoiceReactionManager({ volume: 50 });
      expect(manager.getConfig().volume).toBe(50);
    });
  });

  describe('toggle', () => {
    test('can disable voice', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);
    });

    test('can re-enable voice', () => {
      manager.setEnabled(false);
      manager.setEnabled(true);
      expect(manager.isEnabled()).toBe(true);
    });
  });

  describe('speak', () => {
    test('returns false when disabled', () => {
      manager.setEnabled(false);
      const result = manager.speak('Hello');
      expect(result).toBe(false);
    });

    test('returns true when enabled', () => {
      const result = manager.speak('Hello');
      expect(result).toBe(true);
    });

    test('respects cooldown', () => {
      manager.speak('First');
      const result = manager.speak('Second');
      expect(result).toBe(false);
    });

    test('allows after cooldown expires', () => {
      manager.setCooldown(0);
      manager.speak('First');
      const result = manager.speak('Second');
      expect(result).toBe(true);
    });

    test('exec is called with PowerShell command when enabled', () => {
      manager.setCooldown(0);
      manager.speak("It's a test");
      expect(mockExec).toHaveBeenCalled();
      const call = mockExec.mock.calls[0][0] as string;
      expect(call).toContain('powershell');
      expect(call).toContain("It''s a test");
    });
  });

  describe('getGreeting', () => {
    test('returns a greeting reaction', () => {
      const greeting = manager.getGreeting();
      expect(greeting.category).toBe('greeting');
      expect(greeting.text.length).toBeGreaterThan(0);
    });
  });

  describe('getCareReaction', () => {
    test('returns feed reaction', () => {
      const reaction = manager.getCareReaction('feed');
      expect(reaction.category).toBe('care');
      expect(['happy', 'excited']).toContain(reaction.mood);
    });

    test('returns play reaction', () => {
      const reaction = manager.getCareReaction('play');
      expect(reaction.category).toBe('care');
      expect(['happy', 'excited']).toContain(reaction.mood);
    });

    test('returns clean reaction', () => {
      const reaction = manager.getCareReaction('clean');
      expect(reaction.category).toBe('care');
      expect(['happy', 'excited']).toContain(reaction.mood);
    });
  });

  describe('getIdleReaction', () => {
    test('returns an idle reaction', () => {
      const reaction = manager.getIdleReaction();
      expect(reaction.category).toBe('idle');
      expect(reaction.text.length).toBeGreaterThan(0);
    });
  });

  describe('getMilestoneReaction', () => {
    test('returns milestone reaction with streak days', () => {
      const reaction = manager.getMilestoneReaction(7);
      expect(reaction.category).toBe('milestone');
      expect(reaction.text).toContain('7');
    });
  });
});
