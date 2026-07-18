# AGENTS.md

Rules for AI agents working in this microapp template repository.

## Confirm before complexity

Ask the user before adding:

- External dependencies (npm packages, CDN libraries, frameworks)
- Build tools or bundlers (Vite, Webpack, Rollup, etc.)
- Non-trivial architecture (state managers, routers, SSR)

Prefer the simplest approach that fits the existing template.

## Stay vanilla

- Plain HTML, CSS, and JavaScript ES modules
- No build step unless explicitly approved
- No `package.json` unless the user requests it

## Reuse the design system

- Use CSS custom properties from `app/tokens.css` (`--bg`, `--accent`, etc.)
- Use existing component classes: `.btn`, `.btn-primary`, `.modal`, `.banner`, `.section-panel`, `.code-block`, `.theme-toggle`
- Add or edit inline UI icons in `app/icons.js` only — do not duplicate SVG paths in HTML
- Do not introduce parallel styling systems (Tailwind, CSS-in-JS, component libraries)

## Page boot conventions

Every HTML entry point should:

1. Include blocking `app/theme-init.js` in `<head>` (prevents theme flash)
2. Link `app/styles.css` (imports `tokens.css` + `app/css/*.css` partials)
3. Call `initShell()` from `app/shell/shell.js` as the first step in the page module

`initShell()` renders shared chrome via `renderPageShell()` (`app/render-shell.js`), then boots icons, external links, heading links, theme toggle, tooltips, and page navigation. Do **not** duplicate footer, theme toggle, or `#page-nav` markup in HTML.

Optional `renderPageShell({ repoUrl, brandUrl, brandName })` overrides for forks.

## Module conventions

| Pattern | Use for |
| -------- | ------- |
| `initX({ … })` | Single instance (dialog, combo, dropdown, expand, tab) |
| `initXs(root)` | Scan a subtree for blocks (e.g. `initTabs`, `initExpands`, `initAccordions`, `initCodeBlocks`) |
| `initShell()` | Standard page boot (footer, theme, page nav, tooltips, external links, heading links) |
| `initExternalLinks(root)` | Append arrow-outward icon to external links |
| `initHeadingLinks(root)` | Copy-link button on `main h2[id]` headings |
| `initCodeBlocks(root)` / `initCodeBlock(el)` | Prism code blocks with copy, modes, toolbar toggles |
| `initExpandableSurfaces(root)` | Maximize `[data-expandable-surface]` to page-width overlay |
| `showBanner()` / `hideBanner()` | Show or hide `.banner` elements; respects `data-banner-expire` |
| `initPageNav()` / `initPageNavPanel()` | Page nav only — requires `PAGE_NAV_MARKUP` from `app/shell/render-shell.js` |
| `initTab()` / `initTabs()` | Single tabbed section vs every `.tabs` block |
| `setHidden()` / `parseBooleanAttr()` | Toggle visibility — always sets **both** `.hidden` class and `hidden` attribute; parse HTML boolean `data-*` values |
| `initPopupMenu()` | Anchored popup menus (combo chevron, dropdown) |
| `initDropdown()` / `initToggleDropdown()` | Single-select vs multi-select toggle dropdown menus |
| `initCombobox()` / `initComboboxes()` | Text input with filterable autocomplete list |
| `initFileDropzone()` / `initFileDropzones()` | Drag-and-drop / browse file picker |
| `initFileDownload()` / `initFileDownloads()` | Click-to-download generated files |
| `initDatePicker()` / `initDatePickers()` | Calendar popup with optional time input |
| `initSlider()` / `initSliders()` | Range slider with editable value (integer, decimal, percentage) |
| `initProgressBar()` / `initProgressBars()` | Progress bar with optional percent or fraction label |
| `initSpinner()` / `initSpinners()` | Loading spinner; optional blocking overlay on a host |
| `initStepper()` / `initSteppers()` | Numeric nudger with decrement/increment buttons |
| `initColorPicker()` / `initColorPickers()` | Hex colour input with inline swatch preview |
| `initToggle()` / `initToggles()` | On/off switch control |
| `initSegmentedControl()` / `initSegmentedControls()` | Segmented control (toggle button group) |
| `initPagination()` / `initPaginations()` | Client-side pagination (numbered pages, no URL change) |
| `initTable()` / `initTables()` | Data table with optional sortable columns and row selection |
| `initProgressIndicator()` / `initProgressIndicators()` | Multi-step wizard with indicators, panels, and back/next |
| `initRichTextEditor()` / `initRichTextEditors()` | Toast UI rich text editor (Markdown + WYSIWYG); requires vendor scripts |
| `onDocumentClickOutside()` / `onDocumentEscape()` | Shared document listeners — do not add per-instance `document` listeners for these |

### Document listeners

`app/utils/document-listeners.js` registers **one** click and one keydown handler on `document`. Modules register callbacks:

- **Click outside:** all handlers run on every click (menus close when click is outside)
- **Escape:** handlers sorted by priority (higher first). Return `true` when handled. Dialogs use priority `100`, expandable surfaces `90`, menus use `50`.

When a module registers listeners, store and call the returned unsubscribe in `destroy()` if provided.

### Visibility

Always use `setHidden()` from `app/utils/dom.js` when showing/hiding elements programmatically. Do not toggle `.hidden` alone.

### Icons

