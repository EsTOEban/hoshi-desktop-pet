/**
 * @module main/daily-streak
 * Daily streak tracking with login rewards.
 * Uses UTC midnight as day boundary for timezone safety.
 */

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string; // YYYY-MM-DD UTC
  lastLoginTimestamp: number;
  totalLogins: number;
  freezeUsed: boolean;
  freezeUsedDate: string | null;
  milestoneRewardsClaimed: number[]; // e.g., [7, 30, 100]
  history: { date: string; reward: number }[];
}

export interface RewardConfig {
  baseReward: number;
  streakMultiplier: number;
  maxMultiplier: number;
  milestoneRewards: Record<number, number>; // day -> bonus amount
  gracePeriodHours: number;
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  baseReward: 10,
  streakMultiplier: 0.5, // +50% per day
  maxMultiplier: 5.0, // cap at 5x
  milestoneRewards: {
    7: 50,
    30: 200,
    100: 1000,
  },
  gracePeriodHours: 24,
};

export const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: '',
  lastLoginTimestamp: 0,
  totalLogins: 0,
  freezeUsed: false,
  freezeUsedDate: null,
  milestoneRewardsClaimed: [],
  history: [],
};

export class DailyStreak {
  private data: StreakData;
  private config: RewardConfig;

  constructor(
    savedState?: Partial<StreakData>,
    config: RewardConfig = DEFAULT_REWARD_CONFIG
  ) {
    this.data = { ...DEFAULT_STREAK_DATA, ...savedState };
    this.config = config;
  }

  /**
   * Get today's date in UTC (YYYY-MM-DD).
   */
  static getUTCDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate the difference in days between two UTC dates.
   */
  static daysBetween(dateA: string, dateB: string): number {
    const a = new Date(dateA + 'T00:00:00Z').getTime();
    const b = new Date(dateB + 'T00:00:00Z').getTime();
    return Math.floor((b - a) / (24 * 60 * 60 * 1000));
  }

  /**
   * Get current streak data.
   */
  getData(): Readonly<StreakData> {
    return this.data;
  }

  /**
   * Check if today is a new login day.
   */
  isNewLoginDay(): boolean {
    const today = DailyStreak.getUTCDate();
    return this.data.lastLoginDate !== today;
  }

  /**
   * Check if the streak is currently broken (past grace period).
   */
  isStreakBroken(): boolean {
    if (this.data.currentStreak === 0) return false;
    const today = DailyStreak.getUTCDate();
    const days = DailyStreak.daysBetween(this.data.lastLoginDate, today);
    return days > 1 + this.config.gracePeriodHours / 24;
  }

  /**
   * Process a login and update streak state.
   * Returns the reward earned.
   */
  login(): { reward: number; streakContinued: boolean; streakBroken: boolean; milestoneBonus: number } {
    const today = DailyStreak.getUTCDate();

    // Already logged in today — no double-login
    if (this.data.lastLoginDate === today) {
      return { reward: 0, streakContinued: false, streakBroken: false, milestoneBonus: 0 };
    }

    const previousStreak = this.data.currentStreak;
    let streakContinued = false;
    let streakBroken = false;
    let milestoneBonus = 0;

    if (this.data.lastLoginDate === '') {
      // First ever login
      this.data.currentStreak = 1;
      streakContinued = true;
    } else {
      const daysDiff = DailyStreak.daysBetween(this.data.lastLoginDate, today);

      if (daysDiff === 1) {
        // Consecutive day — streak continues
        this.data.currentStreak = previousStreak + 1;
        streakContinued = true;
      } else if (daysDiff === 2 && !this.data.freezeUsed) {
        // One day missed — use freeze if available
        this.data.currentStreak = previousStreak + 1;
        this.data.freezeUsed = true;
        this.data.freezeUsedDate = today;
        streakContinued = true;
      } else {
        // Streak broken
        streakBroken = true;
        this.data.currentStreak = 1;
        this.data.freezeUsed = false;
        this.data.freezeUsedDate = null;
      }
    }

    // Update longest streak
    if (this.data.currentStreak > this.data.longestStreak) {
      this.data.longestStreak = this.data.currentStreak;
    }

    // Calculate reward
    const multiplier = Math.min(
      1 + (this.data.currentStreak - 1) * this.config.streakMultiplier,
      this.config.maxMultiplier
    );
    let reward = Math.floor(this.config.baseReward * multiplier);

    // Milestone bonus
    if (
      this.config.milestoneRewards[this.data.currentStreak] &&
      !this.data.milestoneRewardsClaimed.includes(this.data.currentStreak)
    ) {
      milestoneBonus = this.config.milestoneRewards[this.data.currentStreak];
      this.data.milestoneRewardsClaimed.push(this.data.currentStreak);
      reward += milestoneBonus;
    }

    // Update state
    this.data.lastLoginDate = today;
    this.data.lastLoginTimestamp = Date.now();
    this.data.totalLogins++;

    // Add to history (keep last 30 days)
    this.data.history.push({ date: today, reward });
    while (this.data.history.length > 30) {
      this.data.history.shift();
    }

    return { reward, streakContinued, streakBroken, milestoneBonus };
  }

  /**
   * Get the current streak count.
   */
  getCurrentStreak(): number {
    return this.data.currentStreak;
  }

  /**
   * Get the longest streak achieved.
   */
  getLongestStreak(): number {
    return this.data.longestStreak;
  }

  /**
   * Check if a freeze is available.
   */
  isFreezeAvailable(): boolean {
    return !this.data.freezeUsed;
  }

  /**
   * Get the next milestone day.
   */
  getNextMilestone(): number | null {
    const milestones = Object.keys(this.config.milestoneRewards)
      .map(Number)
      .sort((a, b) => a - b);
    return milestones.find((m) => m > this.data.currentStreak) ?? null;
  }

  /**
   * Get calendar data for the last N days.
   */
  getCalendarData(days: number = 30): { date: string; loggedIn: boolean; reward: number; isToday: boolean }[] {
    const result: { date: string; loggedIn: boolean; reward: number; isToday: boolean }[] = [];
    const today = DailyStreak.getUTCDate();
    const historyMap = new Map(this.data.history.map((h) => [h.date, h.reward]));

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = DailyStreak.getUTCDate(d);
      const loggedIn = historyMap.has(dateStr);
      result.push({
        date: dateStr,
        loggedIn,
        reward: historyMap.get(dateStr) ?? 0,
        isToday: dateStr === today,
      });
    }

    return result;
  }

  /**
   * Serialize for persistence.
   */
  toJSON(): StreakData {
    return { ...this.data };
  }

  /**
   * Create from persisted data.
   */
  static fromJSON(data: StreakData): DailyStreak {
    return new DailyStreak(data);
  }
}
