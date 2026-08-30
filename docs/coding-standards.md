# Hoshi Coding Standards

> Clean code standards for the Hoshi desktop pet project, based on Google's style guides, DRY principles, and SOLID software engineering practices.

## Table of Contents

1. [General Principles](#general-principles)
2. [Language & Framework Standards](#language--framework-standards)
3. [File & Module Organization](#file--module-organization)
4. [Naming Conventions](#naming-conventions)
5. [DRY Principle (Don't Repeat Yourself)](#dry-principle-dont-repeat-yourself)
6. [SOLID Principles](#solid-principles)
7. [Code Style & Formatting](#code-style--formatting)
8. [Documentation Requirements](#documentation-requirements)
9. [Testing Standards](#testing-standards)
10. [Git & Version Control](#git--version-control)
11. [Code Review Checklist](#code-review-checklist)
12. [Security Guidelines](#security-guidelines)

---

## General Principles

### Core Tenets

1. **Readability first** — Code is read more often than it is written. Optimize for the reader, not the writer.
2. **Simplicity** — Prefer simple solutions over complex ones. If you can't explain your implementation in a sentence, it's too complex.
3. **Consistency** — Follow established patterns in the codebase. When in doubt, match existing style.
4. **Intentional code** — Every file, function, and variable should have a clear purpose. If you can't name it clearly, reconsider its existence.
5. **Fail fast** — Validate inputs early. Throw or return errors at the boundaries, not deep in the call stack.

### Clean Code Rules

- Functions should do one thing, do it well, do it once
- No side effects in unexpected places
- Don't be clever — be clear
- Leave the code cleaner than you found it (Boy Scout Rule)

---

## Language & Framework Standards

### TypeScript (Primary Language)

We use TypeScript for all Electron processes. It provides compile-time safety in a codebase where runtime errors are hard to debug.

**Rules:**

```typescript
// ✅ STRICT MODE ENABLED — no `any` without justification
// tsconfig.json must have "strict": true

// ✅ Explicit return types on exported functions
export function createPet(config: PetConfig): Pet {
  // ...
}

// ✅ Use interfaces for object shapes
interface PetState {
  mood: Mood;
  needs: Needs;
  lastInteraction: number;
}

// ✅ Use type aliases for unions/literals
type Mood = 'idle' | 'happy' | 'sick' | 'sleeping';

// ✅ Prefer readonly for immutable data
function renderState(state: Readonly<PetState>): void {
  // ...
}

// ❌ No implicit any
function bad(state) { /* what is state? */ }

// ❌ Avoid type assertions unless absolutely necessary
const pet = {} as Pet; // Why isn't this constructed properly?
```

**TypeScript Configuration:**

```jsonc
// tsconfig.json requirements
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### JavaScript (Renderer / Legacy)

When JavaScript is used (e.g., renderer process before TypeScript migration):

```javascript
// ✅ 'use strict' at the top of every file
'use strict';

// ✅ const by default, let when needed, NEVER var
const pet = new Pet();
let currentMood = 'idle';

// ✅ Template literals over concatenation
const message = `Pet is ${currentMood} after ${elapsed} seconds`;

// ✅ Destructuring
const { mood, needs } = pet.getState();

// ✅ Default parameters
function decay(amount, rate = BASE_DECAY_RATE) {
  return amount * rate;
}

// ❌ Never use var
var old = 'avoid this';
```

### HTML

```html
<!-- ✅ Semantic HTML5 -->
<nav class="panel-nav">
  <button class="nav-btn" data-action="feed">Feed</button>
</nav>

<!-- ✅ Accessibility: aria labels on interactive elements -->
<button aria-label="Feed the pet" data-action="feed">
  <img src="feed-icon.svg" alt="" />
</button>

<!-- ✅ Lowercase attribute names, quoted values -->
<div class="pet-container" id="main-pet"></div>
```

### CSS

```css
/* ✅ BEM naming convention */
.pet-window { }
.pet-window__sprite { }
.pet-window__sprite--happy { }
.pet-window__sprite--sick { }

/* ✅ CSS custom properties for theming */
:root {
  --pet-size: 128px;
  --overlay-bg: transparent;
  --animation-speed: 0.3s;
}

/* ✅ Logical properties over physical */
.pet-panel {
  margin-inline-start: 1rem;
  padding-block: 0.5rem;
}
```

---

## File & Module Organization

### Directory Structure

```
src/
├── main/              # Electron main process (Node.js context)
│   ├── app.ts         # App lifecycle, single BrowserWindow creation
│   ├── pet.ts         # Pet class — single source of truth for pet state
│   ├── storage.ts     # localStorage wrapper, serialization
│   ├── ipc.ts         # IPC channel handlers
│   └── index.ts       # Main entry point — composes the above
├── renderer/          # Renderer process (Chromium context)
│   ├── pet-window.ts  # Pet display, animation loop
│   ├── panel.ts       # Stats panel, interaction buttons
│   └── index.ts       # Renderer entry point
├── shared/            # Code imported by BOTH processes
│   ├── constants.ts   # Single source of truth for all magic numbers
│   ├── types.ts       # Shared TypeScript interfaces
│   └── channels.ts    # IPC channel names — shared between main/renderer
└── assets/            # Static assets (images, icons)
    ├── sprites/
    └── icons/
```

### File Rules

1. **One class/module per file** — File name matches the primary export (`Pet` → `pet.ts`)
2. **File size limit** — 200 lines soft limit, 400 lines hard limit. Refactor when exceeded.
3. **No circular dependencies** — If A imports B, B cannot import A. Use dependency injection or shared modules.
4. **Imports at the top** — All imports at file top, ordered: external → internal → relative
5. **Single Responsibility** — A file should have one reason to change.

### Module Rules

```typescript
// ✅ Barrel exports (index.ts) — re-export only what consumers need
export { Pet } from './pet';
export { createApp } from './app';
export { CHANNELS } from '../shared/channels';

// ✅ Named exports, NOT default exports
export class Pet { }
export function createApp() { }

// ❌ Avoid default exports — they make refactoring harder
export default Pet; // Bad: import Pet from './pet' — what's 'Pet'?
```

---

## Naming Conventions

### The Three Questions

Every name should answer three questions:
1. **Why does it exist?** (purpose)
2. **How is it used?** (usage)
3. **What does it represent?** (semantics)

If you can't answer all three, rename it.

### Casing Rules

| Element | Convention | Example |
|---------|------------|---------|
| Class / Interface | PascalCase | `Pet`, `PetState`, `MoodEngine` |
| Function / Method | camelCase | `feedPet()`, `calculateDecay()` |
| Variable | camelCase | `currentMood`, `isDragging` |
| Constant | SCREAMING_SNAKE | `MAX_HUNGER`, `BASE_DECAY_RATE` |
| Private member | # prefix (JS) or _ prefix (legacy) | `#cache`, `_internal` |
| File (class) | PascalCase matching class | `pet.ts`, `mood-engine.ts` |
| File (module) | camelCase | `constants.ts`, `utils.ts` |
| CSS class | BEM | `pet-window__sprite--happy` |
| IPC channel | kebab-case with namespace | `pet:get-state` |
| Environment variable | SCREAMING_SNAKE | `COMFY_UI_PORT` |

### Semantic Naming

```typescript
// ✅ Boolean: is/has/can/should prefix
const isHappy = pet.mood === 'happy';
const hasDecayed = pet.hunger < threshold;
const canInteract = !pet.isSleeping;

// ✅ Function: verb + noun
function calculateHungerDecay(elapsed: number): number { }
function renderPetSprite(sprite: Sprite): void { }
function persistState(state: PetState): void { }

// ✅ Variables: noun phrase
const hungerDecayRate = 0.05;
const lastInteractionTime = Date.now();
const spritePath = resolveAsset('happy.png');

// ❌ Never use meaningless names
const x = 5; // What is x?
function process() { } // Process what?
const data = getData(); // What data?
const flag = true; // What flag?

// ❌ Never use abbreviations unless universally known
const hp = 100; // hp? hit points? health points?
const btn = document.querySelector('button'); // btn? why not 'button'?
```

### Avoid Redundancy in Names

```typescript
// ❌ Redundant
const petObject = new Pet();
interface PetInterface { }
class PetClass { }
function petFunction() { }

// ✅ Name reflects role, not type
const activePet = new Pet();
interface PetState { }
class Pet { }
function feedPet() { }
```

---

## DRY Principle (Don't Repeat Yourself)

> "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system." — Dave Thomas

### Identifying Duplication

Three or more instances of the same pattern = duplication that needs abstraction.

### Applying DRY

**Constants — Magic Numbers:**

```typescript
// ❌ Duplicated magic numbers throughout codebase
if (pet.hunger < 20) { /* warn */ }
if (hunger <= threshold) { /* critical */ }  // what threshold?
setTimeout(checkNeeds, 60000);  // why 60000?

// ✅ Single source of truth in constants.ts
export const NEED_THRESHOLDS = {
  HUNGER_WARNING: 20,
  HUNGER_CRITICAL: 5,
  HAPPINESS_WARNING: 30,
  CLEANLINESS_WARNING: 25,
} as const;

export const TIMING = {
  NEED_CHECK_INTERVAL_MS: 60_000,
  DECAY_TICK_MS: 1000,
  AUTO_SAVE_MS: 30_000,
} as const;

// Usage
if (pet.hunger < NEED_THRESHOLDS.HUNGER_WARNING) { /* warn */ }
```

**Logic — Helper Functions:**

```typescript
// ❌ Same validation logic in three places
function feedPet(amount: number) {
  if (amount <= 0 || amount > 100 || isNaN(amount)) {
    throw new Error('Invalid amount');
  }
  // feed logic
}

function cleanPet(amount: number) {
  if (amount <= 0 || amount > 100 || isNaN(amount)) {
    throw new Error('Invalid amount');
  }
  // clean logic
}

// ✅ Single validation function
function assertValidAmount(amount: number, name: string): asserts amount is number {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
    throw new RangeError(`${name} must be between 0 and 100, got: ${amount}`);
  }
}

function feedPet(amount: number) {
  assertValidAmount(amount, 'feed amount');
  // feed logic — validation handled once
}
```

**Types — Shared Interfaces:**

```typescript
// ❌ Duplicated shape definitions
// In main process:
interface PetData {
  mood: string;
  hunger: number;
  happiness: number;
}

// In renderer process:
interface PetDisplay {
  mood: string;
  hunger: number;
  happiness: number;
}

// ✅ Single shared type in shared/types.ts
export interface PetState {
  mood: Mood;
  hunger: number;  // 0-100
  happiness: number;  // 0-100
  cleanliness: number;  // 0-100
  health: number;  // 0-100 (derived)
  lastInteraction: number;  // epoch ms
}
```

**Configuration — Centralized Config:**

```typescript
// ❌ Scattered config
const decayRate = 0.05;
const saveInterval = 30000;
const maxNeed = 100;

// ✅ Config object with validation
export const CONFIG = {
  decay: {
    hungerRate: 0.05,      // per second
    happinessRate: 0.02,
    cleanlinessRate: 0.01,
    tickIntervalMs: 1000,
  },
  storage: {
    autoSaveMs: 30_000,
    key: 'hoshi-pet-state',
    version: 1,
  },
  needs: {
    max: 100,
    min: 0,
    warningThreshold: 25,
    criticalThreshold: 10,
  },
} as const;

export type AppConfig = typeof CONFIG;
```

### When NOT to Apply DRY

DRY is about **knowledge duplication**, not **code similarity**. Two functions that happen to look similar but represent different knowledge should NOT be merged:

```typescript
// ✅ Two separate functions — different knowledge
function calculateHungerDecay(elapsed: number): number {
  return elapsed * CONFIG.decay.hungerRate;
}

function calculateHappinessDecay(elapsed: number): number {
  return elapsed * CONFIG.decay.happinessRate;
}

// ❌ Forced DRY — conflates two separate concepts
function calculateDecay(elapsed: number, type: 'hunger' | 'happiness'): number {
  // This adds a branching point that must be maintained
  // If hunger decay changes, this function changes — coupling
  const rate = type === 'hunger' ? 0.05 : 0.02;
  return elapsed * rate;
}
```

---

## SOLID Principles

### S — Single Responsibility Principle

> A class/function should have one, and only one, reason to change.

```typescript
// ❌ Multiple reasons to change
class Pet {
  // Reason 1: Pet behavior changes
  feed(amount: number) { }
  play() { }

  // Reason 2: Rendering changes
  renderToDOM(element: HTMLElement) { }

  // Reason 3: Persistence changes
  saveToStorage() { }
  loadFromStorage() { }

  // Reason 4: Network changes
  syncToCloud() { }
}

// ✅ Separated responsibilities
class Pet {
  // Only pet behavior — one reason to change
  feed(amount: number): void { }
  play(): void { }
  decay(elapsed: number): void { }
}

class PetRenderer {
  // Only rendering — one reason to change
  render(pet: Pet, element: HTMLElement): void { }
}

class PetStorage {
  // Only persistence — one reason to change
  save(pet: Pet): void { }
  load(): Pet | null { }
}
```

**The 200-line rule:** If a file exceeds 200 lines, audit for multiple responsibilities.

### O — Open/Closed Principle

> Software entities should be open for extension, but closed for modification.

```typescript
// ❌ Modifying existing code for every new mood
class PetRenderer {
  render(pet: Pet) {
    if (pet.mood === 'happy') {
      this.showSprite('happy.png');
    } else if (pet.mood === 'sick') {
      this.showSprite('sick.png');
    } else if (pet.mood === 'sleeping') {
      this.showSprite('sleeping.png');
    }
    // Every new mood requires modifying this function
  }
}

// ✅ Extension via registration — never modify the renderer
type MoodRenderer = (element: HTMLElement, intensity: number) => void;

class MoodRegistry {
  private renderers = new Map<Mood, MoodRenderer>();

  register(mood: Mood, renderer: MoodRenderer): this {
    this.renderers.set(mood, renderer);
    return this; // fluent API
  }

  render(mood: Mood, element: HTMLElement, intensity: number): void {
    const renderer = this.renderers.get(mood);
    if (!renderer) {
      throw new Error(`No renderer registered for mood: ${mood}`);
    }
    renderer(element, intensity);
  }
}

// Extension — add new moods without touching existing code
const registry = new MoodRegistry();
registry
  .register('happy', (el, intensity) => { /* ... */ })
  .register('sick', (el, intensity) => { /* ... */ })
  .register('sleeping', (el, intensity) => { /* ... */ })
  .register('excited', (el, intensity) => { /* NEW — no modification */ });
```

### L — Liskov Substitution Principle

> Subtypes must be substitutable for their base types without altering program correctness.

```typescript
// ❌ Violation — Penguin can't fly, but Bird says it can
class Bird {
  fly(): void { /* flies */ }
}
class Penguin extends Bird {
  fly(): void {
    throw new Error("Penguins can't fly"); // Surprise! Violates contract
  }
}

// ✅ Segregated interfaces — no false promises
interface Flyable {
  fly(): void;
}

interface Swimmable {
  swim(): void;
}

class Eagle implements Flyable {
  fly(): void { /* flies */ }
}

class Penguin implements Swimmable {
  swim(): void { /* swims */ }
}
```

### I — Interface Segregation Principle

> Clients should not be forced to depend on interfaces they do not use.

```typescript
// ❌ Fat interface — forces implementors to stub unused methods
interface PetOperations {
  feed(): void;
  clean(): void;
  play(): void;
  medicate(): void;
  groom(): void;
  train(): void;
}

// Automated feeder doesn't need play/medicate/groom/train
class AutomatedFeeder implements PetOperations {
  feed() { /* works */ }
  clean() { /* works */ }
  play() { /* meaningless for a feeder */ }
  medicate() { /* meaningless */ }
  groom() { /* meaningless */ }
  train() { /* meaningless */ }
}

// ✅ Segregated interfaces — implement only what you need
interface Feedable {
  feed(amount: number): void;
}

interface Cleanable {
  clean(): void;
}

interface Playable {
  play(game: Minigame): void;
}

class AutomatedFeeder implements Feedable, Cleanable {
  feed(amount: number) { /* works */ }
  clean() { /* works */ }
  // No stub methods — clean contract
}
```

### D — Dependency Inversion Principle

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

```typescript
// ❌ High-level depends on low-level implementation
class PetGame {
  private storage = new LocalStorage(); // Direct dependency

  save() {
    this.storage.setItem('pet', this.pet);
  }
}

// ✅ Both depend on abstraction
interface Storage {
  setItem(key: string, value: unknown): void;
  getItem(key: string): unknown | null;
  removeItem(key: string): void;
}

class PetGame {
  constructor(private storage: Storage) { } // Injected abstraction

  save() {
    this.storage.setItem('pet', this.pet);
  }
}

// Inject the concrete implementation
const game = new PetGame(new LocalStorage());

// ✅ Easy to test — inject mock
const mockStorage = new MemoryStorage();
const testGame = new PetGame(mockStorage);
```

---

## Code Style & Formatting

### Line Length

- **Soft limit:** 80 characters (fits side-by-side diffs)
- **Hard limit:** 100 characters (never exceed)
- Break long lines at logical points

### Indentation

- **2 spaces** — no tabs
- Continuation indent: 4 spaces (2 + 2)

```typescript
// ✅ Function call with many args — continuation indent
const pet = createPet({
  name: 'Darkness',
  initialMood: 'idle',
  decayRates: CONFIG.decay,
});

// ❌ Inconsistent indentation
const pet = createPet({
    name: 'Darkness',  // 4 spaces — wrong
  initialMood: 'idle',  // 2 spaces — wrong
});
```

### Braces

```typescript
// ✅ Opening brace on same line (1TBS style)
if (pet.isHungry()) {
  this.feedPet();
} else {
  this.idle();
}

// ❌ Allman style — not our convention
if (pet.isHungry())
{
  this.pet();
}

// ✅ Single statement — braces still required (prevents dangling else)
if (pet.isHungry()) {
  this.feedPet();
}
```

### Semicolons

```typescript
// ✅ Always use explicit semicolons
const pet = new Pet();
pet.feed(10);

// ❌ Relying on ASI — fragile, error-prone
const pet = new Pet()
pet.feed(10)
```

### Comments

```typescript
// ✅ Explain WHY, not WHAT
// Decay accelerates after 8h to prevent AFK accumulation exploits
if (elapsed > EIGHT_HOURS) {
  return baseDecay * 2;
}

// ❌ Comments that restate the code
// Multiply baseDecay by 2
return baseDecay * 2;

// ✅ JSDoc on all public APIs
/**
 * Feeds the pet, reducing hunger and boosting happiness.
 * @param amount - Food amount (0-100)
 * @returns Updated hunger level
 * @throws {RangeError} If amount is out of bounds
 */
feed(amount: number): number {
  assertValidAmount(amount, 'feed amount');
  this.hunger = clamp(this.hunger + amount, 0, CONFIG.needs.max);
  this.lastInteraction = Date.now();
  return this.hunger;
}

// ❌ Don't use comments to disable code — delete it
// this.pet(); // TODO: fix this later
```

### Vertical Formatting

```typescript
// ✅ Code reads top-to-bottom like an essay
// 1. High-level overview first
class PetGame {
  // 2. Public API first
  start(): void { }
  stop(): void { }

  // 3. State
  private pet: Pet;
  private timer: number | null = null;

  // 4. Private implementation details
  private tick(): void { }
  private render(): void { }
}

// ❌ Private details first — reader has no context
class PetGame {
  private tick(): void { } // Why does this exist?
  private render(): void { }
  private pet: Pet; // What pet?
  public start(): void { } // Finally, the entry point
}
```

---

## Documentation Requirements

### File-Level Headers

```typescript
/**
 * @fileoverview Pet state machine and needs decay engine.
 * Handles hunger, happiness, cleanliness decay over time
 * and state transitions based on need thresholds.
 *
 * @module core/pet
 * @author @coder
 */
```

### Function Documentation (JSDoc)

```typescript
/**
 * Calculates decayed need value after elapsed time.
 *
 * Decay is linear: value - (elapsed * rate).
 * Result is clamped to [0, max].
 *
 * @param current - Current need value (0-100)
 * @param elapsedMs - Milliseconds since last decay
 * @param rate - Decay rate per millisecond
 * @returns Decayed value, clamped to [0, 100]
 *
 * @example
 * // 10 seconds at 0.05/sec from full
 * calculateDecay(100, 10000, 0.00005); // → 95
 */
function calculateDecay(current: number, elapsedMs: number, rate: number): number {
  return clamp(current - (elapsedMs * rate), 0, CONFIG.needs.max);
}
```

### README.md Requirements

Every module should have a README.md if it has:
- Non-obvious setup steps
- External dependencies
- Multiple files with complex interactions

---

## Testing Standards

### Test File Location

```
src/
├── pet.ts
└── pet.test.ts      # Co-located with source

# OR for larger modules:
tests/
├── unit/
│   ├── pet.test.ts
│   └── decay.test.ts
└── integration/
    └── app-lifecycle.test.ts
```

### Test Structure (AAA Pattern)

```typescript
describe('Pet', () => {
  describe('feed', () => {
    it('should increase hunger when fed', () => {
      // Arrange
      const pet = new Pet({ hunger: 50, happiness: 50 });

      // Act
      const result = pet.feed(20);

      // Assert
      expect(result).toBe(70);
      expect(pet.hunger).toBe(70);
    });

    it('should throw when amount exceeds maximum', () => {
      const pet = new Pet({ hunger: 50, happiness: 50 });
      expect(() => pet.feed(101)).toThrow(RangeError);
    });

    it('should throw when amount is negative', () => {
      const pet = new Pet({ hunger: 50, happiness: 50 });
      expect(() => pet.feed(-5)).toThrow(RangeError);
    });
  });
});
```

### Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Core logic (pet state machine) | 95% |
| Storage layer | 90% |
| IPC handlers | 85% |
| Rendering code | 70% |
| Configuration | 80% |

### Testing Rules

1. **One assertion per test** (ideally) — if it tests multiple things, split it
2. **No logic in tests** — no if/else, no loops. Duplicate code is acceptable in tests.
3. **Tests should never depend on execution order**
4. **Use test doubles for boundaries** — mock storage, timers, network
5. **Test edge cases** — 0, negative, max, null, undefined, empty

---

## Git & Version Control

### Branch Strategy

```
main          (always deployable)
  ├── feature/personality-evolution
  ├── feature/desktop-awareness
  ├── bugfix/decay-calculation
  └── docs/coding-standards
```

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature (maps to MINOR semver)
- `fix`: Bug fix (maps to PATCH semver)
- `docs`: Documentation only
- `style`: Formatting, missing semicolons (no logic change)
- `refactor`: Code change that neither fixes nor adds feature
- `perf`: Performance improvement
- `test`: Adding or correcting tests
- `chore`: Build process, deps, tooling
- `ci`: CI/CD changes
- `build`: Build system changes

**Examples:**

```
feat(pet): add hunger decay calculation

Decay is linear at 0.05/sec, clamped to [0, 100].
Triggers sick state when hunger < 10.

Closes #3
```

```
fix(storage): correct JSON parse error on corrupt save

Previously threw uncaught SyntaxError on startup.
Now catches, logs warning, and initializes fresh state.
```

### PR Rules

1. **Atomic commits** — One logical change per commit
2. **No WIP commits** — Squash before merging
3. **PR description must include:**
   - What changed and why
   - Testing performed
   - Screenshots (if UI change)
4. **Max 400 lines changed** — Split large PRs
5. **Require 1 review** before merge
6. **CI must pass** before merge

---

## Code Review Checklist

Every PR must satisfy ALL of these:

### Functionality
- [ ] Code does what the PR description claims
- [ ] Edge cases handled (0, null, empty, max, negative)
- [ ] No regressions — existing tests pass
- [ ] New tests added for new behavior

### Design
- [ ] Single responsibility maintained
- [ ] No premature abstraction (wait for 3 instances)
- [ ] Dependencies injected, not instantiated
- [ ] Interfaces over implementation

### Style
- [ ] Follows naming conventions
- [ ] No magic numbers — named constants
- [ ] Consistent with existing patterns
- [ ] No commented-out code

### DRY
- [ ] No duplicated logic
- [ ] Shared types imported from shared/
- [ ] Constants centralized in constants.ts

### SOLID
- [ ] Single responsibility per function/class
- [ ] Extension points use interfaces/abstractions
- [ ] No fat interfaces forced on consumers
- [ ] Dependencies inverted at boundaries

### Testing
- [ ] Tests cover happy path
- [ ] Tests cover edge cases
- [ ] Tests cover error paths
- [ ] No flaky tests (time-dependent tests use injected clocks)

### Security
- [ ] No secrets in code or logs
- [ ] User input sanitized (if applicable)
- [ ] No `eval()` or dynamic code execution
- [ ] Dependencies audited (no known vulnerabilities)

---

## Security Guidelines

### Secrets Management

```typescript
// ❌ NEVER do this
const GITHUB_TOKEN = 'ghp_abc123...';
const apiKey = 'sk-12345...';

// ✅ Environment variables (loaded at runtime, never committed)
const token = process.env.GITHUB_TOKEN;
if (!token) {
  throw new Error('GITHUB_TOKEN environment variable is required');
}

// ✅ For renderer: use contextBridge, never expose full process
contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('pet:get-state'),
  // Never: require: require, process: process
});
```

### Input Validation

```typescript
// ✅ Validate at boundaries
function feedPet(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new TypeError(`Expected number, got: ${typeof amount}`);
  }
  assertValidAmount(amount, 'feed amount');
  // ...
}

// ❌ Trust the caller
function feedPet(amount: number): number {
  return this.hunger + amount; // What if amount is negative? NaN? Infinity?
}
```

### IPC Security

```typescript
// ✅ Validate IPC sender
ipcMain.handle('pet:interact', (event, payload) => {
  if (event.senderFrame?.url !== PET_WINDOW_URL) {
    throw new Error('Unauthorized IPC caller');
  }
  // ...
});

// ✅ Whitelist channels — no generic message passing
const ALLOWED_CHANNELS = new Set([
  'pet:get-state',
  'pet:interact',
  'overlay:move',
]);
```

---

## Summary: The 10 Commandments

1. **Name things for clarity** — If you can't name it in one breath, refactor it
2. **One job per function** — If you need "and" to describe it, split it
3. **DRY the knowledge, not the code** — Similar code isn't always duplication
4. **Inject dependencies** — `new` belongs in composition root, not business logic
5. **Types are documentation** — Leverage TypeScript to make invalid states unrepresentable
6. **Fail at the boundaries** — Validate inputs, handle errors, never propagate garbage
7. **Test behavior, not implementation** — Tests should survive refactors
8. **Commit atomically** — One logical change, one commit, one reason to change
9. **Review ruthlessly** — The PR checklist is a floor, not a ceiling
10. **Leave it cleaner** — Every touch should improve the codebase

---

*These standards are living documents. Propose changes via PR when you find better approaches.*