- Declare icons with `data-icon="name"` and optional `data-icon-class="…"` in HTML
- Call `initIcons()` (via `initShell()`) to inject SVGs
- **Agents must not invent or generate SVG paths** — see [`.cursor/rules/icons.mdc`](.cursor/rules/icons.mdc). If an icon is missing, ask the user to add it to `app/icons.js` (a blank template is documented in that file’s header). Reuse existing ids or `{ ref: "other-icon" }` when appropriate.
- Users add new icon paths in `app/utils/icons.js` only — do not duplicate SVG paths in HTML
- Source SVGs from [Icônes — Google Material Icons (Round variant)](https://icones.js.org/collection/ic?s=info&variant=Round); copy path markup into `ICONS` and set `attribution` when required
- For sourced icons, set `name` to the original collection id (e.g. `round-info`) — metadata for traceability; omit for custom or in-house icons. The `ICONS` object key remains the app id used in `data-icon`
- To alias one app id to another, use `{ ref: "other-icon" }` instead of duplicating markup (e.g. `lines: { ref: "note" }`)
- Third-party icons that require a license notice: set `attribution` on the icon definition (use `ICON_ATTRIBUTIONS` for common sets). Rendered as an SVG comment via `createIcon()` / `initIcons()`

## CSS structure

| File | Contents |
| ---- | -------- |
| `app/styles.css` | Entry point — `@import` only |
| `app/tokens.css` | Reset, `:root` tokens, dark theme, base typography, `.hidden`, reduced-motion |
| `app/css/layout.css` | Page shell, sections, section panels, page nav, footer, theme toggle |
| `app/css/code-block.css` | Code blocks and expandable surfaces |
| `app/css/controls-buttons.css` | Toolbar, buttons |
| `app/css/controls-fields.css` | Fields, combobox, date/time, color picker |
| `app/css/controls-widgets.css` | Toggle, segmented control, pagination, progress bar, spinner, slider, stepper |
| `app/css/controls-section-panel.css` | Section panel grid rows |
| `app/css/controls-menus.css` | Combo button, dropdown menus |
| `app/css/controls-disclosure.css` | Expand, accordion, tabs, progress indicator |
| `app/css/controls-file.css` | File dropzone, file download |
| `app/css/overlays.css` | Banners, tooltips, modals |
| `app/css/rich-text-editor.css` | Rich text editor field layout and Toast UI token overrides |
| `app/css/table.css` | Data table layout, sort controls, and selection column |

Keep HTML linking only `styles.css`. Edit tokens or the relevant partial under `app/css/`; do not merge back into a monolith.

## JS module layers

Modules live under `app/shell/`, `app/utils/`, and `app/components/` (no build step). Use this mental model when adding or trimming files:

| Layer | Examples | Role |
| ----- | -------- | ---- |
| Entry | `main.js`, `demo.js`, `theme-init.js`, `config.js`, `version.js` | Loaded directly from HTML |
| Shell | `app/shell/shell.js`, `render-shell.js`, `theme.js`, `page-nav.js`, … | Shared page chrome via `initShell()` |
| Infrastructure | `app/utils/dom.js`, `document-listeners.js`, `icons.js`, `menu.js`, `brand-icon.js` | Shared helpers and registries |
| Components | `app/components/dialog.js`, `dropdown.js`, `tabs.js`, `code-block.js`, … | One `initX` (or `initXs`) per feature — import only what you need |

Respect `prefers-reduced-motion: reduce` — transitions live in components; global overrides are in `tokens.css`. JS scroll behaviour should use `prefersReducedMotion()` from `app/utils/dom.js`.

## Development

After cloning, run `npm ci`, then:

```bash
npm run lint
npm test
```

CI runs the same checks on push and pull requests (`.github/workflows/ci.yml`).

## Keep GitHub Pages deployable

- Entry HTML files live at the repo root (`index.html`, optional pages like `demo.html`)
- Shared assets live under `app/`
- Avoid features that require a backend or server-only APIs
- ES modules need a local server for development (`npx serve .`) — document if adding fetch-based features

## Match aesthetics

Match the established look (based on [pqm-stepper](https://github.com/filcuk/pqm-stepper)):

- GitHub-inspired palette and 6px border radii
- System UI font stack
- Light / dark / auto theme via `data-theme` on `:root`
- Blocking `app/theme-init.js` in `<head>` to prevent flash of wrong theme

## Accessibility

- Dialogs: focus trap, Escape to close (via document listener), restore focus, `aria-modal` and labelled titles
- Toggle buttons: `aria-pressed` where state toggles
- Tooltips: `aria-describedby` linking trigger to `#tooltip` on show/hide; keyboard focus support
- Prefer semantic HTML (`header`, `main`, `footer`, `button`)
- Popup menus: `aria-expanded` on toggle buttons
- Page nav: outer `<nav aria-label="Page navigation">`; jump buttons have `aria-label`; section links are plain anchors with hash `href`; use `data-page-nav-tier` on group headings for nested nav lists

## When extending this template

1. Read `USAGE.md` for available components and fork instructions
2. Check `demo.html` for usage examples
3. Keep changes focused — one concern per file when possible
4. Update `USAGE.md` when you add or change a reusable component, module API, or deploy workflow (see `.cursor/rules/usage-docs.mdc`)
5. Update `AGENTS.md` if you add a new `initX` pattern to the module conventions table
