# Hoshi Desktop Pet — Architecture

## Module Diagram

```
┌─────────────────────────────────────────────────┐
│                  Electron App                     │
│                                                   │
│  ┌─────────────┐    IPC    ┌──────────────────┐  │
│  │  Main       │◄─────────►│   Renderer        │  │
│  │  Process    │           │   Process         │  │
│  │             │           │                   │  │
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
│  │             │                                  │
│  │ - reducer   │                                  │
│  │ - actions   │                                  │
│  │ - selectors │                                  │
│  └─────────────┘                                  │
│         │                                         │
│         ▼                                         │
│  ┌─────────────┐                                  │
│  │  Shared     │                                  │
│  │  (types,    │                                  │
│  │  contracts) │                                  │
│  └─────────────┘                                  │
└─────────────────────────────────────────────────┘
```

## Data Flow (Unidirectional)

```
User Action (click, tray menu)
       │
       ▼
  Renderer sends IPC message
       │
       ▼
  Main process receives via handler
       │
       ▼
  State Manager dispatches action
       │
       ▼
  Reducer produces new state (pure function)
       │
       ▼
  State Manager notifies subscribers
       │
       ▼
  Main process broadcasts to renderer
       │
       ▼
  Renderer updates UI
```

**Key rule:** No direct renderer-to-renderer or main-to-main state mutations bypassing the state manager. All state changes go through `dispatch(action)`.

## Module Boundaries

| Module | Responsibility | Location |
|--------|---------------|----------|
| `main/` | Electron lifecycle, system tray, window management, IPC handlers, file I/O | `src/main/` |
| `renderer/` | UI rendering, animations, user interaction capture | `src/renderer/` |
| `shared/` | TypeScript types, IPC channel names, constants, pure utilities | `src/shared/` |
| `state/` | Single source of truth, reducer, actions, selectors | `src/state/` |
| `tests/` | Unit and integration tests mirroring `src/` | `tests/` |

## Technology Justification

| Choice | Rationale |
|--------|-----------|
| **Electron** | Cross-platform desktop, transparent frameless windows, system tray API, IPC main↔renderer. Mature ecosystem, proven by Discord/Slack/VSCode. |
| **TypeScript** | Type safety across IPC boundary catches message contract errors at compile time. Google TypeScript style guide alignment. |
| **Reducer pattern** | Lightweight state management without Redux/Zustand overhead. Single `dispatch` function, pure reducer, explicit subscriptions — fits desktop pet's predictable state space. |
| **Vitest** | Native TypeScript support, fast, Jest-compatible API, ideal for unit tests. |
| **Playwright** | (Future) E2E testing for Electron — tests real user flows through tray, window, interactions. |

## State Management Design

```typescript
// The reducer is the ONLY way state changes
const newState = petReducer(currentState, { type: 'FEED' });

// The state manager owns the current state and notifies subscribers
stateManager.subscribe((state) => updateUI(state));

// IPC is the bridge between processes
ipcMain.handle('state:dispatch', (event, action) => {
  stateManager.dispatch(action);
});
```

## Directory Structure

```
hoshi-desktop-pet/
├── src/
│   ├── main/              # Electron main process
│   │   ├── app.ts         # App lifecycle, window creation
│   │   ├── tray.ts        # System tray setup
│   │   └── ipc.ts         # IPC handler registration
│   ├── renderer/          # Electron renderer process
│   │   ├── index.html     # Pet display canvas
│   │   ├── index.ts       # Renderer entry point
│   │   └── animations.ts  # Pet animation logic
│   ├── shared/            # Shared between processes
│   │   ├── types.ts       # Core interfaces (PetState, Needs, Mood)
│   │   └── ipc-contracts.ts  # IPC channel names & message types
│   └── state/             # State management
│       ├── pet-reducer.ts # Pure reducer function
│       ├── pet-state-manager.ts  # State owner + persistence
│       └── *.test.ts      # Unit tests
├── tests/
│   └── unit/              # Mirrors src/ structure
├── assets/                # Tray icon, pet sprites
├── docs/                  # Specs, standards, architecture
├── package.json
└── tsconfig.json
```

## Extension Points (Future Features)

- **Minigames:** Plug into state manager via custom actions
- **Seasonal events:** Subscribe to state changes, override decay rates
- **Multiple characters:** Replace `PetState` with a `Character` abstraction
- **Behavioral memory:** Add a memory slice to state, persist in same JSON
