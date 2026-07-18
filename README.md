# microapp-template

A reusable starter for small static microapps: vanilla HTML/CSS/JS, GitHub Pages deployment, and a design system inspired by [pqm-stepper](https://github.com/filcuk/pqm-stepper).

**Live demo:** after enabling GitHub Pages, open `demo.html` on your site (e.g. `https://<user>.github.io/<repo>/demo.html`).

## Quick start

1. Click **Use this template** on GitHub to create a new repo.
2. Follow **[USAGE.md](USAGE.md)** to customize the homepage, remove the demo if you do not need it, and deploy.
3. Build your UI in `index.html` and wire logic in [`app/main.js`](app/main.js).

## Documentation

| Guide | Contents |
| ----- | -------- |
| **[USAGE.md](USAGE.md)** | Forking the template, project layout, local preview, GitHub Pages, component catalogue, and markup/JS examples |
| **[AGENTS.md](AGENTS.md)** | Rules for AI assistants working in this repo |
| **[DISCLAIMER.md](DISCLAIMER.md)** | LLM assistance notice |
| **[demo.html](demo.html)** | Interactive showcase of all components |

## Stack

- Plain HTML, CSS custom properties, and ES modules
- Light / dark / system theme with flash-free `theme-init.js`
- Shared page chrome (footer, theme toggle, page nav) via `initShell()`
- Deployed with GitHub Actions to GitHub Pages

## Development

```bash
npm ci
npm run lint
npm test
npx serve .
```

Then open `http://localhost:3000`. CI (`.github/workflows/ci.yml`) runs lint and tests on push and pull requests.

## License

MIT - see [LICENSE](LICENSE).
