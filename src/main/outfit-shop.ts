/**
 * @module main/outfit-shop
 * Outfit/Accessory Shop system.
 * Manages purchasable items, currency, equipped items, and outfit effects.
 */

export type ItemCategory = 'hat' | 'outfit' | 'accessory' | 'background' | 'effect';

export interface ShopItem {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  cost: number;
  /** Asset path for this item's image */
  assetPath?: string;
  /** Optional mood boost applied when equipped */
  moodBoost?: number;
  /** Item rarity */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  /** Whether item is equipped */
  equipped?: boolean;
  /** Whether item is hidden from shop (special/seasonal) */
  hidden?: boolean;
}

export interface ShopState {
  /** Coins balance */
  coins: number;
  /** Owned item IDs */
  ownedItems: string[];
  /** Equipped item slots */
  equippedItems: Record<ItemCategory, string | null>;
  /** Last daily reward timestamp */
  lastDailyReward?: number;
  /** Total coins ever earned */
  totalEarned: number;
  /** Total coins ever spent */
  totalSpent: number;
}

export interface ShopConfig {
  /** Daily login coin reward */
  dailyReward?: number;
  /** Starting coin balance */
  startingCoins?: number;
}

export const DEFAULT_SHOP_CONFIG: Required<ShopConfig> = {
  dailyReward: 50,
  startingCoins: 100,
};

const RARITY_ORDER: Record<ShopItem['rarity'], number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

/**
 * Predefined shop catalog. In a production build this could be loaded
 * from a JSON file to allow live updates without recompiling.
 */
export const SHOP_CATALOG: ShopItem[] = [
  {
    id: 'hat-baker',
    name: "Baker's Hat",
    category: 'hat',
    description: 'A classic baker hat for the discerning pet.',
    cost: 75,
    rarity: 'common',
  },
  {
    id: 'hat-cowboy',
    name: 'Cowboy Hat',
    category: 'hat',
    description: 'Yeehaw! A rugged western hat.',
    cost: 150,
    rarity: 'uncommon',
  },
  {
    id: 'hat-crown',
    name: 'Royal Crown',
    category: 'hat',
    description: 'Fit for royalty. Shines with prestige.',
    cost: 500,
    rarity: 'legendary',
    moodBoost: 5,
  },
  {
    id: 'outfit-casual',
    name: 'Casual Outfit',
    category: 'outfit',
    description: 'Comfortable everyday wear.',
    cost: 100,
    rarity: 'common',
  },
  {
    id: 'outfit-formal',
    name: 'Formal Attire',
    category: 'outfit',
    description: 'Sharp and sophisticated.',
    cost: 300,
    rarity: 'rare',
    moodBoost: 3,
  },
  {
    id: 'accessory-bow',
    name: 'Cute Bow',
    category: 'accessory',
    description: 'An adorable bow accessory.',
    cost: 60,
    rarity: 'common',
  },
  {
    id: 'accessory-glasses',
    name: 'Cool Shades',
    category: 'accessory',
    description: 'Too cool for school.',
    cost: 200,
    rarity: 'uncommon',
    moodBoost: 2,
  },
  {
    id: 'bg-space',
    name: 'Space Background',
    category: 'background',
    description: 'A starry cosmic backdrop.',
    cost: 400,
    rarity: 'rare',
  },
  {
    id: 'effect-sparkle',
    name: 'Sparkle Effect',
    category: 'effect',
    description: 'Glittering sparkles surround your pet.',
    cost: 250,
    rarity: 'uncommon',
    moodBoost: 1,
  },
];

export const DEFAULT_SHOP_STATE: ShopState = {
  coins: DEFAULT_SHOP_CONFIG.startingCoins,
  ownedItems: [],
  equippedItems: {
    hat: null,
    outfit: null,
    accessory: null,
    background: null,
    effect: null,
  },
  totalEarned: DEFAULT_SHOP_CONFIG.startingCoins,
  totalSpent: 0,
};

export class OutfitShop {
  private state: ShopState;
  private config: Required<ShopConfig>;

  constructor(
    state: Partial<ShopState> = {},
    config: ShopConfig = {},
    private catalog: ShopItem[] = SHOP_CATALOG
  ) {
    this.config = { ...DEFAULT_SHOP_CONFIG, ...config };
    this.state = {
      ...DEFAULT_SHOP_STATE,
      ...state,
      ownedItems: [...(state.ownedItems ?? DEFAULT_SHOP_STATE.ownedItems)],
      equippedItems: { ...DEFAULT_SHOP_STATE.equippedItems, ...(state.equippedItems ?? {}) },
    };
  }

