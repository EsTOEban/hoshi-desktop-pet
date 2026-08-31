/**
 * @module main/care-interaction
 * Care interaction model: touch + radial menu for pet interactions.
 */

export type InteractionType = 'feed' | 'play' | 'clean' | 'sleep' | 'pet' | 'medicine' | 'toy' | 'wash';

export interface RadialMenuItem {
  id: InteractionType;
  label: string;
  icon: string; // emoji
  color: string;
  shortcut?: string;
}

export interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe-up' | 'swipe-down' | 'swipe-left' | 'swipe-right';
  x: number;
  y: number;
  timestamp: number;
}

export interface InteractionResult {
  type: InteractionType;
  success: boolean;
  message: string;
  happinessChange: number;
  hungerChange: number;
  energyChange: number;
  cleanlinessChange: number;
}

export interface CareConfig {
  enableRadialMenu: boolean;
  enableTouchGestures: boolean;
  radialMenuItems: RadialMenuItem[];
  gestureBindings: Record<string, InteractionType>;
}

export const DEFAULT_RADIAL_ITEMS: RadialMenuItem[] = [
  { id: 'feed', label: 'Feed', icon: '🍖', color: '#ff6b6b', shortcut: 'F' },
  { id: 'play', label: 'Play', icon: '🎮', color: '#4ecdc4', shortcut: 'P' },
  { id: 'clean', label: 'Clean', icon: '🧼', color: '#45b7d1', shortcut: 'C' },
  { id: 'sleep', label: 'Sleep', icon: '😴', color: '#96ceb4', shortcut: 'S' },
  { id: 'pet', label: 'Pet', icon: '🤗', color: '#feca57', shortcut: 'H' },
  { id: 'medicine', label: 'Medicine', icon: '💊', color: '#ff9ff3', shortcut: 'M' },
  { id: 'toy', label: 'Toy', icon: '🧸', color: '#54a0ff', shortcut: 'T' },
  { id: 'wash', label: 'Wash', icon: '🛁', color: '#5f27cd', shortcut: 'W' },
];

export const DEFAULT_CARE_CONFIG: CareConfig = {
  enableRadialMenu: true,
  enableTouchGestures: true,
  radialMenuItems: DEFAULT_RADIAL_ITEMS,
  gestureBindings: {
    'tap': 'pet',
    'double-tap': 'feed',
    'long-press': 'play',
    'swipe-up': 'clean',
    'swipe-down': 'sleep',
    'swipe-left': 'medicine',
    'swipe-right': 'toy',
  },
};

export class CareInteractionModel {
  private config: CareConfig;
  private interactionHistory: InteractionResult[] = [];

  constructor(config?: Partial<CareConfig>) {
    this.config = { ...DEFAULT_CARE_CONFIG, ...config };
  }

  /**
   * Execute an interaction by type.
   */
  interact(type: InteractionType): InteractionResult {
    const result = this.createInteractionResult(type);
    this.interactionHistory.push(result);
    // Cap history at 100 entries
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100);
    }
    return result;
  }

  /**
   * Handle a touch gesture.
   */
  handleGesture(gesture: TouchGesture): InteractionResult | null {
    if (!this.config.enableTouchGestures) return null;

    const action = this.config.gestureBindings[gesture.type];
    if (!action) return null;

    return this.interact(action);
  }

  /**
   * Get a radial menu item by ID.
   */
  getRadialItem(id: InteractionType): RadialMenuItem | undefined {
    return this.config.radialMenuItems.find((item) => item.id === id);
  }

  /**
   * Get all radial menu items.
   */
  getRadialMenuItems(): RadialMenuItem[] {
    return [...this.config.radialMenuItems];
  }

  /**
   * Get the interaction history.
   */
  getHistory(): InteractionResult[] {
    return [...this.interactionHistory];
  }

  /**
   * Get recent interactions of a specific type.
   */
  getRecentInteractions(type: InteractionType, count = 10): InteractionResult[] {
    return this.interactionHistory
      .filter((r) => r.type === type)
      .slice(-count);
  }

  /**
   * Clear interaction history.
   */
  clearHistory(): void {
    this.interactionHistory = [];
  }

  /**
   * Create an interaction result based on type.
   */
  private createInteractionResult(type: InteractionType): InteractionResult {
    const base = {
      type,
      success: true,
      message: '',
      happinessChange: 0,
      hungerChange: 0,
      energyChange: 0,
      cleanlinessChange: 0,
    };

    switch (type) {
      case 'feed':
        return { ...base, message: 'Yum! That was delicious!', happinessChange: 5, hungerChange: 20 };
      case 'play':
        return { ...base, message: 'Wheee! So much fun!', happinessChange: 15, energyChange: -5 };
      case 'clean':
        return { ...base, message: 'Fresh and clean!', happinessChange: 5, cleanlinessChange: 25 };
      case 'sleep':
        return { ...base, message: 'Zzz... feeling rested.', happinessChange: 3, energyChange: 20 };
      case 'pet':
        return { ...base, message: 'Hehe~ That tickles!', happinessChange: 10 };
      case 'medicine':
        return { ...base, message: 'Medicine taken. Feeling better.', happinessChange: -2, energyChange: 5 };
      case 'toy':
        return { ...base, message: 'Playing with the toy!', happinessChange: 12, energyChange: -3 };
      case 'wash':
        return { ...base, message: 'Splash! All clean now!', happinessChange: 8, cleanlinessChange: 30 };
      default:
        return { ...base, message: '...', happinessChange: 0 };
    }
  }

  /**
   * Serialize to JSON.
   */
  toJSON(): object {
    return {
      config: this.config,
      interactionHistory: this.interactionHistory,
    };
  }

  /**
   * Restore from JSON.
   */
  static fromJSON(data: any): CareInteractionModel {
    const model = new CareInteractionModel(data.config);
    model.interactionHistory = data.interactionHistory || [];
    return model;
  }
}
