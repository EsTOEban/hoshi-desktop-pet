/**
 * @module main/pet-slots
 * Multiple pet slot manager.
 * Each slot holds an independent pet state, personality, and streak.
 */

import { PetState, DEFAULT_PET_STATE } from '../shared/types';
import { PersonalityEngine } from '../state/personality-engine';
import { DailyStreak, StreakData } from './daily-streak';

export interface PetSlot {
  id: string;
  name: string;
  createdAt: number;
  petState: PetState;
  personality: PersonalityEngine;
  streak: DailyStreak;
  isActive: boolean;
}

export interface PetSlotConfig {
  maxSlots: number;
  defaultName: string;
}

export const DEFAULT_SLOT_CONFIG: PetSlotConfig = {
  maxSlots: 5,
  defaultName: 'Darkness',
};

export class PetSlotManager {
  private slots: Map<string, PetSlot> = new Map();
  private activeSlotId: string | null = null;
  private config: PetSlotConfig;

  constructor(config: Partial<PetSlotConfig> = {}) {
    this.config = { ...DEFAULT_SLOT_CONFIG, ...config };
  }

  /**
   * Create a new pet slot.
   */
  createSlot(name?: string): PetSlot {
    if (this.slots.size >= this.config.maxSlots) {
      throw new Error(`Maximum number of slots (${this.config.maxSlots}) reached`);
    }

    const id = this.generateSlotId();
    const slot: PetSlot = {
      id,
      name: name || `${this.config.defaultName} ${this.slots.size + 1}`,
      createdAt: Date.now(),
      petState: {
        ...DEFAULT_PET_STATE,
        createdAt: Date.now(),
        lastTick: 0,
      },
      personality: new PersonalityEngine(),
      streak: new DailyStreak(),
      isActive: false,
    };

    this.slots.set(id, slot);

    // If this is the first slot, make it active
    if (this.slots.size === 1) {
      this.setActiveSlot(id);
    }

    return slot;
  }

  /**
   * Get a slot by ID.
   */
  getSlot(id: string): PetSlot | undefined {
    return this.slots.get(id);
  }

  /**
   * Get all slots.
   */
  getAllSlots(): PetSlot[] {
    return Array.from(this.slots.values());
  }

  /**
   * Get the active slot.
   */
  getActiveSlot(): PetSlot | null {
    if (!this.activeSlotId) return null;
    return this.slots.get(this.activeSlotId) ?? null;
  }

  /**
   * Set the active slot.
   */
  setActiveSlot(id: string): boolean {
    const slot = this.slots.get(id);
    if (!slot) return false;

    // Deactivate current active slot
    if (this.activeSlotId) {
      const current = this.slots.get(this.activeSlotId);
      if (current) {
        current.isActive = false;
      }
    }

    // Activate new slot
    slot.isActive = true;
    this.activeSlotId = id;
    return true;
  }

  /**
   * Rename a slot.
   */
  renameSlot(id: string, name: string): boolean {
    const slot = this.slots.get(id);
    if (!slot) return false;
    slot.name = name;
    return true;
  }

  /**
   * Delete a slot.
   */
  deleteSlot(id: string): boolean {
    const slot = this.slots.get(id);
    if (!slot) return false;

    // Cannot delete the last slot
    if (this.slots.size <= 1) {
      throw new Error('Cannot delete the last pet slot');
    }

    this.slots.delete(id);

    // If we deleted the active slot, activate another one
    if (this.activeSlotId === id) {
      const remaining = this.getAllSlots();
      if (remaining.length > 0) {
        this.setActiveSlot(remaining[0].id);
      }
    }

    return true;
  }

  /**
   * Get the number of slots.
   */
  getSlotCount(): number {
    return this.slots.size;
  }

  /**
   * Check if we can create more slots.
   */
  canCreateSlot(): boolean {
    return this.slots.size < this.config.maxSlots;
  }

  /**
   * Generate a unique slot ID.
   */
  private generateSlotId(): string {
    return `slot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Serialize slots to JSON for persistence.
   */
  toJSON(): object {
    return {
      activeSlotId: this.activeSlotId,
      slots: Array.from(this.slots.values()).map((slot) => ({
        id: slot.id,
        name: slot.name,
        createdAt: slot.createdAt,
        petState: slot.petState,
        streak: slot.streak.toJSON(),
        isActive: slot.isActive,
      })),
    };
  }

  /**
   * Restore slots from JSON.
   */
  static fromJSON(data: any, config?: Partial<PetSlotConfig>): PetSlotManager {
    const manager = new PetSlotManager(config);

    if (!data || !data.slots) {
      return manager;
    }

    for (const slotData of data.slots) {
      const slot: PetSlot = {
        id: slotData.id,
        name: slotData.name,
        createdAt: slotData.createdAt,
        petState: slotData.petState,
        personality: new PersonalityEngine(),
        streak: new DailyStreak(slotData.streak),
        isActive: slotData.isActive,
      };
      manager.slots.set(slot.id, slot);
    }

    manager.activeSlotId = data.activeSlotId;

    // Ensure we have at least one slot
    if (manager.slots.size === 0) {
      manager.createSlot();
    }

    return manager;
  }
}
