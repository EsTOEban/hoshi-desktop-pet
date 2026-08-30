# Darkness Character Consistency Anchors

## Purpose
Lock the visual identity of Darkness so all mood variants feel like the same character.
Every mood asset derives from this baseline — only expression and mood elements change.

## Visual Reference

### Core Identity
- **Race:** Human (former goddess)
- **Hair:** Long, flowing blonde hair with twin-tail tendency
- **Eyes:** Blue, large, expressive
- **Build:** Tall, voluptuous, athletic (crusader physique)
- **Skin:** Fair

### Default Outfit (Canon)
- Silver crusader armor with gold trim
- Black plate armor underneath
- Shoulder pauldrons (asymmetric, larger on left)
- Red cape (when in crusader mode)
- Greatsword (often held or sheathed)

### Expression Baseline (Neutral/Idle)
- Gentle, slightly ditzy smile
- Wide-eyed, innocent look
- Slight blush on cheeks
- Relaxed posture

---

## Locked Prompt Anchors

### Base Prompt (always included)
```
1girl, solo, Darkness from Konosuba, blonde hair, blue eyes, silver crusader armor with gold trim, black plate armor, shoulder pauldrons, holding a greatsword
```

### Quality Tags (always included)
```
masterpiece, best quality, highly detailed, vibrant colors, bright lighting
```

### Negative Prompt (always included)
```
lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, username, blurry, deformed, ugly
```

### Mood Prompt Modifiers

| Mood | Additional Prompt Elements |
|------|---------------------------|
| Idle | gentle smile, relaxed posture, bright fantasy throne room |
| Happy | cheerful expression, raised arms, sparkles, warm sunlight |
| Hungry | staring at food, drooling, holding empty plate, kitchen background |
| Sick | pale face, sweat drops, lying down, dark circles under eyes |
| Sleeping | closed eyes, peaceful expression, lying down, pillow, moonlit room |
| Angry | furrowed brows, clenched fists, red face, dramatic shadows, fire effects |
| Sad | frowning, tears, sitting alone, rainy window, muted colors |
| Excited | wide open eyes, sparkling, jumping, confetti, bright flash |
| Bored | blank stare, slouching, wilted, clock in background, muted tones |
| Evolving | glowing aura, floating, transformation sequence, cosmic background |

---

## Technical Locks

| Parameter | Locked Value | Notes |
|-----------|-------------|-------|
| Model | anima-base-v1.0.safetensors | Primary diffusion model |
| CLIP | qwen_3_06b_base.safetensors | Text encoder |
| VAE | qwen_image_vae.safetensors | Image decoder |
| Resolution | 1024×1024 | Output size |
| Steps | 38 | Generation quality |
| CFG | 4.5 | Prompt adherence |
| Sampler | dpmpp_2m | Sampler algorithm |
| Scheduler | simple | Noise schedule |
| Base Seed | 742860285903037 | Locked for character identity |
| AuraFlow Shift | 3.0 | Model sampling shift |

> **Important:** The base seed (742860285903037) generates the canonical Darkness look.
> For mood variants, increment by 1-10 for slight variation while maintaining consistency.
> Do NOT change the base seed or core prompt structure.

---

## Reference Poses Needed

1. **Front view** — face and torso visible, full armor detail
2. **Side profile** — silhouette and weapon visible
3. **3/4 view** — dynamic angle showing depth

---

## File Locations

- Character sheet: `assets/characters/darkness/base/reference_*.png`
- Prompt baseline: `assets/characters/darkness/manifest.json` (consistency section)
- This document: `docs/character-anchors.md`
