# Getting Started — Run Hoshi Locally

> **Goal:** Get a contributor from zero to running the app in <15 minutes.
> 
> This is a *procedural* guide: do this, then that. For explanations of how everything works, see the [runbook](runbook.md).

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js** v18+ | Recommended: LTS (v20). Check with `node --version` |
| **Git** | Any recent version. Check with `git --version` |
| **Windows 11** | The desktop pet uses Windows-specific Electron APIs (transparent windows, global shortcuts) |
| **GPU (optional)** | Only needed for ComfyUI art generation. Pre-generated assets are included in the repo. |

> **GPU note:** The desktop pet runs fine without a GPU — it uses pre-generated mood images from `assets/characters/darkness/`. ComfyUI integration is for art pipeline work only.

---

## Clone & Install

```bash
git clone https://github.com/EsTOEban/hoshi-desktop-pet.git
cd hoshi-desktop-pet
npm install
```

What gets installed:

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app framework (transparent windows, tray, global shortcuts) |
| `vite` | Renderer build tool (fast, modern, no config overhead) |
| `typescript` | Type-safe code |
| `vitest` | Test runner (fast, ESM-native, works with Electron's module system) |

> **Windows users:** If `npm install` fails on native modules (e.g., `electron` download), ensure you're running in an unblocked PowerShell/terminal and retry. Behind a proxy? Set `ELECTRON_MIRROR` or `npm config set proxy`.

---

## Environment Setup

Create `.env` in the project root:

```env
# GitHub token (for automated kanban board updates)
# Scope: project (read/write), repo (read)
# Do NOT commit this file — it's in .gitignore
GITHUB_TOKEN=your_token_here
```

What each variable does:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GITHUB_TOKEN` | For board automation only | Lets scripts auto-move kanban tickets. Without it, the app works fine — you just can't update the project board via CLI. |

> **Security:** Never paste tokens into group chat. Tokens are loaded from `.env` at runtime, never committed.

---

## Build

```bash
npm run build
```

This runs two things in sequence:

| Step | Tool | What it does | Output |
|------|------|--------------|--------|
| 1 | `tsc -p tsconfig.json` | TypeScript compilation — type-checks and compiles `src/` to `dist/` | `dist/main/*.js`, `dist/renderer/*.js` |
| 2 | `vite build` | Bundles renderer code (ES modules → browser-ready JS) | `dist/renderer/index.html`, `dist/renderer/assets/*.js` |

**Expected output:** No errors. Build completes in ~10-20 seconds.

**Common build issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| `error TS2322: Type 'string' is not assignable to type 'Mood'` | Missing mood in `Mood` type union | Check `src/shared/types.ts` — all moods used in code must be in the union |
| `error TS2551: Property 'electron' does not exist on type 'Window'` | Missing global type augmentation | Ensure `src/renderer/global.d.ts` exists and is included in `tsconfig.json` |
| `Cannot find module '../shared/types'` | Wrong import path | Paths are relative to file location — `../shared/types` from `src/main/` |

---

## Run

```bash
npm start
```

What launches:

| Process | What happens |
|---------|--------------|
| `electron dist/main/app.js` | Starts Electron main process |
| Main process | Creates `Settings`, `PetStateManager`, `DesktopPetWindow` (transparent overlay), `SystemTray` |
| Renderer process | Loads `dist/renderer/index.html` — runs the game loop (mood decay, interactions, animations) |
| System tray | Tray icon appears in taskbar notification area |

**What you should see:**

1. ✅ **Tray icon** — small pet icon in the taskbar (bottom-right corner)
2. ✅ **Pet window** — Darkness sprite appears on your desktop as a transparent overlay
3. ✅ **Always on top** — pet stays visible above other windows

---

## First-Run Checklist

- [ ] Tray icon is visible in the taskbar
- [ ] Pet window appears on the desktop
- [ ] You can **drag** Darkness around with the mouse
- [ ] **Right-click** the pet window → context menu appears
- [ ] **Ctrl+Shift+P** → passthrough toggle (window becomes click-through)
- [ ] Tray menu → **Quit** → app closes cleanly

> **Passthrough behavior:** When passthrough is ON, mouse events pass through the window to whatever's behind it. To toggle OFF: **tray icon → Toggle Passthrough** or **Ctrl+Shift+P**.

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Electron failed to install correctly` | Electron binary not downloaded | Run `node node_modules/electron/install.js` or `npm install electron --save-dev` |
| `dist/main/app.js not found` | Build didn't run | Run `npm run build` first |
| Pet not visible | Pet window hidden or minimized | Right-click tray → **Show Pet** |
| Pet stuck in passthrough | Can't click to toggle | Right-click tray → **Toggle Passthrough** |
| `Port 5173 already in use` | Another vite process running | Kill other vite dev servers, or change port in `vite.config.ts` |
| Tray icon missing | Collapsed in taskbar | Click **^** arrow in taskbar to show hidden icons |
| Build errors with native modules | Node version mismatch | Ensure Node v18+ (`node --version`) |

---

## Next Steps

- **Understanding how it works?** Read the [runbook](runbook.md)
- **Fixing a bug?** Check the architecture doc: `docs/architecture.md`
- **Adding a feature?** Review the state machine spec: `docs/state-machine-spec.md`
- **Running tests?** `npm test` — see [runbook: Testing](runbook.md#testing)
