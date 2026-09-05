# Runbook — How Hoshi Works

> **Goal:** Explain every moving part so a new teammate can debug, extend, or operate the app confidently.
> 
> For procedural "how to run locally," see [getting-started](getting-started.md). This document is *explanatory* — here's how it works, here's why.

---

## Architecture Overview

Hoshi follows a layered Electron architecture with a unidirectional data flow:

```
┌─────────────────────────────────────────────────┐
│                  Electron App                     │
│  ┌─────────────┐    IPC    ┌──────────────────┐  │
│  │  Main       │◄─────────►│   Renderer        │  │
│  │  Process    │           │   Process         │  │
│  │ - app.ts    │           │ - index.html      │  │
│  │ - tray.ts   │           │ - index.ts        │  │
│  │ - ipc.ts    │           │ - animations.ts   │  │
│  │ - storage   │           │ - ui/             │  │
│  └──────┬──────┘           └──────────────────┘  │
│         │                                         │
│         ▼                                         │
│  ┌─────────────┐                                  │
│  │   State     │                                  │
│  │  Manager    │                                  │
│  └──────┬──────┘                                  │
│         │                                         │
│         ▼                                         │
│  ┌─────────────┐                                  │
│  │  Shared     │                                  │
│  └─────────────┘                                  │
└─────────────────────────────────────────────────┘
```

**Data flow:** User action → Renderer IPC → Main handler → State dispatch → Reducer (pure) → Subscribers notified → Renderer updates UI.

**Key rule:** All state changes go through `dispatch(action)`. No direct mutations.

**Details:** See [`docs/architecture.md`](architecture.md) for full module diagram and technology justification.

---

## State Machine

The state machine is a pure-function reducer pattern:

```
(state, action, delta_ms) → new_state
```

**Mood is derived, not stored** — `deriveMood()` computes mood from need thresholds. This prevents impossible states (e.g., `hunger=10` with `mood=happy`).

### Mood Derivation Priority

First match wins:

| Priority | Mood      | Trigger |
|----------|-----------|---------|
| 1        | sleeping  | energy < 10 |
| 2        | sick      | cleanliness < 20 |
| 3        | angry     | happiness < 10 |
| 4        | hungry    | hunger < 20 |
| 5        | sad       | happiness < 20 |
| 6        | excited   | happiness ≥ 90 AND energy ≥ 50 |
| 7        | happy     | happiness ≥ 70 |
| 8        | bored     | happiness < 50 |
| 9        | neutral   | default |

### Decay Rates (per minute, configurable)

| Need         | Awake | Sleeping |
|--------------|-------|----------|
| hunger       | -3    | -1       |
| happiness    | -2    | -1       |
| cleanliness  | -1    | -0.5     |
| energy       | -2    | +5       |

**Details:** See [`docs/state-machine-spec.md`](state-machine-spec.md) for full state shape, actions, edge cases, and testability hooks.

---

## Desktop Pet Window

The pet is rendered as a transparent overlay window — it floats above all other windows and uses per-pixel hit-testing to distinguish interactive sprite areas from transparent gaps.

### Transparent Overlay

| Property | Value | Why |
|----------|-------|-----|
| `transparent: true` | No background, sprite shows on desktop | Visual floating pet |
| `frame: false` | No window chrome/borders | Clean look |
| `alwaysOnTop: true` | Stays visible above other windows | Pet is always accessible |
| `skipTaskbar: true` | Not in Alt+Tab or taskbar | Immersive, not a regular app |
| `resizable: false` | Fixed size | Controlled layout |
| `hasShadow: false` | No drop shadow | Clean transparent edges |

### Per-Pixel Hit-Testing

The renderer (demo/index.html) sends mouse-move events to the main process via IPC. The main process checks the cursor position against registered `HitRegion[]` arrays:

```
┌──────────────────┐
│   Transparent    │ ← Click passes through (cursor becomes default)
│   ┌──────────┐   │
│   │  Sprite  │   │ ← Click registers (cursor becomes pointer)
│   │  Region  │   │
│   └──────────┘   │
│   Transparent    │ ← Click passes through
└──────────────────┘
```

