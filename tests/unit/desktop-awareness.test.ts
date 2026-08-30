/**
 * @module main/desktop-awareness.test
 * Unit tests for DesktopAwareness state machine.
 * Tests the pure state transition logic without Electron dependencies.
 */

import { describe, it, expect } from 'vitest';

// Replicate the pure state transition logic for testing
// (Electron powerMonitor isn't available in test env)
type AwarenessState = 'typing' | 'idle' | 'returning' | 'active';

interface TransitionOptions {
  idleThresholdMs: number;
  debounceMs: number;
}

function computeNextState(
  current: AwarenessState,
  previousIdleMs: number,
  currentIdleMs: number,
  options: TransitionOptions
): AwarenessState {
  if (currentIdleMs >= options.idleThresholdMs) {
    return 'idle';
  }
  if (
    previousIdleMs >= options.idleThresholdMs &&
    currentIdleMs < options.idleThresholdMs
  ) {
    return 'returning';
  }
  if (currentIdleMs < options.debounceMs) {
    return 'typing';
  }
  return 'active';
}

describe('DesktopAwareness state machine', () => {
  const options: TransitionOptions = {
    idleThresholdMs: 300_000, // 5 min
    debounceMs: 2000, // 2 sec
  };

  it('starts as active', () => {
    const state = computeNextState('active', 0, 0, options);
    expect(state).toBe('typing');
  });

  it('transitions to typing when idle < debounce', () => {
    const state = computeNextState('active', 5000, 500, options);
    expect(state).toBe('typing');
  });

  it('transitions to idle when idle >= threshold', () => {
    const state = computeNextState('active', 10_000, 300_000, options);
    expect(state).toBe('idle');
  });

  it('transitions to returning when coming back from idle', () => {
    const state = computeNextState('idle', 300_000, 5000, options);
    expect(state).toBe('returning');
  });

  it('stays typing during continuous activity', () => {
    const state = computeNextState('typing', 100, 50, options);
    expect(state).toBe('typing');
  });

  it('transitions from typing to active after debounce', () => {
    const state = computeNextState('typing', 50, 3000, options);
    expect(state).toBe('active');
  });

  it('transitions from returning to typing on activity', () => {
    // After returning, previous idle was updated to < threshold
    const state = computeNextState('returning', 5000, 500, options);
    expect(state).toBe('typing');
  });

  it('transitions from returning to active after debounce', () => {
    // After returning, previous idle was updated to < threshold
    const state = computeNextState('returning', 5000, 5000, options);
    expect(state).toBe('active');
  });

  it('idle threshold at exactly 5 minutes', () => {
    const state = computeNextState('active', 10_000, 299_999, options);
    expect(state).toBe('active');
    const state2 = computeNextState('active', 10_000, 300_000, options);
    expect(state2).toBe('idle');
  });

  it('debounce at exactly 2 seconds', () => {
    const state = computeNextState('active', 5000, 1999, options);
    expect(state).toBe('typing');
    const state2 = computeNextState('active', 5000, 2000, options);
    expect(state2).toBe('active');
  });
});

describe('DesktopAwareness options', () => {
  it('1 minute idle threshold', () => {
    const opts = { idleThresholdMs: 60_000, debounceMs: 2000 };
    expect(computeNextState('active', 10_000, 60_000, opts)).toBe('idle');
  });

  it('15 minute idle threshold', () => {
    const opts = { idleThresholdMs: 900_000, debounceMs: 2000 };
    expect(computeNextState('active', 10_000, 300_000, opts)).toBe('active');
  });
});
