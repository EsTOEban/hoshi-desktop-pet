# ComfyUI API Access Setup

## Overview
This document describes how to enable and use the ComfyUI API for programmatic control
from the Electron app (Hoshi desktop pet). The API runs on port 8188 by default.

## Starting ComfyUI with API Access

### Basic Start (localhost only)
```bash
cd G:/ML/comfy
python main.py --listen 127.0.0.1 --port 8188
```

### Full Network Access (for MCP/remote control)
```bash
cd G:/ML/comfy
python main.py --listen 0.0.0.0 --port 8188
```

### Recommended: High-Performance Start
```bash
cd G:/ML/comfy
python main.py --listen 127.0.0.1 --port 8188 --highvram
```

> **Note:** `--highvram` keeps models in VRAM for faster switching but uses more memory.
> For the RTX 4080 (16GB VRAM), this is recommended.

## API Endpoints

### Health Check
```bash
curl http://127.0.0.1:8188/system_stats
```

### Queue a Prompt
```bash
curl -X POST http://127.0.0.1:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": <workflow_json>}'
```

### Get Image
```bash
curl http://127.0.0.1:8188/view?filename=<filename>
```

### Upload Image (for img2img)
```bash
curl -X POST http://127.0.0.1:8188/upload/image \
  -F "image=@<filepath>"
```

## Python API Client Example

```python
import requests
import json

COMFYUI_URL = "http://127.0.0.1:8188"

def queue_prompt(workflow_json: dict) -> str:
    """Submit a workflow and return the prompt_id."""
    response = requests.post(
        f"{COMFYUI_URL}/prompt",
        json={"prompt": workflow_json}
    )
    response.raise_for_status()
    return response.json()["prompt_id"]

def get_image(filename: str, subfolder: str = "", folder_type: str = "output"):
    """Retrieve a generated image."""
    params = {
        "filename": filename,
        "subfolder": subfolder,
        "type": folder_type
    }
    response = requests.get(f"{COMFYUI_URL}/view", params=params)
    response.raise_for_status()
    return response.content

def check_queue():
    """Check current queue status."""
    response = requests.get(f"{COMFYUI_URL}/queue")
    return response.json()
```

## Integration with Hoshi Electron App

The Electron app will communicate with ComfyUI via HTTP on localhost:8188.
The app can:
1. Submit generation requests
2. Poll for completion
3. Retrieve generated images
4. Display them in the pet window

See `docs/spec.md` for the full architecture.
