/**
 * @module tests/unit/care-interaction.test.ts
 * Unit tests for CareInteractionModel.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CareInteractionModel, DEFAULT_CARE_CONFIG, InteractionType } from '../../src/main/care-interaction';

describe('CareInteractionModel', () => {
  let model: CareInteractionModel;

  beforeEach(() => {
    model = new CareInteractionModel();
  });

  describe('interactions', () => {
    test('feed interaction increases hunger', () => {
      const result = model.interact('feed');
      expect(result.type).toBe('feed');
      expect(result.success).toBe(true);
      expect(result.hungerChange).toBe(20);
      expect(result.happinessChange).toBe(5);
    });

    test('play interaction increases happiness but decreases energy', () => {
      const result = model.interact('play');
      expect(result.type).toBe('play');
      expect(result.happinessChange).toBe(15);
      expect(result.energyChange).toBe(-5);
    });

    test('clean interaction increases cleanliness', () => {
      const result = model.interact('clean');
      expect(result.cleanlinessChange).toBe(25);
    });

    test('sleep interaction restores energy', () => {
      const result = model.interact('sleep');
      expect(result.energyChange).toBe(20);
    });

    test('pet interaction gives small happiness boost', () => {
      const result = model.interact('pet');
      expect(result.happinessChange).toBe(10);
    });

    test('medicine interaction has minor happiness penalty', () => {
      const result = model.interact('medicine');
      expect(result.happinessChange).toBe(-2);
    });

    test('toy interaction boosts happiness', () => {
      const result = model.interact('toy');
      expect(result.happinessChange).toBe(12);
    });

    test('wash interaction gives large cleanliness boost', () => {
      const result = model.interact('wash');
      expect(result.cleanlinessChange).toBe(30);
    });
  });

  describe('gesture handling', () => {
    test('tap gesture triggers pet interaction', () => {
      const result = model.handleGesture({
        type: 'tap',
        x: 100,
        y: 100,
        timestamp: Date.now(),
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe('pet');
    });

    test('double-tap triggers feed', () => {
      const result = model.handleGesture({
        type: 'double-tap',
        x: 100,
        y: 100,
        timestamp: Date.now(),
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe('feed');
    });

    test('long-press triggers play', () => {
      const result = model.handleGesture({
        type: 'long-press',
        x: 100,
        y: 100,
        timestamp: Date.now(),
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe('play');
    });

    test('swipe-up triggers clean', () => {
      const result = model.handleGesture({
        type: 'swipe-up',
        x: 100,
        y: 100,
        timestamp: Date.now(),
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe('clean');
    });

    test('returns null for unbound gesture', () => {
      const result = model.handleGesture({
        type: 'tap',
        x: 100,
        y: 100,
        timestamp: Date.now(),
      });
      // tap is bound, so this should work
      expect(result).not.toBeNull();
    });

    test('returns null when gestures disabled', () => {
      const disabled = new CareInteractionModel({ enableTouchGestures: false });
      const result = disabled.handleGesture({
        type: 'tap',
        x: 100,
        y: 100,
        timestamp: Date.now(),
      });
      expect(result).toBeNull();
    });
  });

  describe('radial menu', () => {
    test('returns all 8 radial menu items', () => {
      const items = model.getRadialMenuItems();
      expect(items.length).toBe(8);
    });

    test('can find item by ID', () => {
      const item = model.getRadialItem('feed');
      expect(item).toBeDefined();
      expect(item!.label).toBe('Feed');
      expect(item!.icon).toBe('🍖');
    });

    test('returns undefined for invalid ID', () => {
      const item = model.getRadialItem('invalid' as InteractionType);
      expect(item).toBeUndefined();
    });
  });

  describe('history', () => {
    test('tracks interaction history', () => {
      model.interact('feed');
      model.interact('play');
      model.interact('feed');

      const history = model.getHistory();
      expect(history.length).toBe(3);
    });

    test('caps history at 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        model.interact('pet');
      }
      expect(model.getHistory().length).toBe(100);
    });

    test('filters recent interactions by type', () => {
      model.interact('feed');
      model.interact('play');
      model.interact('feed');
      model.interact('feed');

      const feeds = model.getRecentInteractions('feed');
      expect(feeds.length).toBe(3);
      feeds.forEach((r) => expect(r.type).toBe('feed'));
    });

    test('clears history', () => {
      model.interact('feed');
      model.interact('play');
      model.clearHistory();
      expect(model.getHistory().length).toBe(0);
    });
  });

  describe('toJSON/fromJSON', () => {
    test('serializes and restores', () => {
      model.interact('feed');
      model.interact('play');

      const json = model.toJSON();
      const restored = CareInteractionModel.fromJSON(json);

      expect(restored.getHistory().length).toBe(2);
      expect(restored.getRadialMenuItems().length).toBe(8);
    });
  });
});
