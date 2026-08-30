## Overview

Hoshi is a Tamagotchi-style desktop pet featuring Darkness from Konosuba, built with Electron. This document outlines the technical architecture and implementation plan.

## Tech Stack

- **Runtime:** Electron (main + renderer process)
- **Frontend:** HTML/CSS/JS (pet window, UI overlays)
- **Backend (in-app):** Node.js via Electron main process
- **Persistence:** localStorage for pet state, settings, history
- **Art Pipeline:** ComfyUI with Anima model (RTX 4080, 16GB VRAM)

## Architecture

```
hoshi-desktop-pet/
├── src/
│   ├── main/           # Electron main process
│   │   ├── app.js      # App lifecycle, window creation
│   │   ├── pet.js      # Pet state machine, needs decay
│   │   ├── storage.js  # Persistence layer (localStorage)
│   │   └── ipc.js      # IPC bridge for renderer ↔ main
│   ├── renderer/       # Renderer process (UI)
│   │   ├── pet-window.html   # Transparent pet window
│   │   ├── pet-window.js     # Animation, interaction handlers
│   │   ├── styles/           # CSS for pet UI
│   │   └── assets/           # Pet sprites, animations
│   └── shared/
│       └── constants.js      # Shared constants (states, needs, intervals)
├── docs/
│   └── seeds/          # Placeholder data for dev/testing
├── package.json
└── README.md
```

## Pet States

| State | Description | Visual |
|-------|-------------|--------|
| `idle` | Default wandering, occasional animations | Standard sprite |
| `happy` | Fed/interacted with recently | Glowing sprite |
| `sick` | Needs neglected too long | `darkness_sick.png` |
| `sleeping` | Low activity hours | Zzz overlay |

## Needs System

- **Hunger:** decays over time → feed interaction
- **Happiness:** decays slower → interact to restore
- **Cleanliness:** periodic → clean interaction
- **Health:** derived from other needs → sick state if neglected

## IPC Channels

| Channel | Direction | Payload |
|---------|-----------|---------|
| `pet:get-state` | renderer → main | none |
| `pet:interact` | renderer → main | `{ type: 'feed'|'clean'|'play' }` |
| `pet:state-update` | main → renderer | `{ state, needs, timestamp }` |

## Implementation Phases

1. **Phase 1:** Electron shell, transparent window, basic pet display
2. **Phase 2:** State machine, needs decay, interaction handlers
3. **Phase 3:** Animations, art integration, polish
4. **Phase 4:** Settings, persistence, auto-launch

## Team

| Role | Agent | Responsibility |
|------|-------|----------------|
| Project Manager | @jake | Planning, coordination, kanban |
| Coder | @coder | Architecture, implementation, code review |
| Art Director | @art-director | Visual style, art pipeline, image generation |
| Product Researcher | @product-researcher | Market research, feature discovery |
| QA Tester | @qa-tester | Test plans, bug reports, edge cases |

## License

This project is licensed under the [PolyForm Strict License 1.0.0](LICENSE) — source-available, non-commercial use only. Not OSI-approved open source.
