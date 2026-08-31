/**
 * @module main/seasonal-events
 * Seasonal and holiday event system.
 * Triggers special activities, decorations, and behaviors based on calendar dates.
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  startDate: string; // MM-DD
  endDate: string;   // MM-DD
  season: Season;
  moodBoost: string;
  specialActivity?: string;
  decorationTheme?: string;
}

export interface ActiveEvent extends SeasonalEvent {
  daysRemaining: number;
  isActive: boolean;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'new-year',
    name: "New Year's Celebration",
    description: 'Ring in the new year with special fireworks!',
    startDate: '01-01',
    endDate: '01-02',
    season: 'winter',
    moodBoost: 'excited',
    specialActivity: 'fireworks',
    decorationTheme: 'fireworks',
  },
  {
    id: 'valentines',
    name: "Valentine's Day",
    description: 'Spread the love with special heart decorations!',
    startDate: '02-14',
    endDate: '02-14',
    season: 'winter',
    moodBoost: 'happy',
    specialActivity: 'give-gift',
    decorationTheme: 'hearts',
  },
  {
    id: 'spring-equinox',
    name: 'Spring Equinox',
    description: 'Flowers bloom and the pet feels refreshed!',
    startDate: '03-20',
    endDate: '03-22',
    season: 'spring',
    moodBoost: 'happy',
    specialActivity: 'flower-viewing',
    decorationTheme: 'cherry-blossoms',
  },
  {
    id: 'easter',
    name: 'Easter',
    description: 'Egg hunt and spring festivities!',
    startDate: '04-01',
    endDate: '04-30',
    season: 'spring',
    moodBoost: 'excited',
    specialActivity: 'egg-hunt',
    decorationTheme: 'easter-eggs',
  },
  {
    id: 'summer-solstice',
    name: 'Summer Solstice',
    description: 'Longest day of the year — extra play time!',
    startDate: '06-21',
    endDate: '06-22',
    season: 'summer',
    moodBoost: 'energetic',
    specialActivity: 'beach-party',
    decorationTheme: 'tropical',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    description: 'Spooky decorations and trick-or-treating!',
    startDate: '10-25',
    endDate: '10-31',
    season: 'autumn',
    moodBoost: 'excited',
    specialActivity: 'trick-or-treat',
    decorationTheme: 'halloween',
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    description: 'A time for gratitude and feasting!',
    startDate: '11-22',
    endDate: '11-28',
    season: 'autumn',
    moodBoost: 'happy',
    specialActivity: 'feast',
    decorationTheme: 'autumn-leaves',
  },
  {
    id: 'christmas',
    name: 'Christmas',
    description: 'Holiday cheer with gifts and decorations!',
    startDate: '12-20',
    endDate: '12-26',
    season: 'winter',
    moodBoost: 'happy',
    specialActivity: 'open-gifts',
    decorationTheme: 'christmas',
  },
  {
    id: 'winter-solstice',
    name: 'Winter Solstice',
    description: 'Shortest day, longest night — cozy up!',
    startDate: '12-21',
    endDate: '12-23',
    season: 'winter',
    moodBoost: 'sleepy',
    specialActivity: 'hot-cocoa',
    decorationTheme: 'snowflakes',
  },
];

export class SeasonalEventManager {
  private events: SeasonalEvent[];
  private activeEventIds: Set<string> = new Set();

  constructor(customEvents?: SeasonalEvent[]) {
    this.events = customEvents ? [...customEvents] : [...SEASONAL_EVENTS];
  }

  /**
   * Get the current season based on month.
   */
  static getCurrentSeason(date: Date = new Date()): Season {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Check if a date falls within an event's date range.
   */
  private isDateInRange(date: Date, startDate: string, endDate: string): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const current = month * 100 + day; // MMDD format

    const [startMonth, startDay] = startDate.split('-').map(Number);
    const [endMonth, endDay] = endDate.split('-').map(Number);
    const start = startMonth * 100 + startDay;
    const end = endMonth * 100 + endDay;

    return current >= start && current <= end;
  }

  /**
   * Get all active events for a given date.
   */
  getActiveEvents(date: Date = new Date()): ActiveEvent[] {
    const active: ActiveEvent[] = [];

    for (const event of this.events) {
      if (this.isDateInRange(date, event.startDate, event.endDate)) {
        const [, endMonth, endDay] = event.endDate.split('-').map(Number);
        const endDate = new Date(date.getFullYear(), endMonth - 1, endDay);
        const daysRemaining = Math.ceil((endDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        active.push({
          ...event,
          daysRemaining: Math.max(0, daysRemaining),
          isActive: true,
        });
      }
    }

    return active;
  }

  /**
   * Check if any events are currently active.
   */
  hasActiveEvents(date: Date = new Date()): boolean {
    return this.getActiveEvents(date).length > 0;
  }

  /**
   * Get the current season.
   */
  getCurrentSeasonForDate(date: Date = new Date()): Season {
    return SeasonalEventManager.getCurrentSeason(date);
  }

  /**
   * Get upcoming events within the next N days.
   */
  getUpcomingEvents(daysAhead: number = 30, date: Date = new Date()): ActiveEvent[] {
    const upcoming: ActiveEvent[] = [];

    for (const event of this.events) {
      const [startMonth, startDay] = event.startDate.split('-').map(Number);
      const startDate = new Date(date.getFullYear(), startMonth - 1, startDay);

      // If the event already passed this year, check next year
      if (startDate < date) {
        startDate.setFullYear(startDate.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((startDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil >= 0 && daysUntil <= daysAhead) {
        const [, endMonth, endDay] = event.endDate.split('-').map(Number);
        const endDate = new Date(startDate.getFullYear(), endMonth - 1, endDay);
        const daysRemaining = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        upcoming.push({
          ...event,
          daysRemaining,
          isActive: false,
        });
      }
    }

    return upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Get the mood boost for the current date.
   */
  getMoodBoost(date: Date = new Date()): string | null {
    const active = this.getActiveEvents(date);
    if (active.length === 0) return null;
    // Return the mood boost of the first active event
    return active[0].moodBoost;
  }

  /**
   * Get the decoration theme for the current date.
   */
  getDecorationTheme(date: Date = new Date()): string | null {
    const active = this.getActiveEvents(date);
    if (active.length === 0) return null;
    return active[0].decorationTheme || null;
  }

  /**
   * Get all events.
   */
  getAllEvents(): SeasonalEvent[] {
    return [...this.events];
  }

  /**
   * Add a custom event.
   */
  addEvent(event: SeasonalEvent): void {
    this.events.push(event);
  }

  /**
   * Remove an event by ID.
   */
  removeEvent(id: string): boolean {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) return false;
    this.events.splice(index, 1);
    return true;
  }
}
