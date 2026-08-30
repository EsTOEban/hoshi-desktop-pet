# State Machine Specification

> **Owner:** @qa-tester  
> **Status:** In Progress  
> **Repo:** hoshi-desktop-pet

## 1. Design Principles

1. **Pure functions** — `(state, action, delta_ms) → state`. No timers, no I/O, no side effects.
2. **Deterministic** — same inputs always produce same outputs. Fully unit-testable.
3. **Mood is derived, not stored** — mood is a pure function of need thresholds, preventing impossible states.
4. **Monotonic time** — uses `performance.now()` deltas, immune to system clock changes.
5. **Graceful degradation** — corrupt/missing save files fall back to safe defaults.

## 2. State Shape

```typescript
interface PetState {
  // Needs (0-100, higher = better)
  hunger: number;      // 100 = full, 0 = starving
  happiness: number;   // 100 = ecstatic, 0 = depressed
  cleanliness: number; // 100 = pristine, 0 = filthy
  energy: number;      // 100 = rested, 0 = exhausted

  // Derived (computed, not stored)
  mood: Mood;
  isAlive: boolean;
  personalityAxes: PersonalityAxes;

  // Metadata
  lastTick: number;    // monotonic timestamp (ms)
  createdAt: number;
  playTime: number;    // total awake time (ms)
}

interface PersonalityAxes {
  spoiled: number;     // -100 (neglected) ↔ 100 (spoiled)
  energetic: number;   // -100 (lazy) ↔ 100 (energetic)
  social: number;      // -100 (independent) ↔ 100 (social)
}
```

## 3. Mood States

| Mood      | Trigger condition                          | Folder                          |
|-----------|--------------------------------------------|---------------------------------|
| happy     | happiness ≥ 70                             | `moods/happy/`                  |
| excited   | happiness ≥ 90 AND energy ≥ 50             | `moods/excited/`                |
| neutral   | default / no overriding condition          | `moods/neutral/`                |
| bored     | happiness < 50 AND all needs ≥ 20          | `moods/bored/`                  |
| hungry    | hunger < 20                                | `moods/hungry/`                 |
| sad       | happiness < 20                             | `moods/sad/`                    |
| angry     | happiness < 10 OR (hungry AND energy < 20)  | `moods/angry/`                  |
| sick      | cleanliness < 20                           | `moods/sick/`                   |
| sleeping  | energy < 10 OR user-initiated SLEEP        | `moods/sleeping/`               |

**Priority order** (first match wins): sick → sleeping → angry → hungry → sad → excited → happy → bored → neutral

## 4. Actions

| Action   | Parameters     | Effect on needs                          |
|----------|----------------|------------------------------------------|
| FEED     | `{ amount }`   | hunger += amount, happiness += 5         |
| PLAY     | `{ intensity }`| happiness += intensity, energy -= 10     |
| CLEAN    | `{ }`          | cleanliness = 100, happiness += 5        |
| SLEEP    | `{ }`          | energy recovers over time, mood = sleeping|
| TICK     | `{ delta_ms }` | apply decay rates, recompute mood        |
| LOAD     | `{ saveData }` | restore state from save file             |
| RESET    | `{ }`          | reset to factory defaults                |

## 5. Decay Rates (per minute)

| Need         | Awake rate | Sleeping rate |
|--------------|------------|---------------|
| hunger       | -3/min     | -1/min        |
| happiness    | -2/min     | -1/min        |
| cleanliness  | -1/min     | -0.5/min      |
| energy       | -2/min     | +5/min        |

All rates are configurable via `config.yaml`. Minimum value: 0, maximum: 100.

## 6. State Transitions