**How it works:**

1. Renderer detects mouse-move over sprite area → calls `window.electron.setHitTestEnabled(true)`
2. Main process registers hit regions via `pet:setHitRegions([{ x, y, width, height }])`
3. Mouse events: if cursor is over a hit region, window captures the event. Otherwise, `setIgnoreMouseEvents({ forward: true })` lets it pass through.

### Drag-to-Move

Dragging is IPC-driven to avoid latency:

1. **mousedown** on sprite → renderer calls `pet:startDrag()`
2. **mousemove** → renderer calls `pet:dragTo({ x, y })`
3. **mouseup** → renderer calls `pet:endDrag()`

Window position is saved to `settings.json` on every `moved` event.

### Passthrough Toggle

Passthrough mode makes the **entire** window click-through (not just transparent areas). All mouse events pass to whatever is behind it.

| Method | Scope | Works when passthrough is ON? |
|--------|-------|-------------------------------|
| `Ctrl+Shift+P` global hotkey | OS-level | ✅ Yes — registered via `globalShortcut` |
| Tray menu → Toggle Passthrough | Taskbar icon | ✅ Yes — taskbar is OS-level |
| Right-click pet window | Window-level | ❌ No — mouse events are ignored |

**Implementation:** `applyPassthrough(enabled)` calls `window.setIgnoreMouseEvents(enabled)`. When enabled, opacity drops to 0.85 for visual feedback.

### Scale Controls

Scale ranges from **0.6x to 2.0x** (clamped in `settings.ts`):

- IPC: `pet:setScale(scale)` → resizes window, saves to settings
- Tray: Right-click → Scale → select preset
- Persisted: Yes, restored on next launch

---

## System Tray

The tray icon is the primary control surface — always accessible via the taskbar notification area.

### Context Menu

```
Show Pet
Hide Pet
─────────────
🍖 Feed
🎮 Play
🧼 Clean
💤 Sleep
Toggle Passthrough ← NEW (#29)
─────────────
Settings
Quit
```

### Lifecycle

```
App launch → Tray created → Session started
    │
    ├── Show Pet → window.show()
    ├── Hide Pet → window.hide()
    ├── Quick actions → dispatch to state manager
    └── Quit → save state → app.quit()
```

### Run Model Tracking

`SystemTrayManager` tracks session metrics (stored in-memory):

| Metric | Description |
|--------|-------------|
| `currentSession` | Active session start time |
| `totalRunTime` | Sum of all session durations |
| `sessionCount` | Total sessions started |
| `longestSession` | Maximum single session |
| `averageSession` | Mean session length |

---

## Art Pipeline

### Pre-Generated Assets

The app ships with pre-generated mood images — no GPU required for runtime:

```
assets/characters/darkness/
├── darkness_idle.png
├── darkness_happy.png
├── darkness_sad.png
├── darkness_sick.png
├── darkness_excited.png
├── darkness_sleeping.png
├── darkness_eating.png
├── darkness_bored.png
├── darkness_content.png
└── darkness_ecstatic.png
```

### Mood → Asset Mapping

The renderer's animation system maps current mood to asset filename:

```typescript
const assetMap: Record<Mood, string> = {
  happy: 'darkness_happy.png',
  sad: 'darkness_sad.png',
  sick: 'darkness_sick.png',
  sleeping: 'darkness_sleeping.png',
  excited: 'darkness_excited.png',
  bored: 'darkness_bored.png',
  neutral: 'darkness_idle.png',
  content: 'darkness_content.png',
  upset: 'darkness_sad.png',
  hungry: 'darkness_eating.png',
  angry: 'darkness_sick.png',
};
```

### ComfyUI Integration (Optional)

For generating new art assets (not runtime):

