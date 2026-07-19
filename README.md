# C++ Image Converter

Browser microapp that converts **between C/C++ image arrays and SVG**. Neighbouring same-colour pixels are merged into larger rectangles for easier editing. Runs entirely client-side — suitable for GitHub Pages.

## Features

- **C → SVG** — paste or upload `.c` / `.h` / `.txt`, preview, download `.svg`
- **SVG → C** — paste or upload `.svg` (including path-based artwork); download a Piskel-like `.c` array (including indexed I1–I8 with palette)
- **C → C** — convert between C array types (e.g. `uint32_t` ARGB32 → `uint16_t` RGB565 or indexed `uint8_t`) and/or resize, without going through SVG
- **Pixel formats** — Auto-detect from element type, or pick manually:
  - ARGB32 (Piskel little-endian RGBA / `0xAABBGGRR`) and classic AARRGGBB
  - XRGB8888, RGB888 / BGR888
  - RGB565 / byte-swapped RGB565, RGB565A8, ARGB8565
  - Indexed I1–I8 (palette from `*_color` / `*_palette` when present)
  - Grayscale L8 / AL88, packed 2/4-bit, 1-bit (MSB or LSB)
- **Multi-frame** — frame picker, or **Animate frames** for SMIL-animated SVG
- **Options** — input width/height (when not in source defines), output scale, override fill, minimised SVG, array name

## Quick start

```bash
npm ci
npm run lint
npm test
npx serve .
```

Then open `http://localhost:3000`.

## Usage

### C → SVG

1. Choose **C → SVG**
2. Paste array source or upload a `.c` / `.h` / `.txt` file
3. Confirm pixel format (Auto uses `uint32_t` → ARGB32 Piskel, `uint16_t` → RGB565, `uint8_t` → 1-bit) and **input** size when defines are missing
4. Optionally set **output scale**, override fill, or animate multi-frame sources
5. Preview and download the `.svg`

### SVG → C

1. Choose **SVG → C**
2. Paste SVG or upload an `.svg` (paths and shapes are rasterised in the browser)
3. Pick output format (including **Indexed I1–I8** for palette + packed indices), **output scale**, and array name
4. Download the `.c` file

### C → C

1. Choose **C → C**
2. Paste or upload a `.c` / `.h` / `.txt` array
3. Confirm **input C type** (Auto or manual) and choose **output C type** — any supported format (`uint32_t` ARGB32, `uint16_t` RGB565, `uint8_t` indexed/packed, etc.)
4. Set **input** width/height if the source has no size defines; use **output scale** to resize (nearest-neighbour)
5. Download the converted `.c` file

## Documentation

| Guide | Contents |
| ----- | -------- |
| **[USAGE.md](USAGE.md)** | Design system, project layout, local preview, GitHub Pages, and component catalogue |
| **[AGENTS.md](AGENTS.md)** | Rules for AI assistants working in this repo |
| **[DISCLAIMER.md](DISCLAIMER.md)** | LLM assistance notice |

## Stack

- Plain HTML, CSS custom properties, and ES modules
- Light / dark / system theme with flash-free `theme-init.js`
- Shared page chrome (footer, theme toggle, page nav) via `initShell()`
- Deployed with GitHub Actions to GitHub Pages

## License

MIT - see [LICENSE](LICENSE).
