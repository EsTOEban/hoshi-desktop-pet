## Summary
Implement the core desktop pet experience: a transparent, frameless, always-on-top window that displays Darkness directly on the user's desktop with proper click-through behavior, drag-to-move, position persistence, and system tray integration.

## User Value
Users expect a desktop pet to live ON the desktop — not in a browser tab. This is the feature that transforms Hoshi from "web demo" into "actual desktop companion." Without this, the product doesn't deliver on its core promise.

## Current State
- Demo runs in browser tab at `demo/index.html`
- `src/main/app.ts` has transparent window code but it loads `renderer/index.html` (minimal state display)
- No click-through implementation for transparent areas
- No drag-to-move functionality
- No system tray integration
- No position persistence

## Acceptance Criteria

### 1. Transparent Overlay Window
- [ ] Window is `transparent: true`, `frame: false`, `alwaysOnTop: true`
- [ ] Window spans full monitor work area (not a small 400x600 box)
- [ ] Window is `skipTaskbar: true` and `visibleOnAllWorkspaces: true`
- [ ] Renderer loads the full demo HTML (all moods + interactions) centered in the window
- [ ] Background is fully transparent (alpha = 0) except where the pet sprite is visible

### 2. Per-Pixel Alpha Hit-Testing (Click-Through)
- [ ] On mouse move, read pixel alpha at cursor position
- [ ] If alpha > threshold (on sprite): capture click (interactive mode)
- [ ] If alpha = 0 (transparent): pass click through to desktop behind
- [ ] Near-invisible background layer (`rgba(255,255,255,0.01)`) so mouse events register
- [ ] Hotkey to toggle passthrough mode globally (e.g., Ctrl+Shift+P)

### 3. Drag-to-Move + Position Persistence
- [ ] Click and drag anywhere on the sprite to move the pet
- [ ] Save position to app settings on every move (debounced)
- [ ] Restore saved position on app launch
- [ ] "Send Home" action (double-click or menu) returns to center of screen

### 4. System Tray Integration
- [ ] App minimizes to system tray on close (not quit)
- [ ] Tray icon: small Darkness face or Hoshi logo
- [ ] Right-click menu: Show Pet, Hide Pet, Feed, Play, Clean, Sleep, Settings, Quit
- [ ] Double-click tray icon to show pet

### 5. Scale Controls
- [ ] Right-click pet → Scale submenu (0.6x, 0.8x, 1.0x, 1.2x, 1.5x, 2.0x)
- [ ] Scale persists across sessions
- [ ] Pet scales around its center point

### 6. Passthrough Toggle
- [ ] Settings toggle: "Mouse Passthrough" (on/off)
- [ ] When ON: all clicks pass through (pet is decorative only)
- [ ] When OFF: clicks on sprite are captured (interactive)
- [ ] Visual indicator when passthrough is active (subtle glow/border)

## Technical Notes
- Framework: Electron (already in use)
- Hit-testing: Use `canvas` to read pixel alpha at cursor, or `getBoundingClientRect` + sprite dimensions
- Persistence: Electron `app.getPath('userData')` + JSON settings file
- Tray: Electron `Tray` + `Menu` (already imported in app.ts)
- Demo loading: `mainWindow.loadFile('demo/index.html')` instead of renderer

## UX Reference
See product research on desktop pet rendering patterns (Shimeji, OpenPets, AnySoul, Convai Desktop Pet, CodeWalkers).

## Dependencies
- #1 (scaffolding) — must land first to branch from
- Art assets already generated (10 mood states in `assets/characters/darkness/`)
- Demo HTML already exists at `demo/index.html`

## Priority
**Critical** — This is the core product differentiator. Without this, Hoshi is just a web demo.