- **Model:** Anima (custom fine-tune)
- **API:** ComfyUI at `http://localhost:8188/`
- **Prompts:** Character-anchored with locked seed for consistency
- **Output:** `assets/characters/darkness/moods/*.png`

**Details:** See [`docs/asset-pipeline.md`](asset-pipeline.md) and [`docs/comfyui-api-setup.md`](comfyui-api-setup.md).

---

## Settings & Persistence

### Storage Location

`%APPDATA%/hoshi-desktop-pet/settings.json`

```json
{
  "window": {
    "x": 1200,
    "y": 600,
    "scale": 1.2,
    "passthrough": false
  }
}
```

### What's Persisted

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `window.x` | number | -1 (center) | Screen X position |
| `window.y` | number | -1 (center) | Screen Y position |
| `window.scale` | number | 1.0 | Clamped 0.6–2.0 |
| `window.passthrough` | boolean | false | Click-through mode |

### How to Reset

Delete `%APPDATA%/hoshi-desktop-pet/settings.json` — defaults are recreated on next launch.

---

## Testing

### Unit Tests

```bash
npm test
```

Runs `npx vitest run` — 417 tests covering:

| Area | Tests | What's verified |
|------|-------|-----------------|
| State machine | ~50 | All mood transitions, decay rates, edge cases |
| Desktop pet window | ~26 | Window creation, IPC handlers, hit-testing, scale, passthrough |
| System tray | ~30 | Menu structure, lifecycle, run model tracking |
| Interactions | ~40 | Feed, play, clean, sleep — state deltas and clamping |

### Test Mode IPC (AC10.x)

For automated QA of transparent windows (no DOM for OS-level hit-testing):

```javascript
// Enable test mode
await window.electron.setTestMode(true);

// Register hit regions
await window.electron.setHitRegions([
  { x: 50, y: 50, width: 200, height: 200, label: 'sprite' }
]);

// Simulate clicks
const result = await window.electron.simulateClick(100, 100);
// result = { hit: true, screenX: ..., screenY: ..., x: 100, y: 100 }

// Check full state
const state = await window.electron.getWindowState();
```

**Why:** Automated hit-testing of transparent windows is hard — these IPC channels let the test suite verify click-through accuracy at each DPI scale without pixel inspection.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Pet stuck in passthrough — can't click anything | All mouse events pass through | **Tray icon → Toggle Passthrough** or **Ctrl+Shift+P** |
| Pet not visible | Window hidden or off-screen | **Tray → Show Pet** or delete `settings.json` to reset position |
| `Electron failed to install correctly` | `dist/` folder missing | Run `node node_modules/electron/install.js` |
| Tray icon missing | Collapsed in taskbar | Click **^** arrow in taskbar to show hidden icons |
| `npm run build` fails with type errors | Missing types or stale build | Run `npx tsc -p tsconfig.json` for full error details |
| Pet jumps back to old position after drag | Settings not saving | Check `%APPDATA%` folder permissions |
| Scale too small/large | Clamped range | Scale is clamped to 0.6x–2.0x in `settings.ts` |
| Mood asset not found | Missing PNG file | Check `assets/characters/darkness/` for the mood filename |
| `GITHUB_TOKEN` errors | Missing `.env` | Create `.env` with `GITHUB_TOKEN=...` (only needed for board automation) |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/main/app.ts` | Electron entry point — wires tray, state, window together |
| `src/main/desktop-pet-window.ts` | Transparent window manager — passthrough, drag, scale, IPC |
| `src/main/system-tray.ts` | Tray icon, context menu, run model tracking |
| `src/main/settings.ts` | Persistent settings (position, scale, passthrough) |
| `src/state/pet-reducer.ts` | Pure reducer — all state changes go through here |
| `src/state/pet-state-manager.ts` | State owner + subscriptions + persistence |
| `src/shared/types.ts` | Core types (PetState, Mood, Needs, PersonalityAxes) |
| `src/shared/ipc-contracts.ts` | IPC channel names and message types |
| `demo/index.html` | Pet display — rendering, hit-testing, drag-to-move UI |
