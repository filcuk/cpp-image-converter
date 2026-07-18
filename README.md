# C++ Image Converter

Browser microapp that converts **between C/C++ image arrays and SVG**. Neighbouring same-colour pixels are merged into larger rectangles for easier editing. Runs entirely client-side — suitable for GitHub Pages.

## Features

- **C → SVG** — paste or upload `.c` / `.h` / `.txt`, preview, download `.svg`
- **SVG → C** — paste or upload `.svg` (including path-based artwork); download a Piskel-like `.c` array
- **Pixel formats** — Auto-detect from element type, or pick manually:
  - ARGB32 (Piskel little-endian RGBA / `0xAABBGGRR`) and classic AARRGGBB
  - XRGB8888, RGB888 / BGR888
  - RGB565 / byte-swapped RGB565, RGB565A8, ARGB8565
  - Indexed I1–I8 (palette from `*_color` / `*_palette` when present)
  - Grayscale L8 / AL88, packed 2/4-bit, 1-bit (MSB or LSB)
- **Multi-frame** — frame picker, or **Animate frames** for SMIL-animated SVG
- **Options** — scale, override fill, minimised SVG, array name (SVG → C)

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
3. Confirm pixel format (Auto uses `uint32_t` → ARGB32 Piskel, `uint16_t` → RGB565, `uint8_t` → 1-bit) and size
4. Optionally set scale, override fill, or animate multi-frame sources
5. Preview and download the `.svg`

### SVG → C

1. Choose **SVG → C**
2. Paste SVG or upload an `.svg` (paths and shapes are rasterised in the browser)
3. Pick output format and array name
4. Download the `.c` file

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
