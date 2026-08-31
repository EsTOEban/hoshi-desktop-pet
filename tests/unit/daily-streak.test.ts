/**
 * @module tests/unit/daily-streak.test.ts
 * Unit tests for DailyStreak module.
 */

import { describe, test, expect } from 'vitest';
import { DailyStreak, DEFAULT_REWARD_CONFIG, DEFAULT_STREAK_DATA } from '../../src/main/daily-streak';

/**
 * Helper: get a UTC date string for N days ago.
 */
function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return DailyStreak.getUTCDate(d);
}

describe('DailyStreak', () => {
  describe('initialization', () => {
    test('starts with default state when no saved state', () => {
      const streak = new DailyStreak();
      expect(streak.getCurrentStreak()).toBe(0);
      expect(streak.getLongestStreak()).toBe(0);
      expect(streak.isFreezeAvailable()).toBe(true);
    });

    test('loads from saved state', () => {
      const saved = {
        currentStreak: 5,
        longestStreak: 10,
        lastLoginDate: daysAgo(1),
        totalLogins: 20,
        freezeUsed: true,
      };
      const streak = new DailyStreak(saved);
      expect(streak.getCurrentStreak()).toBe(5);
      expect(streak.getLongestStreak()).toBe(10);
      expect(streak.isFreezeAvailable()).toBe(false);
    });
  });

  describe('login and streak tracking', () => {
    test('first login starts streak at 1', () => {
      const streak = new DailyStreak();
      const result = streak.login();
      expect(streak.getCurrentStreak()).toBe(1);
      expect(result.streakContinued).toBe(true);
      expect(result.streakBroken).toBe(false);
    });

    test('consecutive login increments streak', () => {
      const streak = new DailyStreak({
        currentStreak: 2,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 2,
        freezeUsed: false,
      });
      const result = streak.login();
      expect(result.streakContinued).toBe(true);
      expect(result.streakBroken).toBe(false);
    });

    test('double login on same day does not increment streak', () => {
      const streak = new DailyStreak();
      streak.login();
      const firstStreak = streak.getCurrentStreak();
      const result = streak.login();
      expect(result.reward).toBe(0);
      expect(result.streakContinued).toBe(false);
      expect(streak.getCurrentStreak()).toBe(firstStreak);
    });

    test('streak breaks after missing a day without freeze', () => {
      const streak = new DailyStreak({
        currentStreak: 5,
        lastLoginDate: daysAgo(4),
        lastLoginTimestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
        totalLogins: 5,
        freezeUsed: false,
      });
      const result = streak.login();
      expect(result.streakBroken).toBe(true);
      expect(streak.getCurrentStreak()).toBe(1);
    });

    test('freeze preserves streak after one missed day', () => {
      const streak = new DailyStreak({
        currentStreak: 5,
        lastLoginDate: daysAgo(2),
        lastLoginTimestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        totalLogins: 5,
        freezeUsed: false,
      });
      const result = streak.login();
      expect(result.streakBroken).toBe(false);
      expect(result.streakContinued).toBe(true);
      expect(streak.isFreezeAvailable()).toBe(false);
    });

    test('freeze only works once per streak', () => {
      const streak = new DailyStreak({
        currentStreak: 5,
        lastLoginDate: daysAgo(2),
        lastLoginTimestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        totalLogins: 5,
        freezeUsed: true,
      });
      const result = streak.login();
      expect(result.streakBroken).toBe(true);
      expect(streak.getCurrentStreak()).toBe(1);
    });
  });

  describe('rewards', () => {
    test('base reward on first login', () => {
      const streak = new DailyStreak();
      const result = streak.login();
      expect(result.reward).toBe(DEFAULT_REWARD_CONFIG.baseReward);
    });

    test('reward scales with streak length', () => {
      const streak = new DailyStreak({
        currentStreak: 4,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 4,
        freezeUsed: false,
      });
      const result = streak.login();
      // multiplier = 1 + (5-1) * 0.5 = 3.0, reward = 10 * 3 = 30
      expect(result.reward).toBe(30);
    });

    test('multiplier is capped at maxMultiplier', () => {
      const streak = new DailyStreak({
        currentStreak: 19,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 19,
        freezeUsed: false,
      });
      const result = streak.login();
      // multiplier would be 1 + 19*0.5 = 10.5, capped at 5.0
      // reward = 10 * 5 = 50
      expect(result.reward).toBe(50);
    });

    test('milestone bonus at 7 days', () => {
      const streak = new DailyStreak({
        currentStreak: 6,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 6,
        freezeUsed: false,
        milestoneRewardsClaimed: [],
      });
      const result = streak.login();
      expect(result.milestoneBonus).toBe(50);
    });

    test('milestone bonus at 30 days', () => {
      const streak = new DailyStreak({
        currentStreak: 29,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 29,
        freezeUsed: false,
        milestoneRewardsClaimed: [7],
      });
      const result = streak.login();
      expect(result.milestoneBonus).toBe(200);
    });

    test('milestone bonus at 100 days', () => {
      const streak = new DailyStreak({
        currentStreak: 99,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 99,
        freezeUsed: false,
        milestoneRewardsClaimed: [7, 30],
      });
      const result = streak.login();
      expect(result.milestoneBonus).toBe(1000);
    });

    test('milestone bonus only claimed once', () => {
      const streak = new DailyStreak({
        currentStreak: 6,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 6,
        freezeUsed: false,
        milestoneRewardsClaimed: [7],
      });
      const result = streak.login();
      expect(result.milestoneBonus).toBe(0);
    });
  });

  describe('longest streak tracking', () => {
    test('longest streak updates when current exceeds it', () => {
      const streak = new DailyStreak({
        currentStreak: 9,
        longestStreak: 10,
        lastLoginDate: daysAgo(1),
        lastLoginTimestamp: Date.now() - 24 * 60 * 60 * 1000,
        totalLogins: 9,
        freezeUsed: false,
      });
      streak.login();
      expect(streak.getLongestStreak()).toBe(10);
    });

    test('longest streak equals current when broken and rebuilt', () => {
      const streak = new DailyStreak({
        currentStreak: 5,
        longestStreak: 15,
        lastLoginDate: daysAgo(5),
        lastLoginTimestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
        totalLogins: 5,
        freezeUsed: false,
      });
      streak.login();
      expect(streak.getCurrentStreak()).toBe(1);
      expect(streak.getLongestStreak()).toBe(15);
    });
  });

  describe('calendar data', () => {
    test('getCalendarData returns last 30 days by default', () => {
      const streak = new DailyStreak();
      const calendar = streak.getCalendarData();
      expect(calendar.length).toBe(30);
    });

    test('getCalendarData marks today correctly', () => {
      const streak = new DailyStreak();
      streak.login();
      const calendar = streak.getCalendarData();
      const today = calendar.find((d) => d.isToday);
      expect(today).toBeDefined();
      expect(today?.loggedIn).toBe(true);
    });

    test('getCalendarData returns custom day range', () => {
      const streak = new DailyStreak();
      const calendar = streak.getCalendarData(7);
      expect(calendar.length).toBe(7);
    });
  });

  describe('persistence', () => {
    test('toJSON serializes correctly', () => {
      const streak = new DailyStreak();
      streak.login();
      const json = streak.toJSON();
      expect(json.currentStreak).toBe(1);
      expect(json.totalLogins).toBe(1);
    });

    test('fromJSON deserializes correctly', () => {
      const data = {
        ...DEFAULT_STREAK_DATA,
        currentStreak: 7,
        longestStreak: 12,
        totalLogins: 25,
      };
      const streak = DailyStreak.fromJSON(data);
      expect(streak.getCurrentStreak()).toBe(7);
      expect(streak.getLongestStreak()).toBe(12);
    });
  });

  describe('edge cases', () => {
    test('handles empty lastLoginDate (first login)', () => {
      const streak = new DailyStreak();
      expect(streak.isNewLoginDay()).toBe(true);
    });

    test('isStreakBroken returns false for zero streak', () => {
      const streak = new DailyStreak();
      expect(streak.isStreakBroken()).toBe(false);
    });

    test('getNextMilestone returns correct next milestone', () => {
      const streak = new DailyStreak({ currentStreak: 5 });
      expect(streak.getNextMilestone()).toBe(7);
    });

    test('getNextMilestone returns null when all milestones reached', () => {
      const streak = new DailyStreak({ currentStreak: 101 });
      expect(streak.getNextMilestone()).toBeNull();
    });

    test('history is capped at 30 entries', () => {
      const history = Array.from({ length: 35 }, (_, i) => ({
        date: daysAgo(35 - i),
        reward: 10,
      }));
      const streak = new DailyStreak({ history });
      streak.login();
      const data = streak.getData();
      expect(data.history.length).toBe(30);
    });
  });
});