```
┌─────────────┐    FEED     ┌─────────────┐
│   hungry    │ ──────────► │   neutral   │
└─────────────┘             └─────────────┘
       │                           │
       │ PLAY                      │ PLAY
       ▼                           ▼
┌─────────────┐             ┌─────────────┐
│     sad     │ ◄────────── │    bored    │
└─────────────┘   no play   └─────────────┘
       │                           │
       │ TICK (decay)              │ TICK
       ▼                           ▼
┌─────────────┐             ┌─────────────┐
│    angry    │             │    happy    │
└─────────────┘             └─────────────┘
       │                           │
       │ SLEEP                     │ SLEEP
       ▼                           ▼
┌─────────────┐             ┌─────────────┐
│  sleeping   │◄───────────►│  sleeping   │
└─────────────┘   energy<10 └─────────────┘
       │                           │
       │ TICK (energy>50)          │ TICK
       ▼                           ▼
┌─────────────┐             ┌─────────────┐
│   neutral   │ ──────────►  │   neutral   │
└─────────────┘             └─────────────┘
```

## 7. Edge Cases & Safety

| Scenario                  | Behavior                                                                 |
|---------------------------|--------------------------------------------------------------------------|
| Rapid mood swings         | 5-second debounce on mood transitions (art assets don't flicker)         |
| System clock change       | Uses monotonic `delta_ms` — immune to clock skew, DST, manual changes   |
| Empty save file           | Falls back to factory defaults (all needs = 100, mood = neutral)         |
| Corrupt save JSON         | Try-catch with fallback to defaults + console warning                    |
| Huge save file (>1MB)     | Reject load, use defaults, log error (save files should be <10KB)        |
| Negative need values      | Clamped to 0                                                              |
| Need values > 100         | Clamped to 100                                                            |
| Concurrent actions        | Last-wins within a tick; actions are queued and processed in order       |
| Very long TICK delta      | Capped at 60s — if delta > 60s, assume 60s (handles sleep/wake)          |

## 8. Testability Hooks

All functions are exported and pure:

```typescript
// Pure reducer — no side effects
export function petReducer(state: PetState, action: PetAction): PetState

// Mood derivation — pure function of needs
export function deriveMood(state: PetState): Mood

// Decay application — pure function of delta
export function applyDecay(state: PetState, deltaMs: number): PetState

// Personality derivation — pure function of history
export function derivePersonality(state: PetState): PersonalityAxes
```

## 9. Acceptance Criteria

### State Machine Core
- [ ] `petReducer` is a pure function — same input always produces same output
- [ ] All actions produce valid state (no undefined values)
- [ ] Need values are clamped to [0, 100]
- [ ] Mood is always a valid `Mood` enum value
- [ ] TICK with `delta_ms = 0` produces no change

### Mood Derivation
- [ ] `hunger < 20` → `mood === 'hungry'` (regardless of other needs)
- [ ] `happiness ≥ 70` → `mood === 'happy'` (when hunger ≥ 20)
- [ ] `cleanliness < 20` → `mood === 'sick'` (highest priority after sleeping)
- [ ] `energy < 10` → `mood === 'sleeping'` (highest priority)
- [ ] All needs ≥ 50 → `mood === 'neutral'` or `'bored'`

### Decay Rates
- [ ] Hunger decays at 3/min when awake (verify: 100 → 70 after ~100s)
- [ ] Happiness decays at 2/min when awake
- [ ] Energy recovers at 5/min when sleeping
- [ ] No need goes below 0

### Edge Cases
- [ ] Empty/corrupt save file → factory defaults
- [ ] System clock change → no effect (monotonic time)
- [ ] Rapid actions → debounced, no invalid states
- [ ] TICK with huge delta → capped at 60s
- [ ] Concurrent actions → processed in order, last-wins within tick

### Personality Evolution (#11 integration)
- [ ] `personalityAxes` derived from cumulative action history
- [ ] FEED frequency → `spoiled` axis
- [ ] PLAY frequency → `energetic` axis
- [ ] CLEAN frequency → `social` axis (higher cleanliness = more social)
- [ ] Axes clamped to [-100, 100]

## 10. Definition of Done

- [ ] `docs/state-machine-spec.md` committed to `main`
- [ ] `tests/unit/pet-reducer.test.ts` with 20+ unit tests covering all transitions
- [ ] `tests/unit/mood-derivation.test.ts` with 10+ tests for mood logic
- [ ] `tests/unit/edge-cases.test.ts` with tests for all edge cases
- [ ] All tests pass (`npm test`)
- [ ] PR opened with test results in description

---

*This spec is testable, deterministic, and prevents impossible states by construction.*
