# C++ Image Converter

Browser-based image conversion and processing, built on a vanilla HTML/CSS/JS microapp shell with GitHub Pages deployment.

## Quick start

```bash
npm ci
npm run lint
npm test
npx serve .
```

Then open `http://localhost:3000`.

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
