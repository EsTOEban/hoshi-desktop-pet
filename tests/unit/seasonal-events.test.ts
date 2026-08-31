/**
 * @module tests/unit/seasonal-events.test.ts
 * Unit tests for SeasonalEventManager.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SeasonalEventManager, SEASONAL_EVENTS, SeasonalEvent } from '../../src/main/seasonal-events';

describe('SeasonalEventManager', () => {
  let manager: SeasonalEventManager;

  beforeEach(() => {
    manager = new SeasonalEventManager();
  });

  describe('getCurrentSeason', () => {
    test('returns winter for January', () => {
      expect(SeasonalEventManager.getCurrentSeason(new Date(2026, 0, 1))).toBe('winter');
    });

    test('returns spring for April', () => {
      expect(SeasonalEventManager.getCurrentSeason(new Date(2026, 3, 1))).toBe('spring');
    });

    test('returns summer for July', () => {
      expect(SeasonalEventManager.getCurrentSeason(new Date(2026, 6, 1))).toBe('summer');
    });

    test('returns autumn for October', () => {
      expect(SeasonalEventManager.getCurrentSeason(new Date(2026, 9, 1))).toBe('autumn');
    });
  });

  describe('getActiveEvents', () => {
    test('returns active events for a date within range', () => {
      const christmas = new Date(2026, 11, 25);
      const active = manager.getActiveEvents(christmas);
      expect(active.length).toBeGreaterThan(0);
      expect(active[0].id).toBe('christmas');
    });

    test('returns empty for a date with no events', () => {
      const random = new Date(2026, 5, 15);
      const active = manager.getActiveEvents(random);
      expect(active).toHaveLength(0);
    });

    test('returns multiple events if overlapping', () => {
      // Dec 21 is in both christmas (12-20 to 12-26) and winter-solstice (12-21 to 12-23)
      const date = new Date(2026, 11, 21);
      const active = manager.getActiveEvents(date);
      expect(active.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('hasActiveEvents', () => {
    test('returns true when events are active', () => {
      const christmas = new Date(2026, 11, 25);
      expect(manager.hasActiveEvents(christmas)).toBe(true);
    });

    test('returns false when no events are active', () => {
      const random = new Date(2026, 5, 15);
      expect(manager.hasActiveEvents(random)).toBe(false);
    });
  });

  describe('getUpcomingEvents', () => {
    test('returns events within the next N days', () => {
      const dec17 = new Date(2026, 11, 17);
      const upcoming = manager.getUpcomingEvents(7, dec17);
      expect(upcoming.length).toBeGreaterThan(0);
    });

    test('returns empty for dates far from any event', () => {
      const july4 = new Date(2026, 6, 4);
      const upcoming = manager.getUpcomingEvents(7, july4);
      expect(upcoming).toHaveLength(0);
    });
  });

  describe('getMoodBoost', () => {
    test('returns mood boost for active event', () => {
      const christmas = new Date(2026, 11, 25);
      expect(manager.getMoodBoost(christmas)).toBe('happy');
    });

    test('returns null when no events active', () => {
      const random = new Date(2026, 5, 15);
      expect(manager.getMoodBoost(random)).toBeNull();
    });
  });

  describe('getDecorationTheme', () => {
    test('returns decoration theme for active event', () => {
      const halloween = new Date(2026, 9, 31);
      expect(manager.getDecorationTheme(halloween)).toBe('halloween');
    });

    test('returns null when no events active', () => {
      const random = new Date(2026, 5, 15);
      expect(manager.getDecorationTheme(random)).toBeNull();
    });
  });

  describe('getAllEvents', () => {
    test('returns all predefined events', () => {
      const events = manager.getAllEvents();
      expect(events.length).toBe(SEASONAL_EVENTS.length);
    });
  });

  describe('addEvent', () => {
    test('adds a custom event', () => {
      const customEvent: SeasonalEvent = {
        id: 'test-event',
        name: 'Test Event',
        description: 'A test event',
        startDate: '06-15',
        endDate: '06-16',
        season: 'summer',
        moodBoost: 'excited',
      };
      manager.addEvent(customEvent);
      expect(manager.getAllEvents().length).toBe(SEASONAL_EVENTS.length + 1);
    });
  });

  describe('removeEvent', () => {
    test('removes an event by ID', () => {
      expect(manager.removeEvent('christmas')).toBe(true);
      expect(manager.getAllEvents().length).toBe(SEASONAL_EVENTS.length - 1);
    });

    test('returns false for non-existent ID', () => {
      expect(manager.removeEvent('non-existent')).toBe(false);
    });
  });

  describe('predefined events', () => {
    test('has christmas event', () => {
      const events = manager.getAllEvents();
      const christmas = events.find((e) => e.id === 'christmas');
      expect(christmas).toBeDefined();
      expect(christmas?.startDate).toBe('12-20');
      expect(christmas?.endDate).toBe('12-26');
    });

    test('has halloween event', () => {
      const events = manager.getAllEvents();
      const halloween = events.find((e) => e.id === 'halloween');
      expect(halloween).toBeDefined();
      expect(halloween?.moodBoost).toBe('excited');
    });

    test('has new year event', () => {
      const events = manager.getAllEvents();
      const newYear = events.find((e) => e.id === 'new-year');
      expect(newYear).toBeDefined();
      expect(newYear?.startDate).toBe('01-01');
    });
  });
});
