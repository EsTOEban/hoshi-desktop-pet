# ComfyUI Audit Report

**Date:** 2026-08-30  
**Location:** `G:/ML/comfy/`  
**Status:** Not running  
**Version:** 0.34.0 (ComfyUI core), 1.51.9 (Manager/InstalledVersion in settings)

---

## Installed Models

### Diffusion Models
| File | Size | Path |
|------|------|------|
| `anima-base-v1.0.safetensors` | 4.18 GB | `models/diffusion_models/` |
| `animagine-xl-4.0.safetensors` | 6.94 GB | `models/checkpoints/` |

### Text Encoders
| File | Size | Path |
|------|------|------|
| `qwen_3_06b_base.safetensors` | 1.19 GB | `models/text_encoders/` |

### VAE
| File | Size | Path |
|------|------|------|
| `qwen_image_vae.safetensors` | 253 MB | `models/vae/` |
| `sdxl_vae.safetensors` | 334 MB | `models/vae/` |

### LoRAs
- None installed (empty `models/loras/` directory)

### ControlNets
- None installed

---

## Existing Workflows

### 1. Darkness Workflow.json
- **Location:** `user/default/workflows/Darkness Workflow.json`
- **Type:** KSampler pipeline (txt2img)
- **Configuration:**
  - Resolution: 1024×1024
  - Steps: 38
  - CFG: 4.5
  - Sampler: dpmpp_2m
  - Scheduler: simple
  - Denoise: 1.0
- **Models used:**
  - UNET: anima-base-v1.0.safetensors
  - CLIP: qwen_3_06b_base.safetensors (type: qwen_image)
  - VAE: qwen_image_vae.safetensors
- **Positive prompt:** `1girl, solo, Darkness from Konosuba, blonde hair, blue eyes, silver crusader armor with gold trim, black plate armor, shoulder pauldrons, holding a greatsword, gentle smile, bright fantasy throne room, tall stained glass windows, sunlight streaming in, marble floor, golden decorations, vibrant colors, masterpiece, best quality, highly detailed`
- **Negative prompt:** `lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, username, blurry, deformed, ugly`
- **Seed:** 742860285903037 (fixed)
- **Custom shift:** 3 (ModelSamplingAuraFlow)

---

## Existing Assets

### Input Images
| File | Size | Path |
|------|------|------|
| `idle.png` | 1.1 MB | `input/` |
| `test_base.png` | 366 KB | `input/` |
| `darkness_mood_00002_.png` | 294 KB | `input/` |
| `example.png` | 8.5 KB | `input/` |

### Generated Outputs
- **30 sick-mood variants** across iterations 3–6
- Each iteration: 5 variants (v1–v5)
- Files: `sick_iter{3-6}_{v1-v5}_00001_.png`
- All located in `output/`

---

## Gaps & Blockers

| Item | Status | Notes |
|------|--------|-------|
| ComfyUI running | ❌ Not running | Need to start with `--listen` for API |
| API/MCP config | ❌ Not configured | Need to enable programmatic control |
| ComfyUI Manager | ❌ Not installed | No custom_nodes manager |
| LoRAs | ❌ None | Character consistency LoRA needed |
| ControlNets | ❌ None | Pose/structure control unavailable |
| Other mood workflows | ❌ None | Only sick mood has templates |
| Character consistency anchors | ❌ Not locked | Need locked seed/prompt baseline |

---

## Recommendations

1. **Start ComfyUI with `--listen 0.0.0.0` flag** for API access (task #6)
2. **Install ComfyUI Manager** via custom_nodes for easier workflow management
3. **Create character consistency LoRA** or use IP-Adapter for consistent Darkness generation
4. **Define locked prompt baseline** with fixed seed for character identity (task #9)
5. **Build mood variant workflow** that swaps only the mood-specific prompt elements while keeping character anchors constant (task #10)
