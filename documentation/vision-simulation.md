# Vision Simulation

Clones the selected node into an adjacent frame with its colors transformed to approximate how someone with a given color vision deficiency would perceive it — without touching the original.

## How to use

1. Select any node on the canvas.
2. Open the plugin → **Vision Simulation**.
3. Click one of **Protanopia**, **Deuteranopia**, **Tritanopia**, or **Achromatopsia**.
4. A new frame named after that condition appears immediately to the right of your selection (`x + width + 40px` gap), containing a color-transformed clone. The new frame becomes the active selection.
5. Click the same condition button again (with the original still selected) to toggle it off — it looks up a frame already named for that condition and deletes it.
6. **Clear All** removes every simulation frame on the current page in one action.

## How it works

`features/vision-simulation.ts`:

- `simulateVision(node, msg)` — maps the message type to a condition matrix, checks whether a frame already named for that condition exists (toggle-off), otherwise creates a `FRAME`, clones the source node into it at `(0, 0)`, and recursively rewrites every descendant's fills via `adjustColorsForColorBlindnessType`.
- `adjustColorsForColorBlindnessType(node, matrix)` — for `SOLID` fills, applies a 3×3 linear color-transform matrix (`applyColorMatrix`) to approximate the given deficiency; pure white fills are left untouched. Gradient fills (`GRADIENT_LINEAR/RADIAL/ANGULAR/DIAMOND`) have the same matrix applied per gradient stop, preserving each stop's alpha.
- `clearAllVisionSimulationFrames()` — finds and removes every top-level frame named after one of the four condition labels.

The four transform matrices (`COLOR_BLINDNESS_MATRICES`) are fixed approximations for protanopia, deuteranopia, tritanopia, and achromatopsia (the last is a standard luminance-weighted grayscale matrix, i.e. full color blindness rather than a partial deficiency).

## Message contract

| Message | Direction | Payload | Purpose |
|---|---|---|---|
| `MESSAGE.VIEW.VISION_SIMULATION` | UI → plugin | — | Open this view |
| `PROTANOPIA` / `DEUTERANOPIA` / `TRITANOPIA` / `ACHROMATOPSIA` (`MESSAGE.COLOR_BLINDNESS.KEY.*`) | UI → plugin | — | Run (or toggle off) that simulation on the current selection |
| `MESSAGE.CLEAR` | UI → plugin | — | Remove all simulation frames on the page |
| `MESSAGE.BACK` | UI → plugin | — | Return to the main menu |

## Known limitations

- Frame identification is by **name match**, so renaming a simulation frame (or naming an unrelated frame "Protanopia" etc.) will confuse the toggle/clear logic.
- Only `SOLID` and the four gradient paint types are transformed; image fills are left as-is.
- Simulating a large/deeply-nested node duplicates and recolors every descendant, which can be slow on big trees.
- The plugin does not auto-scroll/zoom to the new frame (`figma.viewport.scrollAndZoomIntoView` is present but commented out in `simulateVision`).
