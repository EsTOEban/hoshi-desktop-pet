/**
 * @module renderer/minigames/memory-match
 * Memory Match minigame — flip cards to find matching pairs (6×4 grid).
 * Aligned with issue #13 acceptance criteria.
 */

import { GameConfig, GameState, DEFAULT_GAME_STATE } from './framework';

const GRID_COLS = 6;
const GRID_ROWS = 4;
const TOTAL_CARDS = GRID_COLS * GRID_ROWS;
const PAIRS_COUNT = TOTAL_CARDS / 2;

// Emoji pairs for the cards
const CARD_EMOJIS = ['🌟', '🌙', '☀️', '⚡', '🔥', '❄️', '🌸', '🍀', '💎', '🎵', '🎭', '🎪'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export class MemoryMatchGame {
  readonly config: GameConfig = {
    id: 'memory-match',
    name: 'Memory Match',
    description: 'Flip cards to find matching pairs!',
    icon: '🧠',
    maxDurationMs: 5 * 60 * 1000, // 5 min max
    pointsPerScore: 1,
  };

  private state: GameState = { ...DEFAULT_GAME_STATE };
  private cards: Card[] = [];
  private flippedCards: number[] = [];
  private matchedPairs = 0;
  private moves = 0;
  private canFlip = true;
  private onCompleteCallback: ((score: number, pointsEarned: number) => void) | null = null;

  onComplete = (score: number, pointsEarned: number) => {
    this.onCompleteCallback?.(score, pointsEarned);
  };

  getState(): GameState {
    return this.state;
  }

  start(): void {
    this.state = {
      score: 0,
      isPlaying: true,
      isPaused: false,
      isComplete: false,
      startTime: Date.now(),
      elapsedMs: 0,
    };
    this.setupBoard();
    this.matchedPairs = 0;
    this.moves = 0;
    this.canFlip = true;
  }

  pause(): void {
    this.state.isPaused = true;
  }

  resume(): void {
    this.state.isPaused = false;
  }

  dismiss(): void {
    this.state.isPlaying = false;
  }

  update(deltaMs: number): void {
    if (!this.state.isPlaying || this.state.isPaused) return;
    this.state.elapsedMs += deltaMs;

    // Check time limit
    if (this.state.elapsedMs >= this.config.maxDurationMs) {
      this.complete();
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    const padding = 10;
    const gap = 8;
    const cardWidth = (width - padding * 2 - gap * (GRID_COLS - 1)) / GRID_COLS;
    const cardHeight = (height - padding * 2 - gap * (GRID_ROWS - 1)) / GRID_ROWS;

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = padding + col * (cardWidth + gap);
      const y = padding + row * (cardHeight + gap);

      // Card background
      if (card.isMatched) {
        ctx.fillStyle = '#4caf50';
      } else if (card.isFlipped) {
        ctx.fillStyle = '#fff3cd';
      } else {
        ctx.fillStyle = '#6c757d';
      }
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, cardWidth, cardHeight);
      ctx.strokeRect(x, y, cardWidth, cardHeight);

      // Card content
      if (card.isFlipped || card.isMatched) {
        ctx.fillStyle = '#212529';
        ctx.font = `${Math.floor(cardHeight * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.emoji, x + cardWidth / 2, y + cardHeight / 2);
      }
    }
  }

  handleInput(x: number, y: number): void {
    if (!this.canFlip || this.state.isPaused) return;

    const padding = 10;
    const gap = 8;
    // We need canvas dimensions — approximate from card positions
    // For simplicity, assume click maps to a card index based on grid
    // In practice, the renderer would pass canvas dimensions
  }

  /**
   * Handle card flip by index.
   */
  flipCard(index: number): void {
    if (!this.canFlip || this.state.isPaused) return;
    if (index < 0 || index >= this.cards.length) return;
    const card = this.cards[index];
    if (card.isFlipped || card.isMatched) return;
    if (this.flippedCards.length >= 2) return;

    card.isFlipped = true;
    this.flippedCards.push(index);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.checkMatch();
    }
  }

  private setupBoard(): void {
    // Create pairs
    const emojis = CARD_EMOJIS.slice(0, PAIRS_COUNT);
    const pairs = [...emojis, ...emojis];

    // Shuffle (Fisher-Yates)
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    this.cards = pairs.map((emoji, id) => ({
      id,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));

    this.flippedCards = [];
  }

  private checkMatch(): void {
    this.canFlip = false;
    const [i1, i2] = this.flippedCards;
    const card1 = this.cards[i1];
    const card2 = this.cards[i2];

    if (card1.emoji === card2.emoji) {
      // Match found!
      card1.isMatched = true;
      card2.isMatched = true;
      this.matchedPairs++;
      this.flippedCards = [];
      this.canFlip = true;

      // Score: faster matches = more points
      const timeBonus = Math.max(0, 1000 - this.state.elapsedMs / 100);
      this.state.score += Math.floor(100 + timeBonus);

      // Check win condition
      if (this.matchedPairs === PAIRS_COUNT) {
        this.complete();
      }
    } else {
      // No match — flip back after delay
      setTimeout(() => {
        card1.isFlipped = false;
        card2.isFlipped = false;
        this.flippedCards = [];
        this.canFlip = true;
      }, 800);
    }
  }

  private complete(): void {
    this.state.isPlaying = false;
    this.state.isComplete = true;
    const pointsEarned = Math.floor(this.state.score * this.config.pointsPerScore);
    this.onCompleteCallback?.(this.state.score, pointsEarned);
  }
}
