# Acceptance Criteria: Desktop Pet Overlay (Issue #28)

**Feature:** Transparent Desktop Window with Click-Through, Drag, Tray, Scale, and Passthrough Toggle  
**Owner:** @coder  
**QA:** @qa-tester  
**Research basis:** `product-researcher` desktop pet rendering analysis (2026-09-05)

---

## 1. Transparent Overlay Window

### 1.1 Window Creation
- [ ] **AC1.1.1:** Application creates a single `BrowserWindow` with `transparent: true`, `frame: false`, `alwaysOnTop: true`.
- [ ] **AC1.1.2:** Window is non-focusable by default (`focusable: false` or `skipTaskbar: true`) so it does not steal keyboard focus from other applications.
- [ ] **AC1.1.3:** Window is excluded from taskbar / alt-tab listings (`skipTaskbar: true`).
- [ ] **AC1.1.4:** Window renders without OS chrome — no title bar, no minimize/maximize/close buttons, no border.
- [ ] **AC1.1.5:** Window loads the existing HTML/CSS/JS game loop (`demo/index.html` content) directly — no browser tab required.
- [ ] **AC1.1.6:** Window background is fully transparent — only the pet sprite and UI elements are visible.

### 1.2 Window Positioning
- [ ] **AC1.2.1:** Window spawns at a default "home" position (e.g., center of primary monitor, or saved position from previous session).
- [ ] **AC1.2.2:** Window position is constrained to visible screen area — no spawning off-screen or on a disconnected monitor.
- [ ] **AC1.2.3:** On multi-monitor setups, window appears on the monitor where the cursor currently is (or last saved monitor).
- [ ] **AC1.2.4:** Window restores to saved position across app restarts.

### 1.3 Window Size
- [ ] **AC1.3.1:** Window dimensions match the pet sprite's scaled size plus minimal padding (no large invisible borders).
- [ ] **AC1.3.2:** Window does not resize unexpectedly during mood transitions.
- [ ] **AC1.3.3:** Window can accommodate UI elements (mood indicator, interaction hints) without clipping.

---

## 2. Click-Through on Transparent Areas

### 2.1 Per-Pixel Hit Testing
- [ ] **AC2.1.1:** On every mouse move event, the application reads the pixel alpha value at the cursor position relative to the window content.
- [ ] **AC2.1.2:** If pixel alpha > threshold (e.g., 128), the window captures the mouse event (interactive region).
- [ ] **AC2.1.3:** If pixel alpha <= threshold (transparent or near-transparent), the mouse event passes through to whatever is underneath (desktop, other apps).
- [ ] **AC2.1.4:** Threshold is configurable but defaults to a value that avoids accidental clicks on anti-aliased sprite edges.

### 2.2 Edge Cases
- [ ] **AC2.2.1:** Anti-aliased sprite boundaries (alpha 1–127) do not cause "sticky" clicks — small transparent gaps around sprite edges pass through correctly.
- [ ] **AC2.2.2:** Semi-transparent mood effects (glows, particles with alpha 50–200) do not create phantom interactive regions.
- [ ] **AC2.2.3:** Rapid mouse movement (≥60 events/sec) does not cause lag or missed hit-test updates.
- [ ] **AC2.2.4:** Hit-testing works correctly when the window is scaled (0.6x–2.0x) — cursor maps to correct sprite pixel.
- [ ] **AC2.2.5:** Hit-testing works correctly when the window is at a non-default DPI / display scaling (125%, 150%, 200%).

### 2.3 Implementation
- [ ] **AC2.3.1:** A near-invisible background (`rgba(255,255,255,0.01)` or similar) is present so mouse events still register on the window for hit-testing, but the background is visually imperceptible.
- [ ] **AC2.3.2:** The hit-test region updates in real-time as the pet moves or animates.
- [ ] **AC2.3.3:** Hit-test data is exposed via a "test mode" IPC channel (`getHitRegions()`) for automated QA verification.

---

## 3. Pet Interaction (When Not in Passthrough Mode)

### 3.1 Click / Tap
- [ ] **AC3.1.1:** Single-click on the pet sprite increases happiness by +3 (or per config).
- [ ] **AC3.1.2:** Single-click logs the interaction in the activity log with timestamp.
- [ ] **AC3.1.3:** If happiness > 80 after click, mood transitions to `happy`.
- [ ] **AC3.1.4:** Rapid double-click triggers "pet" animation or feedback (visual or audio cue).

