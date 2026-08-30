# Asset Output Pipeline

## Overview
Generated ComfyUI assets flow into the Electron app through a structured pipeline
with automatic manifest generation for easy retrieval by mood/state.

## Folder Structure

```
hoshi-desktop-pet/
├── assets/
│   └── characters/
│       └── darkness/
│           ├── base/              # Locked character references
│           │   ├── reference_front.png
│           │   ├── reference_side.png
│           │   └── reference_3q.png
│           ├── moods/             # Mood variants (generated)
│           │   ├── idle.png
│           │   ├── happy.png
│           │   ├── hungry.png
│           │   ├── sick.png
│           │   ├── sleeping.png
│           │   ├── angry.png
│           │   ├── sad.png
│           │   ├── excited.png
│           │   ├── bored.png
│           │   └── evolving.png
│           └── manifest.json      # Auto-generated mapping
```

## Manifest Format

```json
{
  "character": "Darkness",
  "version": "1.0.0",
  "base_path": "assets/characters/darkness",
  "moods": {
    "idle": {
      "file": "moods/idle.png",
      "generated_at": "2026-08-30T12:00:00Z",
      "prompt_hash": "abc123",
      "seed": 742860285903037
    },
    "happy": {
      "file": "moods/happy.png",
      "generated_at": "2026-08-30T12:00:00Z",
      "prompt_hash": "def456",
      "seed": 742860285903038
    }
  },
  "consistency": {
    "base_prompt": "1girl, solo, Darkness from Konosuba...",
    "locked_seed": 742860285903037,
    "model": "anima-base-v1.0",
    "vae": "qwen_image_vae",
    "clip": "qwen_3_06b_base"
  }
}
```

## Generation Workflow

1. **Trigger:** Electron app requests a mood asset via API
2. **Generate:** ComfyUI processes the prompt with locked character settings
3. **Save:** Image saved to `assets/characters/darkness/moods/`
4. **Update:** `manifest.json` auto-updated with metadata
5. **Retrieve:** Electron app reads manifest and loads the image

## Adding New Assets

### Option A: Via ComfyUI Web UI
1. Open `http://localhost:8188`
2. Load the "Mood Variant" workflow template
3. Set the mood prompt and filename
4. Run generation
5. Manifest auto-updates via watcher

### Option B: Via API (programmatic)
```python
from hoshi_assets import generate_mood

generate_mood(
    character="darkness",
    mood="happy",
    prompt="Darkness from Konosuba, happy expression, bright smile..."
)
```

### Option C: Via Manual Placement
1. Save generated image to `assets/characters/darkness/moods/`
2. Run `python scripts/update_manifest.py`
3. Manifest regenerated from folder contents

## File Naming Convention

- Mood assets: `{mood_name}.png` (lowercase, single word)
- Iterations: `{mood_name}_iter{N}_v{M}.png` (during development)
- Final assets: flatten to `{mood_name}.png` when approved

## Quality Standards

- Resolution: 1024×1024 minimum
- Format: PNG (lossless)
- Color space: sRGB
- Background: transparent or solid (per app requirements)
