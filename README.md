# Hoshi Desktop Pet

A Tamagotchi-style desktop pet featuring Darkness from Konosuba, built with Electron. License: [PolyForm Strict 1.0.0](LICENSE).

## Overview

Hoshi is an Electron-based desktop pet that lives on your screen as a transparent overlay. Feed, care for, and customize your pet through the debug panel and sprite system.

## Project Structure

```
hoshi/
├── src/
│   ├── shell/
│   │   ├── main.ts          # Electron main process
│   │   ├── preload.ts       # contextBridge API
│   │   ├── overlay.html     # Transparent pet overlay
│   │   ├── panel.html       # Stats display panel
│   │   └── debug.html       # Debug control panel
│   ├── core/
│   │   ├── engine.ts        # Simulation engine
│   │   ├── types.ts         # TypeScript types
│   │   └── store.ts         # Settings persistence
│   └── assets/
│       └── spritesheet.png  # 4×6 grid, 512×768
├── dist/                    # Build output
└── package.json
```

## Architecture

### Drag State Machine

| State | Trigger | Behavior |
|-------|---------|----------|
| idle | — | Pet displays current mood sprite |
| drag_start | mousedown on pet | Record `screenX/Y`, add `.dragging` CSS class |
| dragging | mousemove while active | Calculate `dx/dy` from last screen position, call `overlay:move` IPC |
| drag_end | mouseup | Remove `.dragging` class, conditionally open panel if no movement |

### IPC Flow

```
Renderer (mousemove)
  → ipcRenderer.invoke('overlay:move', dx, dy)
  → Main: overlayPos += {dx, dy}; overlay.setPosition(); store.saveSettings()
```

### Debug Panel

Override pattern allows stat/mood/stage overrides:

```typescript
let debugState: PetView | null = null;

ipcMain.handle('debug:apply', (_, { stats, mood, stage, level }) => {
  debugState = { ...engine.view(), ...overrides };
  broadcast();
});
```

### Sprite System

- **Grid**: 4 columns × 6 rows (128×128 cells, 512×768 total)
- **Row order**: idle, happy, sad, sleep, exercise, sick
- **Switching**: CSS `background-position` via `data-mood` attribute

### Data Persistence

Settings stored at `%APPDATA%/hoshi/hoshi.json`:

```json
{
  "overlayPosition": { "x": 100, "y": 200 },
  "stats": { "energy": 80, "happiness": 70, "fitness": 60, "nourishment": 90 },
  "level": 5,
  "stage": "adult"
}
```

## Build & Run

```bash
npm run build
./node_modules/electron/dist/electron.exe .
```

## Team

This project is managed by the Hoshi team: @project-manager, @coder, @art-director, @product-researcher, @qa-tester.