### 3.2 Drag to Reposition
- [ ] **AC3.2.1:** Click-and-drag on the pet sprite moves the window to follow the cursor.
- [ ] **AC3.2.2:** Drag is smooth — window position updates at ≥30 FPS during drag.
- [ ] **AC3.2.3:** Dragging does not trigger interaction actions (no happiness increase on drag-release).
- [ ] **AC3.2.4:** Dragging outside screen bounds clamps to visible area.
- [ ] **AC3.2.5:** On drag end, the new position is persisted to settings.

### 3.3 Context Menu / Right-Click
- [ ] **AC3.3.1:** Right-click on the pet opens a context menu with: Feed, Play, Clean, Sleep, Scale, Settings, Quit.
- [ ] **AC3.3.2:** Context menu items dispatch the corresponding reducer actions.
- [ ] **AC3.3.3:** Clicking outside the context menu dismisses it without triggering an action.

---

## 4. System Tray Integration

### 4.1 Tray Icon
- [ ] **AC4.1.1:** Application creates a system tray icon on launch.
- [ ] **AC4.1.2:** Tray icon shows a small Darkness sprite (or generic pet icon if sprite unavailable).
- [ ] **AC4.1.3:** Tray icon tooltip displays "Hoshi — Darkness is here" (or current mood).
- [ ] **AC4.1.4:** Tray icon persists across virtual desktop switches (Windows 10/11).

### 4.2 Tray Context Menu
- [ ] **AC4.2.1:** Right-clicking the tray icon opens a context menu with: Show Pet, Hide Pet, Send Home, Feed, Play, Clean, Sleep, Scale, Settings, Quit.
- [ ] **AC4.2.2:** "Show Pet" makes the window visible and restores last position.
- [ ] **AC4.2.3:** "Hide Pet" hides the window (but app continues running).
- [ ] **AC4.2.4:** "Send Home" moves the window to the default home position (center of primary monitor).
- [ ] **AC4.2.5:** Tray menu actions dispatch to the state manager (FEED, PLAY, CLEAN, SLEEP) and update the pet state.
- [ ] **AC4.2.6:** "Quit" gracefully exits the application.

### 4.3 Tray Interactions
- [ ] **AC4.3.1:** Double-clicking the tray icon toggles pet visibility (show if hidden, hide if visible).
- [ ] **AC4.3.2:** If the pet window is hidden, tray icon remains visible and interactive.
- [ ] **AC4.3.3:** If the pet window is visible, tray icon remains visible.

### 4.4 Single Instance
- [ ] **AC4.4.1:** Only one instance of the application can run at a time (enforced via `requestSingleInstanceLock`).
- [ ] **AC4.4.2:** Launching a second instance focuses the existing instance's pet window.

---

## 5. Close-to-Tray Behavior

### 5.1 Window Close
- [ ] **AC5.1.1:** Clicking the X button (if present) or pressing Alt+F4 hides the window and keeps the app running in the tray.
- [ ] **AC5.1.2:** No OS "application not responding" dialog appears when the window is closed.
- [ ] **AC5.1.3:** State is persisted before window hides (or on a timer) — no data loss.

### 5.2 App Lifecycle
- [ ] **AC5.2.1:** `app.on('window-all-closed')` does NOT call `app.quit()` — app stays alive in tray.
- [ ] **AC5.2.2:** `app.on('before-quit')` persists state, destroys tray, and cleans up resources.
- [ ] **AC5.2.3:** State is reloaded on next launch — pet state, position, scale, and mood are restored.

---

## 6. Scale Controls

### 6.1 Scale Range
- [ ] **AC6.1.1:** Scale can be set from 0.6x to 2.0x (configurable bounds).
- [ ] **AC6.1.2:** Default scale is 1.0x.
- [ ] **AC6.1.3:** Scale changes are applied immediately — pet sprite resizes in real-time.
- [ ] **AC6.1.4:** Window dimensions update to match scaled sprite size.

### 6.2 Scale UI
- [ ] **AC6.2.1:** Right-click context menu (or tray menu) includes a Scale submenu with at least 5 preset options (e.g., 0.6x, 0.8x, 1.0x, 1.5x, 2.0x).
- [ ] **AC6.2.2:** Current scale is indicated (checkmark or highlight) in the menu.
- [ ] **AC6.2.3:** Scale can also be adjusted via Settings window.

### 6.3 Scale Persistence
- [ ] **AC6.3.1:** Scale is saved to settings on change.
- [ ] **AC6.3.2:** Scale is restored on next app launch.

---

## 7. Passthrough Toggle

### 7.1 Toggle Mechanism
- [ ] **AC7.1.1:** A passthrough mode can be toggled via: tray menu item, right-click context menu, and configurable hotkey (e.g., Ctrl+Shift+P).
- [ ] **AC7.1.2:** When passthrough is ON, ALL mouse events pass through the window — clicking, dragging, and hovering are ignored.
- [ ] **AC7.1.3:** When passthrough is OFF, normal click-through behavior applies (per-pixel hit-testing).
- [ ] **AC7.1.4:** Passthrough state is visually indicated — e.g., tray icon changes color, or a subtle border appears when OFF.

