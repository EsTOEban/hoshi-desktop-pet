/**
 * @module tests/unit/outfit-shop.test.ts
 * Unit tests for OutfitShop.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { OutfitShop, SHOP_CATALOG, DEFAULT_SHOP_STATE, DEFAULT_SHOP_CONFIG } from '../../src/main/outfit-shop';

describe('OutfitShop', () => {
  let shop: OutfitShop;

  beforeEach(() => {
    shop = new OutfitShop();
  });

  describe('initialization', () => {
    test('starts with default coins', () => {
      expect(shop.getCoins()).toBe(DEFAULT_SHOP_CONFIG.startingCoins);
    });

    test('starts with no owned items', () => {
      expect(shop.ownsItem('hat-baker')).toBe(false);
    });

    test('starts with no equipped items', () => {
      expect(shop.getAllEquipped()).toEqual({
        hat: null,
        outfit: null,
        accessory: null,
        background: null,
        effect: null,
      });
    });

    test('starts with zero mood boost', () => {
      expect(shop.getTotalMoodBoost()).toBe(0);
    });
  });

  describe('daily reward', () => {
    test('daily reward is available initially', () => {
      expect(shop.isDailyRewardReady()).toBe(true);
    });

    test('daily reward adds coins', () => {
      const reward = shop.claimDailyReward();
      expect(reward).toBe(DEFAULT_SHOP_CONFIG.dailyReward);
      expect(shop.getCoins()).toBe(DEFAULT_SHOP_CONFIG.startingCoins + DEFAULT_SHOP_CONFIG.dailyReward);
    });

    test('daily reward is not available again within 24h', () => {
      shop.claimDailyReward();
      expect(shop.isDailyRewardReady()).toBe(false);
    });

    test('daily reward is available again after 24h', () => {
      const now = 1000000;
      shop.claimDailyReward(now);
      expect(shop.isDailyRewardReady(now + 24 * 60 * 60 * 1000 + 1)).toBe(true);
    });

    test('daily reward returns 0 if not ready', () => {
      shop.claimDailyReward();
      expect(shop.claimDailyReward()).toBe(0);
    });
  });

  describe('catalog', () => {
    test('getCatalog returns all non-hidden items', () => {
      const catalog = shop.getCatalog();
      expect(catalog.length).toBe(SHOP_CATALOG.length);
    });

    test('getCatalogByCategory filters correctly', () => {
      const hats = shop.getCatalogByCategory('hat');
      expect(hats.length).toBe(3);
      hats.forEach(item => expect(item.category).toBe('hat'));
    });

    test('catalog is sorted by rarity desc then cost asc', () => {
      const catalog = shop.getCatalog();
      for (let i = 1; i < catalog.length; i++) {
        const prev = catalog[i - 1];
        const curr = catalog[i];
        if (prev.rarity === curr.rarity) {
          expect(prev.cost).toBeLessThanOrEqual(curr.cost);
        }
      }
    });
  });

  describe('purchasing', () => {
    test('can purchase an item with enough coins', () => {
      shop.addCoins(100);
      expect(shop.purchase('hat-baker')).toBe(true);
      expect(shop.ownsItem('hat-baker')).toBe(true);
      expect(shop.getCoins()).toBe(100 + DEFAULT_SHOP_CONFIG.startingCoins - 75);
    });

    test('cannot purchase an item without enough coins', () => {
      expect(shop.purchase('hat-crown')).toBe(false);
      expect(shop.ownsItem('hat-crown')).toBe(false);
    });

    test('cannot purchase an already owned item', () => {
      shop.addCoins(1000);
      expect(shop.purchase('hat-baker')).toBe(true);
      const coinsAfterFirst = shop.getCoins();
      expect(shop.purchase('hat-baker')).toBe(false);
      expect(shop.getCoins()).toBe(coinsAfterFirst);
    });

    test('cannot purchase a hidden item', () => {
      shop.addCoins(10000);
      // Crown is not hidden, but let's test with a custom catalog containing hidden item
      const customShop = new OutfitShop({}, {}, [
        { id: 'test', name: 'Test', category: 'hat', description: '', cost: 10, rarity: 'common', hidden: true },
      ]);
      customShop.addCoins(1000);
      expect(customShop.purchase('test')).toBe(false);
    });
  });

  describe('equipping', () => {
    test('can equip an owned item', () => {
      shop.addCoins(200);
      shop.purchase('hat-baker');
      expect(shop.equip('hat-baker')).toBe(true);
      expect(shop.getEquipped('hat')).not.toBeNull();
      expect(shop.getEquipped('hat')?.id).toBe('hat-baker');
    });

    test('cannot equip an unowned item', () => {
      expect(shop.equip('hat-baker')).toBe(false);
    });

    test('cannot equip a non-existent item', () => {
      expect(shop.equip('does-not-exist')).toBe(false);
    });

    test('unequip removes item from category', () => {
      shop.addCoins(200);
      shop.purchase('hat-baker');
      shop.equip('hat-baker');
      shop.unequip('hat');
      expect(shop.getEquipped('hat')).toBeNull();
    });

    test('equipping same-category item replaces previous', () => {
      shop.addCoins(1000);
      shop.purchase('hat-baker');
      shop.purchase('hat-cowboy');
      shop.equip('hat-baker');
      shop.equip('hat-cowboy');
      expect(shop.getEquipped('hat')?.id).toBe('hat-cowboy');
    });
  });

  describe('mood boost', () => {
    test('mood boost from equipped items', () => {
      shop.addCoins(1000);
      shop.purchase('hat-crown'); // legendary, moodBoost: 5
      shop.equip('hat-crown');
      expect(shop.getTotalMoodBoost()).toBe(5);
    });

    test('mood boost stacks across categories', () => {
      shop.addCoins(2000);
      shop.purchase('hat-crown'); // 5
      shop.purchase('outfit-formal'); // 3
      shop.equip('hat-crown');
      shop.equip('outfit-formal');
      expect(shop.getTotalMoodBoost()).toBe(8);
    });
  });

  describe('persistence', () => {
    test('toJSON and fromJSON round-trips state', () => {
      shop.addCoins(500);
      shop.purchase('hat-baker');
      shop.equip('hat-baker');
      shop.claimDailyReward();

      const json = shop.toJSON();
      const restored = OutfitShop.fromJSON(json);

      expect(restored.getCoins()).toBe(shop.getCoins());
      expect(restored.ownsItem('hat-baker')).toBe(true);
      expect(restored.getEquipped('hat')?.id).toBe('hat-baker');
    });
  });

  describe('addCoins', () => {
    test('addCoins increases balance', () => {
      expect(shop.getCoins()).toBe(100);
      shop.addCoins(50);
      expect(shop.getCoins()).toBe(150);
    });

    test('addCoins updates totalEarned', () => {
      shop.addCoins(50);
      expect(shop.getTotalEarned()).toBe(150);
    });

    test('addCoins with zero or negative does nothing', () => {
      const before = shop.getCoins();
      shop.addCoins(0);
      expect(shop.getCoins()).toBe(before);
      shop.addCoins(-50);
      expect(shop.getCoins()).toBe(before);
    });
  });

  describe('purchase deducts correctly', () => {
    test('totalSpent tracks spending', () => {
      shop.addCoins(1000);
      shop.purchase('hat-baker'); // 75
      shop.purchase('accessory-bow'); // 60
      expect(shop.getTotalSpent()).toBe(135);
    });
  });
});
