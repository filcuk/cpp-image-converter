# C++ Image Converter

Browser microapp that converts C/C++ image arrays to editable SVG. Supports **ARGB32** (e.g. Piskel exports), **RGB565**, and packed **1-bit** sources. Neighbouring same-colour pixels are merged into larger rectangles for easier editing.

Runs entirely client-side — suitable for GitHub Pages.

## Quick start

```bash
npm ci
npm run lint
npm test
npx serve .
```

Then open `http://localhost:3000`.

## Usage

1. Paste array source or upload a `.c` / `.h` file
2. Confirm pixel format (Auto detects from `uint32_t` / `uint16_t` / `uint8_t`) and size
3. Optionally override fill colour for the whole SVG
4. Convert, preview, and download the `.svg`

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