### 7.2 Passthrough UX
- [ ] **AC7.2.1:** Passthrough is the default state on launch (pet does not block clicks by default).
- [ ] **AC7.2.2:** User can interact with the pet only by toggling passthrough OFF or using tray menu actions.
- [ ] **AC7.2.3:** Tray menu and hotkey work even when passthrough is ON.

---

## 8. Position Persistence

### 8.1 Save
- [ ] **AC8.1.1:** Window position (x, y) is saved to settings on: drag-end, window move, app quit, and periodically (every 30 seconds).
- [ ] **AC8.1.2:** Saved position includes monitor identifier (e.g., `\\.\DISPLAY1`) for multi-monitor restore.
- [ ] **AC8.1.3:** Scale is saved alongside position.

### 8.2 Restore
- [ ] **AC8.2.1:** On app launch, window restores to saved position if the monitor still exists.
- [ ] **AC8.2.2:** If the saved monitor no longer exists (e.g., laptop undocked), window falls back to primary monitor center.
- [ ] **AC8.2.3:** If saved position is off-screen (e.g., monitor resolution changed), position is clamped to visible area.

---

## 9. Performance

### 9.1 Resource Usage
- [ ] **AC9.1.1:** Idle CPU usage is < 1% on modern hardware (pet visible, no interaction).
- [ ] **AC9.1.2:** Memory usage is < 150 MB (including Electron overhead).
- [ ] **AC9.1.3:** No memory leaks over 24-hour uptime (verified via `process.memoryUsage()` logging).

### 9.2 Hit-Testing
- [ ] **AC9.2.1:** Per-pixel hit-testing does not cause frame drops or visible lag.
- [ ] **AC9.2.2:** Hit-test polling rate is ≥30 Hz during mouse movement.
- [ ] **AC9.2.3:** Hit-test pauses when mouse is stationary (no unnecessary CPU cycles).

---

## 10. Test Mode (QA Support)

### 10.1 Debug Channels
- [ ] **AC10.1.1:** App recognizes a `NODE_ENV=test` or `--test-mode` flag that exposes additional IPC channels.
- [ ] **AC10.1.2:** `getHitRegions()` returns current hit-test boundaries as an array of `{x, y, width, height, alpha}` objects.
- [ ] **AC10.1.3:** `getWindowState()` returns `{x, y, width, height, scale, passthrough, visible, monitorId}`.
- [ ] **AC10.1.4:** `setHitTestEnabled(bool)` allows disabling hit-testing for deterministic interaction tests.
- [ ] **AC10.1.5:** `simulateClick(x, y)` dispatches a synthetic click at window-relative coordinates for automated testing.

### 10.2 Logging
- [ ] **AC10.2.1:** Hit-test misses (clicks that pass through) are logged at `debug` level.
- [ ] **AC10.2.2:** Drag start/end events are logged with coordinates.
- [ ] **AC10.2.3:** Passthrough toggle events are logged with new state.

---

## 11. Cross-Platform Considerations

### 11.1 Windows
- [ ] **AC11.1.1:** Transparent window renders correctly on Windows 10 (1903+) and Windows 11.
- [ ] **AC11.1.2:** Click-through works on Windows 10/11 (manual implementation required).
- [ ] **AC11.1.3:** Tray icon appears in the system tray (not the hidden overflow area by default).

### 11.2 macOS (Future)
- [ ] **AC11.2.1:** Transparent pixels (`alpha = 0`) automatically pass clicks through (macOS native behavior).
- [ ] **AC11.2.2:** Tray icon appears in the menu bar.

---

## 12. Error Handling

### 12.1 Graceful Degradation
- [ ] **AC12.1.1:** If the sprite image fails to load, a fallback emoji/placeholder is displayed.
- [ ] **AC12.1.2:** If the tray icon fails to load, a generic icon is used.
- [ ] **AC12.1.3:** If settings file is corrupted, defaults are loaded and a warning is logged.
- [ ] **AC12.1.4:** If the window is moved to an invalid state (NaN coordinates), it resets to home position.

---

## Definition of Done

All acceptance criteria above are met, verified on Windows 10 and Windows 11, with:
- Automated tests covering state transitions, position persistence, and scale bounds.
- Manual QA verification of click-through accuracy, drag smoothness, and tray integration.
- Performance benchmarks (CPU, memory) documented in QA report.
- Test mode implemented and verified working with automated hit-region checks.
