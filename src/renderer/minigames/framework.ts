/**
 * @module renderer/minigames/framework
 * Minigame framework: loader, game loop, scoring, rewards.
 * All minigames implement the Game interface and run through GameRunner.
 * Aligned with issue #13 acceptance criteria.
 */

export interface GameState {
  score: number;
  isPlaying: boolean;
  isPaused: boolean;
  isComplete: boolean;
  startTime: number;
  elapsedMs: number;
}

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxDurationMs: number;
  pointsPerScore: number;
}

export interface Game {
  readonly config: GameConfig;
  getState(): GameState;
  start(): void;
  pause(): void;
  resume(): void;
  dismiss(): void;
  update(deltaMs: number): void;
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  handleInput?(x: number, y: number): void;
  onComplete?: (score: number, pointsEarned: number) => void;
}

export interface PointsStore {
  getBalance(): number;
  addPoints(amount: number): void;
  subscribe(callback: (balance: number) => void): () => void;
}

export class GameRunner {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private game: Game | null = null;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private pointsStore: PointsStore | null = null;
  private onExit: (() => void) | null = null;

  constructor(pointsStore?: PointsStore) {
    this.pointsStore = pointsStore ?? null;
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') ?? null;
  }

  loadGame(game: Game): void {
    this.game = game;
    game.onComplete = (_score, pointsEarned) => {
      this.pointsStore?.addPoints(pointsEarned);
    };
  }

  start(): void {
    if (!this.game) return;
    this.game.start();
    this.lastTime = performance.now();
    this.loop();
  }

  dismiss(): void {
    this.game?.dismiss();
    this.stop();
    this.onExit?.();
  }

  setOnExit(callback: () => void): void {
    this.onExit = callback;
  }

  private loop(): void {
    const now = performance.now();
    const deltaMs = now - this.lastTime;
    this.lastTime = now;

    this.game?.update(deltaMs);
    if (this.ctx && this.canvas && this.game) {
      this.game.render(this.ctx, this.canvas.width, this.canvas.height);
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export const DEFAULT_GAME_STATE: GameState = {
  score: 0,
  isPlaying: false,
  isPaused: false,
  isComplete: false,
  startTime: 0,
  elapsedMs: 0,
};
