/**
 * @module renderer/minigames/reaction-time
 * Reaction Time minigame — click when the pet strikes a pose (random delay).
 * Aligned with issue #13 acceptance criteria.
 */

import { GameConfig, GameState, DEFAULT_GAME_STATE } from './framework';

type ReactionPhase = 'waiting' | 'ready' | 'clicked' | 'toosoon';

export class ReactionTimeGame {
  readonly config: GameConfig = {
    id: 'reaction-time',
    name: 'Reaction Time',
    description: 'Click when the pet strikes a pose!',
    icon: '⚡',
    maxDurationMs: 60_000, // 1 min per round
    pointsPerScore: 2,
  };

  private state: GameState = { ...DEFAULT_GAME_STATE };
  private phase: ReactionPhase = 'waiting';
  private triggerTime = 0;
  private reactionStart = 0;
  private round = 0;
  private maxRounds = 5;
  private roundScores: number[] = [];
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
    this.round = 0;
    this.roundScores = [];
    this.startRound();
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

    // Check if player took too long to react (> 3s after trigger)
    if (this.phase === 'ready' && Date.now() - this.triggerTime > 3000) {
      this.phase = 'toosoon';
      this.nextRound();
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Background
    ctx.fillStyle = this.getPhaseColor();
    ctx.fillRect(0, 0, width, height);

    // Pet representation
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.getPhaseEmoji(), centerX, centerY - 30);

    // Instruction text
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText(this.getPhaseText(), centerX, centerY + 50);

    // Round counter
    ctx.font = '14px sans-serif';
    ctx.fillText(`Round ${this.round}/${this.maxRounds}`, centerX, 30);
  }

  handleInput(): void {
    if (this.state.isPaused) return;

    if (this.phase === 'waiting') {
      // Clicked too soon — penalty
      this.phase = 'toosoon';
      this.roundScores.push(0);
      this.nextRound();
    } else if (this.phase === 'ready') {
      // Good click!
      const reactionMs = Date.now() - this.reactionStart;
      const points = this.calculatePoints(reactionMs);
      this.roundScores.push(points);
      this.state.score += points;
      this.phase = 'clicked';
      this.nextRound();
    }
  }

  private startRound(): void {
    this.round++;
    if (this.round > this.maxRounds) {
      this.complete();
      return;
    }

    this.phase = 'waiting';
    // Random delay between 1-5 seconds
    const delay = 1000 + Math.random() * 4000;
    this.triggerTime = Date.now() + delay;

    setTimeout(() => {
      if (this.phase === 'waiting') {
        this.phase = 'ready';
        this.reactionStart = Date.now();
      }
    }, delay);
  }

  private nextRound(): void {
    setTimeout(() => {
      if (this.state.isPlaying) {
        this.startRound();
      }
    }, 1000);
  }

  private calculatePoints(reactionMs: number): number {
    // Faster = more points. Max 1000ms = 100 points, min 100ms = 500 points
    if (reactionMs < 100) return 500;
    if (reactionMs > 1000) return 100;
    return Math.floor(500 - ((reactionMs - 100) / 900) * 400);
  }

  private complete(): void {
    this.state.isPlaying = false;
    this.state.isComplete = true;
    const pointsEarned = Math.floor(this.state.score * this.config.pointsPerScore);
    this.onCompleteCallback?.(this.state.score, pointsEarned);
  }

  private getPhaseColor(): string {
    switch (this.phase) {
      case 'waiting': return '#6c757d';
      case 'ready': return '#dc3545';
      case 'clicked': return '#28a745';
      case 'toosoon': return '#ffc107';
    }
  }

  private getPhaseEmoji(): string {
    switch (this.phase) {
      case 'waiting': return '😴';
      case 'ready': return '😲';
      case 'clicked': return '🎉';
      case 'toosoon': return '😅';
    }
  }

  private getPhaseText(): string {
    switch (this.phase) {
      case 'waiting': return 'Wait for it...';
      case 'ready': return 'CLICK NOW!';
      case 'clicked': return 'Nice!';
      case 'toosoon': return 'Too soon!';
    }
  }
}
