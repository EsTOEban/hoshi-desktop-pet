/**
 * @module tests/unit/pet-slots.test.ts
 * Unit tests for PetSlotManager.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { PetSlotManager, DEFAULT_SLOT_CONFIG } from '../../src/main/pet-slots';

describe('PetSlotManager', () => {
  let manager: PetSlotManager;

  beforeEach(() => {
    manager = new PetSlotManager();
  });

  describe('initialization', () => {
    test('starts with no slots', () => {
      expect(manager.getSlotCount()).toBe(0);
      expect(manager.getActiveSlot()).toBeNull();
      expect(manager.getAllSlots()).toHaveLength(0);
    });

    test('can create slots by default', () => {
      expect(manager.canCreateSlot()).toBe(true);
    });
  });

  describe('createSlot', () => {
    test('creates a slot with default name', () => {
      const slot = manager.createSlot();
      expect(slot.name).toBe('Darkness 1');
      expect(slot.isActive).toBe(true);
      expect(manager.getSlotCount()).toBe(1);
    });

    test('creates a slot with custom name', () => {
      const slot = manager.createSlot('My Pet');
      expect(slot.name).toBe('My Pet');
    });

    test('first slot becomes active', () => {
      const slot = manager.createSlot();
      expect(manager.getActiveSlot()?.id).toBe(slot.id);
    });

    test('respects max slots limit', () => {
      const manager = new PetSlotManager({ maxSlots: 2 });
      manager.createSlot('Pet 1');
      manager.createSlot('Pet 2');
      expect(() => manager.createSlot('Pet 3')).toThrow('Maximum number of slots (2) reached');
    });

    test('generates unique IDs', () => {
      const slot1 = manager.createSlot();
      const slot2 = manager.createSlot();
      expect(slot1.id).not.toBe(slot2.id);
    });
  });

  describe('getSlot', () => {
    test('retrieves a slot by ID', () => {
      const slot = manager.createSlot();
      const retrieved = manager.getSlot(slot.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(slot.id);
    });

    test('returns undefined for non-existent ID', () => {
      expect(manager.getSlot('nonexistent')).toBeUndefined();
    });
  });

  describe('setActiveSlot', () => {
    test('sets a slot as active', () => {
      const slot1 = manager.createSlot('Pet 1');
      const slot2 = manager.createSlot('Pet 2');

      expect(manager.getActiveSlot()?.id).toBe(slot1.id);

      manager.setActiveSlot(slot2.id);
      expect(manager.getActiveSlot()?.id).toBe(slot2.id);
    });

    test('deactivates previous active slot', () => {
      const slot1 = manager.createSlot('Pet 1');
      const slot2 = manager.createSlot('Pet 2');

      manager.setActiveSlot(slot2.id);
      expect(manager.getSlot(slot1.id)?.isActive).toBe(false);
      expect(manager.getSlot(slot2.id)?.isActive).toBe(true);
    });

    test('returns false for non-existent slot', () => {
      expect(manager.setActiveSlot('nonexistent')).toBe(false);
    });
  });

  describe('renameSlot', () => {
    test('renames a slot', () => {
      const slot = manager.createSlot('Old Name');
      const result = manager.renameSlot(slot.id, 'New Name');
      expect(result).toBe(true);
      expect(manager.getSlot(slot.id)?.name).toBe('New Name');
    });

    test('returns false for non-existent slot', () => {
      expect(manager.renameSlot('nonexistent', 'Name')).toBe(false);
    });
  });

  describe('deleteSlot', () => {
    test('deletes a slot', () => {
      const slot1 = manager.createSlot('Pet 1');
      const slot2 = manager.createSlot('Pet 2');

      const result = manager.deleteSlot(slot1.id);
      expect(result).toBe(true);
      expect(manager.getSlotCount()).toBe(1);
      expect(manager.getSlot(slot1.id)).toBeUndefined();
    });

    test('cannot delete the last slot', () => {
      const slot = manager.createSlot();
      expect(() => manager.deleteSlot(slot.id)).toThrow('Cannot delete the last pet slot');
    });

    test('activates another slot when active is deleted', () => {
      const slot1 = manager.createSlot('Pet 1');
      const slot2 = manager.createSlot('Pet 2');

      manager.setActiveSlot(slot1.id);
      manager.deleteSlot(slot1.id);

      expect(manager.getActiveSlot()?.id).toBe(slot2.id);
    });

    test('returns false for non-existent slot', () => {
      manager.createSlot();
      expect(manager.deleteSlot('nonexistent')).toBe(false);
    });
  });

  describe('canCreateSlot', () => {
    test('returns true when under limit', () => {
      expect(manager.canCreateSlot()).toBe(true);
    });

    test('returns false at limit', () => {
      const manager = new PetSlotManager({ maxSlots: 1 });
      manager.createSlot();
      expect(manager.canCreateSlot()).toBe(false);
    });
  });

  describe('toJSON/fromJSON', () => {
    test('serializes and restores slots', () => {
      const slot1 = manager.createSlot('Pet 1');
      manager.createSlot('Pet 2');
      manager.setActiveSlot(slot1.id);

      const json = manager.toJSON();
      const restored = PetSlotManager.fromJSON(json);

      expect(restored.getSlotCount()).toBe(2);
      expect(restored.getActiveSlot()?.name).toBe('Pet 1');
      expect(restored.getSlot(slot1.id)?.name).toBe('Pet 1');
    });

    test('handles empty data', () => {
      const restored = PetSlotManager.fromJSON(null);
      expect(restored.getSlotCount()).toBe(0);
    });

    test('handles data without slots', () => {
      const restored = PetSlotManager.fromJSON({ activeSlotId: null });
      expect(restored.getSlotCount()).toBe(0);
    });
  });

  describe('default config', () => {
    test('has correct max slots', () => {
      expect(DEFAULT_SLOT_CONFIG.maxSlots).toBe(5);
    });

    test('has correct default name', () => {
      expect(DEFAULT_SLOT_CONFIG.defaultName).toBe('Darkness');
    });
  });
});