  // --- Currency ---

  getCoins(): number {
    return this.state.coins;
  }

  getTotalEarned(): number {
    return this.state.totalEarned;
  }

  getTotalSpent(): number {
    return this.state.totalSpent;
  }

  /**
   * Add coins to the balance (from rewards, minigames, etc.).
   */
  addCoins(amount: number): void {
    if (amount <= 0) return;
    this.state.coins += amount;
    this.state.totalEarned += amount;
  }

  // --- Daily Reward ---

  /**
   * Check if the daily reward is available.
   */
  isDailyRewardReady(now: number = Date.now()): boolean {
    if (!this.state.lastDailyReward) return true;
    const elapsed = now - this.state.lastDailyReward;
    return elapsed >= 24 * 60 * 60 * 1000;
  }

  /**
   * Claim the daily coin reward.
   * @returns The amount rewarded, or 0 if not ready.
   */
  claimDailyReward(now: number = Date.now()): number {
    if (!this.isDailyRewardReady(now)) return 0;
    const amount = this.config.dailyReward;
    this.addCoins(amount);
    this.state.lastDailyReward = now;
    return amount;
  }

  // --- Shop Catalog ---

  /**
   * Get all visible shop items (not hidden).
   */
  getCatalog(): ShopItem[] {
    return this.catalog
      .filter((item) => !item.hidden)
      .sort((a, b) => {
        // Sort by rarity desc, then cost asc
        const r = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
        return r !== 0 ? r : a.cost - b.cost;
      });
  }

  /**
   * Get items filtered by category.
   */
  getCatalogByCategory(category: ItemCategory): ShopItem[] {
    return this.getCatalog().filter((item) => item.category === category);
  }

  // --- Purchasing ---

  /**
   * Check if the player owns a given item.
   */
  ownsItem(itemId: string): boolean {
    return this.state.ownedItems.includes(itemId);
  }

  /**
   * Attempt to purchase an item.
   * @returns true if purchase succeeded.
   */
  purchase(itemId: string): boolean {
    const item = this.catalog.find((i) => i.id === itemId);
    if (!item || item.hidden) return false;
    if (this.ownsItem(itemId)) return false;
    if (this.state.coins < item.cost) return false;

    this.state.coins -= item.cost;
    this.state.totalSpent += item.cost;
    this.state.ownedItems.push(itemId);
    return true;
  }

  // --- Equipping ---

  /**
   * Get the currently equipped item for a category.
   */
  getEquipped(category: ItemCategory): ShopItem | null {
    const id = this.state.equippedItems[category];
    if (!id) return null;
    return this.catalog.find((i) => i.id === id) ?? null;
  }

  /**
   * Get all equipped items.
   */
  getAllEquipped(): Record<ItemCategory, ShopItem | null> {
    const result = {} as Record<ItemCategory, ShopItem | null>;
    for (const cat of Object.keys(this.state.equippedItems) as ItemCategory[]) {
      result[cat] = this.getEquipped(cat);
    }
    return result;
  }

  /**
   * Equip an item. Returns false if not owned or item doesn't exist.
   */
  equip(itemId: string): boolean {
    const item = this.catalog.find((i) => i.id === itemId);
    if (!item) return false;
    if (!this.ownsItem(itemId)) return false;

    this.state.equippedItems[item.category] = itemId;
    return true;
  }

  /**
   * Unequip an item from its category.
   */
  unequip(category: ItemCategory): void {
    this.state.equippedItems[category] = null;
  }

  /**
   * Get the total mood boost from all equipped items.
   */
  getTotalMoodBoost(): number {
    let total = 0;
    for (const cat of Object.keys(this.state.equippedItems) as ItemCategory[]) {
      const item = this.getEquipped(cat);
      if (item?.moodBoost) {
        total += item.moodBoost;
      }
    }
    return total;
  }

  // --- Persistence ---

  toJSON(): { state: ShopState; config: Required<ShopConfig> } {
    return {
      state: {
        ...this.state,
        equippedItems: { ...this.state.equippedItems },
      },
      config: { ...this.config },
    };
  }

  static fromJSON(
    json: { state: ShopState; config: Required<ShopConfig> },
    catalog: ShopItem[] = SHOP_CATALOG
  ): OutfitShop {
    return new OutfitShop(json.state, json.config, catalog);
  }
}
