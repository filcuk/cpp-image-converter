# Usage guide

How to fork this template into your own app, deploy it, and use the design system components.

## Creating a new app from this template

### 1. Create the repository

1. Click **Use this template** on GitHub (or clone this repo).
2. Rename the repository for your app.

### 2. Customize the homepage

Edit [`index.html`](index.html):

- `<title>`, header `<h1>`, and `.tagline`
- Replace the `<main>` content with your app UI
- Remove the link to `demo.html` when you drop the demo page (see below)
- Swap logo files under `app/res/` or update the `<img>` paths

Wire your page logic in [`app/main.js`](app/main.js). Every HTML entry point should follow the same boot pattern:

```html
<script src="app/theme-init.js"></script>
<link rel="stylesheet" href="app/styles.css" />
<!-- …your content… -->
<script type="module" src="app/main.js"></script>
```

```javascript
import { initShell } from "./shell/shell.js";

initShell(); // footer, theme toggle, page nav, tooltips, icons, links
// …your app-specific inits…
```

Optional shell overrides (repo link, brand URL, page nav scan):

```javascript
initShell({
  repoUrl: "https://github.com/you/your-app",
  brandUrl: "https://yoursite.example",
  brandName: "Your name",
  pageNav: { headingSelector: "main h2[id]" },
});
```

### App and template versions

Versions use [Semantic Versioning 2.0.0](https://semver.org/) and live in [`app/version.js`](app/version.js):

```javascript
export const TEMPLATE_VERSION = "0.6.0"; // microapp-template release — sync with app/version.js
export const APP_VERSION = "0.0.0";      // your app — bump when you ship
```

| Constant | Who sets it | Shown in UI |
| -------- | ----------- | ----------- |
| `APP_VERSION` | You, on your fork | Footer label (`v0.0.0`) |
| `TEMPLATE_VERSION` | Template maintainers | Footer tooltip on hover/focus (`Template v0.6.0`) |

After forking, set `APP_VERSION` to your app’s release (e.g. `1.0.0`). Bump it when you publish a new version of **your** app. When you pull updates from the upstream template, the maintainer may have raised `TEMPLATE_VERSION` — hover the footer version to see which template release you are on.

Optional runtime override (rare):

```javascript
initShell({ appVersion: "1.2.3", templateVersion: "0.6.0" });
```

### Configuration

Fork-sensitive defaults live in [`app/config.js`](app/config.js):

```javascript
export const APP_CONFIG = {
  repoUrl: "https://github.com/you/your-app",
  brandUrl: "https://yoursite.example",
  brandName: "Your name",
  themeStorageKey: "microapp-theme",
  themeChangeEvent: "microapp-theme-change",
};
```

| Field | Used by |
| ----- | ------- |
| `repoUrl`, `brandUrl`, `brandName` | Footer links and brand tooltip via `renderPageShell()` |
| `themeStorageKey` | `theme.js` and blocking `theme-init.js` |
| `themeChangeEvent` | Theme changes; rich text editor syncs to dark mode |

If you rename `themeStorageKey`, update the inline bridge in every HTML entry point **before** `theme-init.js`:

```html
<script>window.__MICROAPP__={themeStorageKey:"your-app-theme"};</script>
<script src="app/theme-init.js"></script>
```

Also set `APP_VERSION` in [`app/version.js`](app/version.js) when you ship your app.

### 3. Remove or keep the demo

The demo is for exploring components — not required for your app.

| Keep as reference | Remove when shipping |
| ----------------- | -------------------- |
| [`demo.html`](demo.html) | Delete `demo.html` |
| [`app/demo.js`](app/demo.js) | Delete `app/demo.js` |
| Prism vendor + `app/prism.css` (only if you do not use code blocks) | `app/vendor/prism/`, `app/prism.css` |
| Toast UI vendor + `app/toastui-editor.css` (only if you do not use the rich text editor) | `app/rich-text-editor.js`, `app/toastui-editor.js`, `app/toastui-editor.css`, `app/css/rich-text-editor.css`, `app/vendor/toastui-editor/`, `app/vendor/toastui-editor-plugin-table-merged-cell/` |

If you **remove** `demo.html`, update [`.github/workflows/pages.yml`](.github/workflows/pages.yml) — drop `demo.html` from the `cp` line:

```yaml
cp index.html _site/
```

If you **keep** the demo, leave the workflow as-is and optionally link to it from `index.html` while developing.

### 4. Trim unused modules (optional)

All modules under `app/` are small and tree-shaken by the browser (only imported files load). You can delete files you will never use, for example:

- `app/code-block.js`, `app/expandable-surface.js`, `app/vendor/prism/` — no syntax-highlighted code
- `app/rich-text-editor.js`, `app/toastui-editor.js`, `app/toastui-editor.css`, `app/vendor/toastui-editor/`, `app/vendor/toastui-editor-plugin-table-merged-cell/` — no rich text editor
- `app/combo.js`, `app/dropdown.js`, `app/dropdown-toggle.js` — no menus
- `app/dialog.js` — no modals

Do **not** delete shared infrastructure you still need: `shell.js`, `render-shell.js`, `theme-init.js`, `theme.js`, `icons.js`, `dom.js`, `document-listeners.js`, `menu.js` (if any popup menu remains).

### 5. Branding

| Asset | Purpose |
| ----- | ------- |
| `app/res/app-light.svg` / `app-dark.svg` | Header logo, favicon |
| `app/res/sig-light.svg` / `sig-dark.svg` | Footer signature icon |

Theme-aware swapping is handled in CSS and [`app/utils/brand-icon.js`](app/utils/brand-icon.js). Replace the SVG files or edit [`app/config.js`](app/config.js) and [`app/shell/render-shell.js`](app/shell/render-shell.js).

For header logos, set a meaningful `alt` on the visible theme variant and `aria-hidden="true"` on the duplicate variant so screen readers are not announced twice.

### 6. Checklist before first deploy

- [ ] `index.html` title, heading, and content updated
- [ ] `APP_VERSION` set in `app/version.js` for your app
- [ ] `app/main.js` implements your app (not just `initShell()`)
- [ ] Demo removed or intentionally kept
- [ ] `pages.yml` matches published HTML files
- [ ] GitHub **Settings → Pages → Source** set to **GitHub Actions**

---

## Local preview

ES modules require a local server (opening `index.html` directly may block imports):

```bash
npx serve .
```

Optional quality checks (requires `npm ci` once):

```bash
npm run lint
npm test
```

Then open `http://localhost:3000` and, if kept, `http://localhost:3000/demo.html`.

---

## GitHub Pages deployment

1. Push to `main` (includes [`.github/workflows/pages.yml`](.github/workflows/pages.yml)).
2. In the repo **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. After the workflow runs, the site is at `https://<username>.github.io/<repo>/`.

The workflow copies only publishable files into `_site/` (`index.html`, optional `demo.html`, `.nojekyll`, `app/`). `README.md`, `USAGE.md`, and other repo files are not published.

---

## Project structure

```
index.html          # Your app homepage
demo.html           # Component showcase (optional)
.nojekyll           # Skip Jekyll on GitHub Pages
app/
  styles.css            # Imports tokens.css + app/css/*.css partials
  tokens.css            # Design tokens, base typography, reduced motion
  css/
    layout.css          # Page shell, sections, page nav, footer, theme toggle
    code-block.css      # Code blocks and expandable surfaces
    controls-buttons.css  # Toolbar, buttons
    controls-fields.css   # Fields, combobox, date/time, color picker
    controls-widgets.css  # Toggle, segmented control, pagination, progress bar, spinner, slider, stepper
    controls-section-panel.css # Section panel grid
    controls-menus.css    # Combo, dropdown
    controls-disclosure.css # Expand, accordion, tabs, progress indicator
    controls-file.css     # File dropzone, file download
    overlays.css        # Banners, tooltips, modals
    rich-text-editor.css # Rich text editor layout + Toast UI token overrides
    table.css            # Data tables
  config.js             # Fork defaults (repo URL, brand, theme key)
  version.js            # APP_VERSION + TEMPLATE_VERSION (SemVer 2.0.0)
  main.js               # index.html entry
  demo.js               # demo.html entry (optional)
  shell/
    shell.js            # initShell() — shared page boot
    render-shell.js     # Footer, page nav, skip link
    theme.js            # Theme preference module
    page-nav.js         # In-page heading nav + jump up/down
    external-link.js    # Arrow icon on outgoing links
    heading-link.js     # Copy section link on heading hover
  utils/
    dom.js              # setHidden(), parseBooleanAttr(), focus helpers
    document-listeners.js
    menu.js             # Shared popup menu logic
    icons.js            # Inline SVG icon registry
    brand-icon.js       # Theme-aware logo paths
  components/
    dialog.js, combo.js, dropdown.js, tabs.js, …
    date-picker/        # parse.js, calendar.js, index.js
  prism.css             # Prism token colours (optional)
  toastui-editor.css    # Vendored Toast UI base CSS (optional)
  vendor/               # Prism, Toast UI (optional)
  res/                  # App logo and signature SVGs
```

### Module layers (JavaScript)

JS modules live under `app/shell/`, `app/utils/`, and `app/components/` — the browser only loads files you `import`. When forking, use this map:

| Layer | Path | When you need it |
| ----- | ---- | ---------------- |
| **Entry** | `main.js`, `demo.js`, `theme-init.js`, `config.js`, `version.js` | Always — wired from HTML |
| **Shell** | `app/shell/` | Always — call `initShell()` from `app/shell/shell.js` |
| **Infrastructure** | `app/utils/` | Keep if any popup menu, icons, or shared helpers remain |
| **Components** | `app/components/` | Import and init only the features your page uses; delete unused files |

Component CSS lives under `app/css/` (imported via `styles.css`). Match a component to its partial: form controls in `controls-fields.css`, menus in `controls-menus.css`, modals in `overlays.css`, and so on.

---

## Available features and components

| Feature | Description |
| -------- | ----------- |
| **Design tokens** | CSS custom properties in [`app/tokens.css`](app/tokens.css) for background, surface, section panels, `--control-height` (single-line controls), text, borders, accent, banners, and code blocks. Light and dark values via `[data-theme="dark"]`. Component styles in [`app/css/`](app/css/) partials (imported by [`app/styles.css`](app/styles.css)). |
| **Theme toggle** | Footer control (injected by `initShell()`): light, dark, or system (`auto`). Stored in `localStorage` under `microapp-theme`. `app/theme-init.js` runs in `<head>` to avoid flash of wrong theme. |
| **Layout shell** | Semantic `header` / `main` / `footer` (footer rendered by JS), max-width 1200px, flex column page. App version in footer; template version on hover. |
| **Buttons** | `.btn` (default), `.btn-primary`, `.btn-icon`, `.btn-toggle` (`aria-pressed` — accent border when on), `.btn-link`, disabled state. |
| **Inputs** | `.field` / `.field-label` with `.input`, `.textarea`, `.checkbox`, `.radio`, `.toggle`, `.segmented-control`, `.progress-bar`, `.spinner`, `.date-picker`, `.slider`, `.stepper`, `.color-picker`, and `.combobox`. |
| **File dropzone** | `.file-dropzone` drag-and-drop / browse picker with file list and remove buttons. [`app/file-dropzone.js`](app/file-dropzone.js). |
| **File download** | `.file-download` file list rows (like dropzone items) with on-demand download. [`app/file-download.js`](app/file-download.js). |
| **Section panel** | `.section-panel` three-column grid rows, divider, submit row with expiring banner. See [`demo.html`](demo.html). |
| **Combo button** | Split `.combo-btn` with main action + chevron menu; behaviour from [`app/combo.js`](app/combo.js). |
| **Combobox** | Text input with filterable suggestion list. [`app/combobox.js`](app/combobox.js). |
| **Slider** | Range control with editable value field; integer, decimal, percentage; optional disabled. [`app/slider.js`](app/slider.js). |
| **Progress bar** | Horizontal fill for a value between min and max; optional % or x/y label. [`app/progress-bar.js`](app/progress-bar.js). |
| **Spinner** | Loading indicator; optional blocking overlay on a host region. [`app/spinner.js`](app/spinner.js). |
| **Stepper** | Numeric nudger with − / + buttons and editable value; integer or decimal. [`app/stepper.js`](app/stepper.js). |
| **Colour picker** | Hex text input with inline swatch preview. [`app/color-picker.js`](app/color-picker.js). |
| **Toggle** | On/off switch with track and thumb; `role="switch"`. [`app/toggle.js`](app/toggle.js). |
| **Segmented control** | Toggle button group for single selection; optional linked panels. [`app/segmented-control.js`](app/segmented-control.js). |
| **Progress indicator** | Linear multi-step wizard; horizontal (default) or vertical step list. [`app/progress-indicator.js`](app/progress-indicator.js). |
| **Dropdown** | `.dropdown` with `.dropdown-trigger` and `.dropdown-menu`; behaviour from [`app/dropdown.js`](app/dropdown.js). |
| **Toggle dropdown** | Multi-select dropdown; items toggle with `aria-checked`, menu stays open. [`app/dropdown-toggle.js`](app/dropdown-toggle.js). |
| **Expand** | `.expand` disclosure with notch + label trigger and collapsible `.expand-panel`; behaviour from [`app/expand.js`](app/expand.js). |
| **Accordion** | `.accordion` vertical stack of collapsible sections; one open at a time by default. [`app/accordion.js`](app/accordion.js). |
| **Tabs** | `.tabs` block with `.tabs-list` / `.tabs-tab` and `.tabs-panel` content; behaviour from [`app/tabs.js`](app/tabs.js). |
| **Pagination** | In-page page navigation with prev/next and numbered pages; no URL change. [`app/pagination.js`](app/pagination.js). |
| **Table** | Data table with striped layout, sortable columns, and optional row selection. [`app/table.js`](app/table.js). |
| **Page navigation** | Fixed `#page-nav`: always-visible jump up/down (shared progress ring), section links on hover. Group nested headings under `data-page-nav-tier` parents. [`app/page-nav.js`](app/page-nav.js). |
| **Dialogs** | Accessible modal: backdrop, focus trap, Escape, focus restore. Markup uses `.modal` / `.modal-panel`; behaviour from [`app/dialog.js`](app/dialog.js). |
| **Heading links** | Hover a `main h2[id]` heading to reveal a link icon; tooltip says “Get link”, then “Copied!” on success. [`app/heading-link.js`](app/heading-link.js). |
| **External links** | Outgoing `http(s)` links get an arrow-outward icon via `initShell()` / [`app/external-link.js`](app/external-link.js). Opt out with `data-no-external-icon`. |
| **Tooltips** | Instant custom tooltips — no native `title` delay. Add `data-tooltip="…"` and optional `data-tooltip-position="top\|bottom\|left\|right"`. See [`app/tooltip.js`](app/tooltip.js). |
| **Banners** | `.banner.banner-*` variants with `data-icon`. Optional auto-hide via `data-banner-expire` (ms) and [`app/banner.js`](app/banner.js) (`showBanner` / `hideBanner`). Expire overlay + fade-out. |
| **Code blocks** | `.code-block` with Prism highlighting, line numbers, copy, view/select/edit modes. [`app/code-block.js`](app/code-block.js). |
| **Expandable surface** | Maximize code blocks or textareas to page width. [`app/expandable-surface.js`](app/expandable-surface.js). |
| **Icons** | Inline SVGs in [`app/icons.js`](app/icons.js); use `data-icon` in HTML or `createIcon()` in JS. Source from [Icônes — Material Icons (Round)](https://icones.js.org/collection/ic?s=info&variant=Round). Logo files stay in `app/res/`. |
| **Toolbar helper** | `.toolbar` flex row for button groups. See [`demo.html`](demo.html). |
| **Code highlighting** | Optional [Prism.js](https://prismjs.com/) via [`app/code-block.js`](app/code-block.js) and [`app/vendor/prism/`](app/vendor/prism/). Load vendor scripts on the page (see Code blocks in **Using components**). |
| **Rich text editor** | Markdown + WYSIWYG via [Toast UI Editor](https://github.com/nhn/tui.editor); table merged-cell plugin; base64 image paste. [`app/rich-text-editor.js`](app/rich-text-editor.js). Large vendor bundle (~500KB+). |

For live examples of each component, open [`demo.html`](demo.html) on a local server or your deployed site.

---

## Using components

### Theme

```html
<script src="app/theme-init.js"></script>
<link rel="stylesheet" href="app/styles.css" />
<script type="module" src="app/main.js"></script>
```

```javascript
import { initShell } from "./shell/shell.js";

initShell(); // footer + page nav + icons + theme in one call
```

Or wire individually:

```javascript
import { initTheme, initThemeToggle } from "./shell/theme.js";
initTheme();
initThemeToggle(document.getElementById("theme-toggle"));
```

### Dialog

```javascript
import { initDialog } from "./components/dialog.js";

const dialog = initDialog({
  dialogEl: document.getElementById("my-dialog"),
  openTriggers: "#open-my-dialog",
});
// dialog.openDialog(), dialog.closeDialog(), dialog.isDialogOpen()
```

Close controls use `data-dialog-close` on backdrop, × button, or footer buttons.

### Tooltip

```html
<button type="button" data-tooltip="Help text" data-tooltip-position="top">?</button>
```

```javascript
import { initTooltips } from "./components/tooltip.js";
initTooltips(document);
```

`initShell()` already calls `initTooltips(document)`.

### Banners

Markup uses `.banner` plus a variant (`banner-success`, `banner-error`, …) and a `data-icon` for the left icon.

Auto-hide after a delay — set `data-banner-expire` (milliseconds) and call `showBanner()`. A light overlay drains across the banner for the duration of the timeout, then the banner fades out quickly.

```html
<div id="saved-banner" class="banner banner-success hidden" role="status" hidden
  data-banner-expire="1500">
  <span class="banner-icon" data-icon="success" data-icon-class="banner-icon-svg"></span>
  <span class="banner-body">Saved</span>
</div>
```

```javascript
import { showBanner, hideBanner } from "./components/banner.js";

showBanner(document.getElementById("saved-banner"));
// or override: showBanner(el, { expire: 3000 });
hideBanner(el);
```

Always use `hideBanner()` / `showBanner()` for banners with expiry — do not toggle `.hidden` directly, or timers may keep running.

### External links

Enabled by `initShell()`. Any `http(s)` link to another origin gets an arrow-outward icon appended automatically. Opt out on a specific link:

```html
<a href="https://example.com" data-no-external-icon>Stay plain</a>
```

### Heading links

Enabled by `initShell()`. Section headings (`main h2[id]`) show a link icon on hover with a “Get link” tooltip; click copies the full section URL and the tooltip switches to “Copied!”.

```javascript
import { initHeadingLinks } from "./shell/heading-link.js";

initHeadingLinks(document, { selector: "main h3[id]" });
```

### Toolbar

Flex row for grouping related buttons. Wraps on narrow viewports.

```html
<div class="toolbar" role="toolbar" aria-label="Document actions">
  <button type="button" class="btn">Undo</button>
  <button type="button" class="btn">Redo</button>
  <button type="button" class="btn btn-primary">Save</button>
  <button type="button" class="btn btn-icon" aria-label="More options" data-icon="lines"
    data-icon-class="btn-icon-svg"></button>
</div>
```

### Inputs

```html
<label class="field" for="name">
  <span class="field-label">Name</span>
  <input type="text" id="name" class="input" placeholder="Enter text…" />
</label>

<label class="field" for="notes">
  <span class="field-label">Notes</span>
  <textarea id="notes" class="textarea" rows="4"></textarea>
</label>

<label class="checkbox" for="agree">
  <input type="checkbox" class="checkbox-input" id="agree" />
  <span>I agree</span>
</label>

<div class="field">
  <span class="field-label" id="size-label">Size</span>
  <div class="radio-group" role="radiogroup" aria-labelledby="size-label">
    <label class="radio" for="size-small">
      <input type="radio" class="radio-input" name="size" id="size-small" value="small" />
      <span>Small</span>
    </label>
    <label class="radio" for="size-large">
      <input type="radio" class="radio-input" name="size" id="size-large" value="large" />
      <span>Large</span>
    </label>
  </div>
</div>
```

#### Date picker

Calendar popup via [`app/components/date-picker/index.js`](app/components/date-picker/index.js). Add `data-date-picker-time` for an optional time field on the same row as the date control.

```html
<div class="date-picker" id="my-date-picker" data-date-picker-time>
  <label class="field-label" for="my-date-picker-input">Appointment</label>
  <div class="date-picker-row">
    <div class="date-picker-control">
      <input type="hidden" class="date-picker-value" />
      <input type="text" id="my-date-picker-input" class="input date-picker-input"
        placeholder="Jun 20, 2026" autocomplete="off" />
      <button type="button" class="date-picker-trigger" aria-label="Open calendar"
        data-icon="calendar" data-icon-class="date-picker-icon" aria-expanded="false"></button>
    </div>
    <input type="time" class="input date-picker-time hidden" hidden />
    <div class="date-picker-popup hidden" role="dialog" aria-modal="true" aria-label="Choose date" hidden>
      <div class="date-picker-header">
        <button type="button" class="date-picker-nav btn btn-link" data-date-picker-prev aria-label="Previous month">‹</button>
        <div class="date-picker-caption" aria-live="polite"></div>
        <button type="button" class="date-picker-nav btn btn-link" data-date-picker-next aria-label="Next month">›</button>
      </div>
      <div class="date-picker-weekdays" aria-hidden="true">
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>
      <div class="date-picker-grid" role="grid"></div>
      <div class="date-picker-actions">
        <button type="button" class="btn date-picker-quick-btn" data-date-picker-today>Today</button>
        <button type="button" class="btn date-picker-quick-btn" data-date-picker-now hidden>Now</button>
      </div>
    </div>
  </div>
</div>
```

```javascript
import { initDatePicker, initDatePickers } from "./components/date-picker/index.js";

const picker = initDatePicker(document.getElementById("my-date-picker"), {
  onChange: ({ isoDate, time, display }) => console.log(isoDate, time, display),
});

picker?.setValue({ isoDate: "2026-06-20", time: "14:30" });
picker?.getValue();

initDatePickers(document);
```

`data-date-min` and `data-date-max` accept ISO dates (`YYYY-MM-DD`). The hidden `.date-picker-value` field stores the selected date for forms.

Click the **month** or **year** in the popup header to open quick-pick grids. Choosing a year returns to the month grid; choosing a month returns to days. Prev/next arrows change month, year, or 12-year window depending on the current view. Escape steps back through views before closing.

The date field accepts typed or pasted values (for example `2026-06-20` or `Jun 20, 2026`). Values are validated on blur or Enter; invalid input reverts to the last valid date. Arrow Down opens the calendar while the field is focused.

The calendar grid starts weeks on Monday. Weekday labels in markup are optional — `initDatePicker()` fills `.date-picker-weekdays` when missing or out of date.

The day view includes quick actions below the calendar: **Today** (date-only pickers) or **Today** and **Now** when `data-date-picker-time` is set. Today selects the current date and sets time to `00:00`; Now selects the current date and time.

### File dropzone

Drag-and-drop or click-to-browse file picker. Selected files appear in a list with remove buttons.

```html
<div class="file-dropzone" id="my-dropzone" data-file-accept="image/*" data-file-multiple data-file-max="5">
  <input type="file" class="file-dropzone-input" hidden />
  <button type="button" class="file-dropzone-prompt">
    <span data-icon="upload" data-icon-class="file-dropzone-icon"></span>
    <span class="file-dropzone-text">
      <span class="file-dropzone-primary">Drop files here</span>
      <span class="file-dropzone-secondary">or browse</span>
    </span>
  </button>
  <ul class="file-dropzone-list hidden" hidden></ul>
</div>
```

```javascript
import { initFileDropzone, initFileDropzones } from "./components/file-dropzone.js";

const dropzone = initFileDropzone(document.getElementById("my-dropzone"), {
  onFiles: ({ files }) => console.log(files),
  onError: ({ message }) => console.warn(message),
  onClear: () => console.log("cleared"),
});

dropzone?.openPicker();
dropzone?.getFiles();
dropzone?.clear();

initFileDropzones(document); // wire every `.file-dropzone`
```

`data-file-accept` maps to the hidden input's `accept`. `data-file-multiple` enables multi-select. `data-file-max` caps how many files can be added (extra files are trimmed; `onError` is called).

### File download

File rows styled like `.file-dropzone-item`. Content is generated on demand when the user clicks download.

```html
<div class="file-download" id="my-download">
  <ul class="file-download-list">
    <li class="file-download-item" data-file-download-name="export.txt">
      <span class="file-download-item-name">export.txt</span>
      <span class="file-download-item-meta">Plain text</span>
      <button type="button" class="file-download-action btn btn-icon" aria-label="Download export.txt"
        data-icon="upload" data-icon-class="file-download-action-icon"></button>
    </li>
  </ul>
</div>
```

```javascript
import { downloadFile, initFileDownload, initFileDownloads } from "./components/file-download.js";

initFileDownload(document.getElementById("my-download"), {
  files: [
    {
      filename: "export.txt",
      getContent: () => `Generated at ${new Date().toISOString()}\n`,
    },
  ],
  onDownload: ({ filename, size }) => console.log(filename, size),
});

// Or trigger directly:
await downloadFile({
  filename: "notes.txt",
  content: "Plain text body",
});

initFileDownloads(document); // wire every `.file-download`
```

Pass a `files` array with per-file `getContent` callbacks. File size is shown in `.file-download-item-meta` when content can be resolved at init time.

### Section panel

Three-column grid rows for compact forms. Stack fields across rows; use `.section-panel__divider` before actions.

```html
<div class="section-panel">
  <div class="section-panel__grid">
    <label class="field section-panel__field" for="name">
      <span class="field-label">Label</span>
      <input type="text" id="name" class="input" />
    </label>
  </div>
  <div class="section-panel__grid">
    <button type="button" class="btn btn-toggle section-panel__toggle" aria-pressed="false">Toggle</button>
  </div>
  <div class="section-panel__grid">
    <label class="checkbox section-panel__checkbox" for="remember">
      <input type="checkbox" class="checkbox-input" id="remember" />
      <span>Remember settings</span>
    </label>
  </div>
  <hr class="section-panel__divider" />
  <div class="section-panel__row">
    <div class="section-panel__feedback">
      <div id="section-success" class="banner banner-success hidden" role="status" hidden
        data-banner-expire="1500">
        <span class="banner-icon" data-icon="success" data-icon-class="banner-icon-svg"></span>
        <span class="banner-body">Submitted</span>
      </div>
    </div>
    <button type="button" class="btn btn-primary section-panel__submit">Submit</button>
  </div>
</div>
```

```javascript
import { showBanner, hideBanner } from "./components/banner.js";

submitBtn.addEventListener("click", () => {
  hideBanner(successBanner);
  hideBanner(errorBanner);
  showBanner(hasText ? successBanner : errorBanner);
});
```

See the interactive example on [`demo.html`](demo.html).

### Combo button

```javascript
import { initCombo } from "./components/combo.js";

initCombo(document.getElementById("my-combo"), {
  onMainClick: () => { /* primary action */ },
  onSelect: ({ value, label }) => { /* menu item chosen */ },
});
```

Markup: `.combo-btn` > `.combo-btn-main` + `.combo-btn-toggle` + `ul.combo-menu` with `.combo-menu-item` buttons.

### Combobox

Text field with a filterable suggestion list. Options can live in markup or be supplied in JS. By default the value must match a list item; set `allowCustom: true` or `data-combobox-allow-custom` to accept free text.

```html
<div class="combobox" id="my-combobox">
  <label class="field-label" for="my-combobox-input">City</label>
  <div class="combobox-control">
    <input type="text" id="my-combobox-input" class="input combobox-input" role="combobox"
      aria-expanded="false" aria-autocomplete="list" aria-controls="my-combobox-list" autocomplete="off"
      placeholder="Search…" />
    <ul id="my-combobox-list" class="combobox-list hidden" role="listbox" hidden>
      <li role="presentation">
        <button type="button" class="combobox-option" role="option" data-value="nyc">New York</button>
      </li>
    </ul>
  </div>
</div>
```

```javascript
import { initCombobox, initComboboxes } from "./components/combobox.js";

const combobox = initCombobox(document.getElementById("my-combobox"), {
  onSelect: ({ value, label }) => { /* item chosen from list */ },
  onChange: ({ value, label, input }) => { /* value committed or cleared */ },
  onInput: ({ query, matches }) => { /* filter text changed */ },
  // options: [{ value: "nyc", label: "New York" }, …],  // replace markup list
  // filter: (query, option) => option.label.startsWith(query),
  // allowCustom: true,
  // defaultValue: "nyc",
});

combobox?.getValue();
combobox?.setValue("nyc");
combobox?.setOptions([{ value: "nyc", label: "New York" }]);

initComboboxes(document); // all `.combobox` blocks
```

Keyboard: ArrowDown / ArrowUp navigate suggestions, Enter selects, Escape closes and restores the last committed value.

See the interactive example on [`demo.html`](demo.html).

### Slider

Range input with a compact value field beside the track. Drag the thumb or type a value directly; typed values are clamped to min/max and snapped to `step` on blur or Enter. Escape restores the last committed value while editing.

Formats: `integer` (default), `decimal`, or `percentage` (shows a `%` suffix; values are still stored as plain numbers, e.g. `75` for 75%).

```html
<div class="slider" id="my-slider" data-slider-min="0" data-slider-max="100"
  data-slider-default="50" data-slider-format="percentage">
  <label class="field-label" for="my-slider-range">Opacity</label>
  <div class="slider-row">
    <input type="range" id="my-slider-range" class="slider-range" />
    <div class="slider-input-wrap">
      <input type="text" class="input slider-input" inputmode="decimal" aria-label="Value" />
      <span class="slider-suffix hidden" aria-hidden="true">%</span>
    </div>
    <input type="hidden" class="slider-value" name="opacity" />
  </div>
</div>
```

```javascript
import { initSlider, initSliders } from "./components/slider.js";

const slider = initSlider(document.getElementById("my-slider"), {
  min: 0,
  max: 100,
  step: 1,
  defaultValue: 50,
  format: "percentage", // "integer" | "decimal" | "percentage"
  disabled: false,
  onChange: ({ value, display, source }) => console.log(value, display, source),
  onInput: ({ value }) => { /* live while dragging or typing */ },
});

slider?.getValue();
slider?.setValue(25);
slider?.setDisabled(true);
slider?.isDisabled();
slider?.commitInput(); // commit typed text without blur

initSliders(document); // all `.slider` blocks
```

`data-slider-min`, `data-slider-max`, `data-slider-step`, `data-slider-default`, `data-slider-format`, and `data-slider-disabled` mirror the JS options. The hidden `.slider-value` field stores the numeric value for forms.

### Progress bar

Horizontal fill for a value between min and max. Omit `.progress-bar-label` for a bar only; add it with `data-progress-bar-label="percent"` or `"fraction"` to show `75%` or `7/12` beside the track.

```html
<div class="progress-bar" id="my-progress-bar" data-progress-bar-value="65" data-progress-bar-max="100"
  data-progress-bar-label="percent">
  <label class="field-label" id="my-progress-bar-label">Upload progress</label>
  <div class="progress-bar-row">
    <div class="progress-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"
      aria-valuenow="65" aria-labelledby="my-progress-bar-label">
      <span class="progress-bar-fill"></span>
    </div>
    <span class="progress-bar-label" aria-hidden="true">65%</span>
  </div>
  <input type="hidden" class="progress-bar-value" name="upload-progress" value="65" />
</div>
```

Fraction label (`7/12`) — set `data-progress-bar-label="fraction"` and match `data-progress-bar-max` to the denominator:

```html
<div class="progress-bar" data-progress-bar-value="7" data-progress-bar-max="12" data-progress-bar-label="fraction">
  <!-- same .progress-bar-row structure -->
</div>
```

```javascript
import { initProgressBar, initProgressBars } from "./components/progress-bar.js";

const progressBar = initProgressBar(document.getElementById("my-progress-bar"), {
  value: 65,
  min: 0,
  max: 100,
  labelFormat: "percent", // "percent" | "fraction"
  indeterminate: false,
  onChange: ({ value, percent, source }) => console.log(value, percent, source),
});

progressBar?.getValue();
progressBar?.setValue(80);
progressBar?.getPercent();
progressBar?.setIndeterminate(true);

initProgressBars(document); // all `.progress-bar` blocks
```

`data-progress-bar-value`, `data-progress-bar-min`, `data-progress-bar-max`, `data-progress-bar-label`, and `data-progress-bar-indeterminate` mirror the JS options. The track uses `role="progressbar"` with `aria-valuenow` / `aria-valuetext` for screen readers.

### Spinner

Loading indicator while a process runs in the background. Use inline for compact status, or wrap a region in `.spinner-host` with a `.spinner-overlay` to block interaction until ready. Sizes: default, `.spinner--sm`, `.spinner--lg`.

```html
<div class="spinner" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
  <span class="spinner-indicator" aria-hidden="true"></span>
  <span class="spinner-label">Loading data…</span>
</div>
```

Blocking overlay:

```html
<div class="spinner-host" id="my-panel">
  <p>Panel content…</p>
  <button type="button" class="btn">Edit</button>
  <div class="spinner-overlay hidden" hidden>
    <div class="spinner" role="status" aria-live="polite" aria-busy="true" aria-label="Loading data">
      <span class="spinner-indicator" aria-hidden="true"></span>
      <span class="spinner-label">Loading data…</span>
    </div>
  </div>
</div>
```

```javascript
import { initSpinner, initSpinners } from "./components/spinner.js";

const spinner = initSpinner(document.getElementById("my-spinner"), {
  visible: false,
  label: "Fetching results…",
  onChange: ({ visible, label, source }) => console.log(visible, source),
});

spinner?.show();
spinner?.hide();
spinner?.toggle();
spinner?.isVisible();
spinner?.setLabel("Saving…");

const panelSpinner = initSpinner(document.getElementById("my-panel"));
panelSpinner?.show();
// …await work…
panelSpinner?.hide();

initSpinners(document); // `.spinner-host` blocks and `[data-spinner-visible]` spinners
```

`data-spinner-visible` and `data-spinner-label` mirror the JS options. Pass a `.spinner` for inline use or a `.spinner-host` for overlay mode. While visible, the host gets `aria-busy="true"` and `pointer-events: none` on its content.

### Stepper

Numeric quantity control with decrement (−) and increment (+) buttons flanking a compact value field. Type a value directly or use Arrow Up / Down while focused. Values are clamped to min/max and snapped to `step` on blur or Enter.

```html
<div class="stepper" id="my-stepper" data-stepper-min="0" data-stepper-max="10" data-stepper-default="1">
  <label class="field-label" for="my-stepper-input">Quantity</label>
  <div class="stepper-control">
    <button type="button" class="btn btn-icon stepper-decrement" data-stepper-decrement
      aria-label="Decrease">−</button>
    <input type="text" id="my-stepper-input" class="input stepper-input" inputmode="numeric"
      aria-label="Quantity" />
    <button type="button" class="btn btn-icon stepper-increment" data-stepper-increment
      aria-label="Increase">+</button>
    <input type="hidden" class="stepper-value" name="quantity" />
  </div>
</div>
```

```javascript
import { initStepper, initSteppers } from "./components/stepper.js";

const stepper = initStepper(document.getElementById("my-stepper"), {
  min: 0,
  max: 10,
  step: 1,
  defaultValue: 1,
  format: "integer", // "integer" | "decimal"
  disabled: false,
  onChange: ({ value, display, source }) => console.log(value, source),
  onInput: ({ value }) => { /* live while typing */ },
});

stepper?.getValue();
stepper?.setValue(5);
stepper?.increment();
stepper?.decrement();
stepper?.setDisabled(true);
stepper?.commitInput();

initSteppers(document); // all `.stepper` blocks
```

`data-stepper-min`, `data-stepper-max`, `data-stepper-step`, `data-stepper-default`, `data-stepper-format`, and `data-stepper-disabled` mirror the JS options. Decrement and increment buttons disable at the min and max bounds.

### Colour picker

Hex colour field with a swatch inside the input on the left. Accepts `#RGB` or `#RRGGBB` (with or without `#` while typing). Values normalise to uppercase `#RRGGBB` on commit. The swatch shows a checkerboard when empty or while the typed value is incomplete.

```html
<div class="color-picker" id="my-color-picker" data-color-picker-default="#0969da">
  <label class="field-label" for="my-color-input">Colour</label>
  <div class="color-picker-control">
    <input type="text" id="my-color-input" class="input color-picker-input"
      placeholder="#0969DA" autocomplete="off" spellcheck="false" aria-label="Hex colour" />
    <span class="color-picker-swatch" aria-hidden="true"></span>
    <input type="hidden" class="color-picker-value" name="colour" />
  </div>
</div>
```

```javascript
import { initColorPicker, initColorPickers } from "./components/color-picker.js";

const colorPicker = initColorPicker(document.getElementById("my-color-picker"), {
  defaultValue: "#0969da",
  disabled: false,
  onChange: ({ value, display, source }) => console.log(value, source),
  onInput: ({ value, display }) => { /* live while typing */ },
});

colorPicker?.getValue(); // "#0969DA" or null
colorPicker?.setValue("#ff5500");
colorPicker?.setValue(""); // clear
colorPicker?.commitInput();
colorPicker?.setDisabled(true);

initColorPickers(document); // all `.color-picker` blocks
```

`data-color-picker-default` and `data-color-picker-disabled` mirror the JS options. `parseHexColor()` is exported for reuse.

### Toggle

On/off switch for boolean settings. Uses `role="switch"` and `aria-checked` on the button; a hidden `.toggle-value` field stores `"true"` or `"false"` for forms.

```html
<div class="toggle" id="my-toggle" data-toggle-default="false">
  <button type="button" class="toggle-btn" role="switch" aria-checked="false">
    <span class="toggle-track" aria-hidden="true">
      <span class="toggle-thumb">
        <span data-icon="check" data-icon-class="toggle-thumb-icon" aria-hidden="true"></span>
      </span>
    </span>
    <span class="toggle-label">Enable notifications</span>
  </button>
  <input type="hidden" class="toggle-value" name="notifications" value="false" />
</div>
```

```javascript
import { initToggle, initToggles } from "./components/toggle.js";

const toggle = initToggle(document.getElementById("my-toggle"), {
  defaultChecked: false,
  disabled: false,
  onChange: ({ checked, source }) => console.log(checked, source),
});

toggle?.getChecked();
toggle?.setChecked(true);
toggle?.toggle();
toggle?.setDisabled(true);

initToggles(document); // all `.toggle` blocks
```

`data-toggle-default` and `data-toggle-disabled` mirror the JS options. For a group of switches, wrap items in `.toggle-group`.

### Segmented control

Toggle button group for switching between a small set of options or views — like radio buttons in a joined control. Items use `role="radio"` and `aria-checked`; a hidden `.segmented-control-value` stores the selected value for forms.

Add `.segmented-control--full` on the root to stretch the track to the field width. Optionally pair items with panels via `aria-controls` (same pattern as tabs).

```html
<div class="segmented-control segmented-control--full" id="my-segmented" data-segmented-control-default="list">
  <div class="segmented-control-list" role="radiogroup" aria-label="View mode">
    <button type="button" class="segmented-control-item" role="radio" aria-checked="true"
      data-segmented-control-value="list">List</button>
    <button type="button" class="segmented-control-item" role="radio" aria-checked="false"
      data-segmented-control-value="grid">Grid</button>
    <button type="button" class="segmented-control-item" role="radio" aria-checked="false"
      data-segmented-control-value="map">Map</button>
  </div>
  <input type="hidden" class="segmented-control-value" name="view" value="list" />
</div>
```

With panels:

```html
<div class="segmented-control" id="my-segmented-panels" data-segmented-control-default="week">
  <div class="segmented-control-list" role="radiogroup" aria-label="Time range">
    <button type="button" class="segmented-control-item" role="radio" id="seg-day" aria-checked="false"
      aria-controls="seg-panel-day" data-segmented-control-value="day">Day</button>
    <button type="button" class="segmented-control-item" role="radio" id="seg-week" aria-checked="true"
      aria-controls="seg-panel-week" data-segmented-control-value="week">Week</button>
  </div>
  <input type="hidden" class="segmented-control-value" value="week" />
  <div class="segmented-control-panels">
    <div class="segmented-control-panel hidden" id="seg-panel-day" role="region" aria-labelledby="seg-day" hidden>
      Day view.
    </div>
    <div class="segmented-control-panel" id="seg-panel-week" role="region" aria-labelledby="seg-week">
      Week view.
    </div>
  </div>
</div>
```

```javascript
import { initSegmentedControl, initSegmentedControls } from "./components/segmented-control.js";

const segmented = initSegmentedControl(document.getElementById("my-segmented"), {
  defaultValue: "list",
  disabled: false,
  onChange: ({ value, index, item, panel, source }) => console.log(value, source),
});

segmented?.getValue();
segmented?.selectValue("grid");
segmented?.selectIndex(1);
segmented?.getActiveIndex();
segmented?.setDisabled(true);

initSegmentedControls(document); // all `.segmented-control` blocks
```

`data-segmented-control-default` and `data-segmented-control-disabled` mirror the JS options. Individual items can be disabled with the `disabled` attribute. Arrow keys move selection when the radiogroup is focused; Home and End jump to the first and last enabled item.

### Progress indicator

Multi-step wizard with a step list, one visible panel at a time, and back/next actions. In linear mode (default), users can only jump to steps they have already visited; set `data-progress-indicator-linear="false"` to allow jumping to any step from the header.

**Horizontal** (default) — step list across the top. **Vertical** — add `data-progress-indicator-vertical` (or `vertical: true`) for a left-hand step column with panels and actions on the right. Markup is the same; `initProgressIndicator()` adds `.progress-indicator--vertical` when enabled.

```html
<div class="progress-indicator" id="my-progress-indicator" data-progress-indicator-linear
  data-progress-indicator-default="0">
  <ol class="progress-indicator-list">
    <li class="progress-indicator-item">
      <button type="button" class="progress-indicator-step" id="my-step-1" aria-current="step">
        <span class="progress-indicator-marker" aria-hidden="true">1</span>
        <span class="progress-indicator-label">Account</span>
      </button>
    </li>
    <li class="progress-indicator-item">
      <button type="button" class="progress-indicator-step" id="my-step-2" disabled>
        <span class="progress-indicator-marker" aria-hidden="true">2</span>
        <span class="progress-indicator-label">Review</span>
      </button>
    </li>
  </ol>
  <div class="progress-indicator-panels">
    <div class="progress-indicator-panel" id="my-panel-1" role="region" aria-labelledby="my-step-1">
      <div class="progress-indicator-body">Step one content.</div>
    </div>
    <div class="progress-indicator-panel hidden" id="my-panel-2" role="region" aria-labelledby="my-step-2" hidden>
      <div class="progress-indicator-body">Step two content.</div>
    </div>
  </div>
  <div class="progress-indicator-actions">
    <button type="button" class="btn" data-progress-indicator-back hidden>Back</button>
    <button type="button" class="btn btn-primary" data-progress-indicator-next>Next</button>
  </div>
</div>
```

Vertical layout — same structure, add `data-progress-indicator-vertical`:

```html
<div class="progress-indicator" data-progress-indicator-vertical data-progress-indicator-linear
  data-progress-indicator-default="0">
  <!-- same .progress-indicator-list, .progress-indicator-panels, .progress-indicator-actions -->
</div>
```

```javascript
import { initProgressIndicator, initProgressIndicators } from "./components/progress-indicator.js";

const progressIndicator = initProgressIndicator(document.getElementById("my-progress-indicator"), {
  defaultStep: 0,
  linear: true,
  vertical: false,
  finishLabel: "Finish",
  onChange: ({ index, step, panel, isLastStep }) => {},
  onFinish: ({ index, panel }) => {},
});

progressIndicator?.goToStep(1);
progressIndicator?.nextStep();
progressIndicator?.prevStep();
progressIndicator?.getActiveIndex();
progressIndicator?.getMaxVisitedIndex();
progressIndicator?.isVertical();

initProgressIndicators(document); // all `.progress-indicator` blocks
```

`data-progress-indicator-default` sets the initial step index. `data-progress-indicator-finish-label` overrides the next-button label on the last step (default `Finish`). `data-progress-indicator-vertical` enables the vertical layout. Step and panel counts must match; they are paired by order.

### Dropdown

```javascript
import { initDropdown } from "./components/dropdown.js";

initDropdown(document.getElementById("my-dropdown"), {
  onSelect: ({ value, label }) => { /* item chosen */ },
});
```

Markup: `.dropdown` > `.dropdown-trigger` + `ul.dropdown-menu` with `.dropdown-menu-item` buttons.

### Toggle dropdown

Multi-select variant: clicking an item toggles it; the menu stays open until you click away or press Escape. The trigger shows the selection count when any items are active (e.g. `Toggle items (3)`).

```javascript
import { initToggleDropdown } from "./components/dropdown-toggle.js";

const toggleDropdown = initToggleDropdown(document.getElementById("my-toggle-dropdown"), {
  onToggle: ({ value, label, selected, values, labels }) => {
    console.log(label, selected, values);
  },
});

toggleDropdown?.getSelected(); // [{ value, label, item }, …]
toggleDropdown?.setSelected(["alpha", "gamma"]);
```

```html
<div class="dropdown" id="my-toggle-dropdown">
  <button type="button" class="btn dropdown-trigger" aria-haspopup="menu" aria-expanded="false"
    aria-controls="my-toggle-dropdown-menu">
    <span class="dropdown-trigger-label">Toggle items</span>
    <span class="combo-btn-chevron" aria-hidden="true"></span>
  </button>
  <ul id="my-toggle-dropdown-menu" class="dropdown-menu hidden" role="menu">
    <li role="none">
      <button type="button" class="dropdown-menu-item" role="menuitemcheckbox" aria-checked="false"
        data-value="alpha">Alpha</button>
    </li>
  </ul>
</div>
```

### Expand

```html
<div class="expand">
  <button type="button" class="expand-trigger" aria-expanded="false" aria-controls="my-expand-panel">
    <span class="expand-notch" aria-hidden="true"></span>
    <span class="expand-label">Advanced options</span>
  </button>
  <div id="my-expand-panel" class="expand-panel hidden" hidden>
    <div class="expand-body">More content here.</div>
  </div>
</div>
```

```javascript
import { initExpand, initExpands } from "./components/expand.js";

initExpands(document); // all .expand blocks

// or one instance:
const expand = initExpand(document.getElementById("my-expand"));
// expand.open(), expand.close(), expand.toggle(), expand.isOpen()
```

### Accordion

Vertical stack of sections. Each `.accordion-item` has a heading button and a collapsible panel. By default only one panel is open at a time; add `data-accordion-multiple` to allow several.

```html
<div class="accordion" data-accordion-default-open="0">
  <div class="accordion-item">
    <h3 class="accordion-heading">
      <button type="button" class="accordion-trigger" id="acc-trigger-1" aria-expanded="false"
        aria-controls="acc-panel-1">
        <span class="accordion-notch" aria-hidden="true"></span>
        <span class="accordion-label">Section one</span>
      </button>
    </h3>
    <div id="acc-panel-1" class="accordion-panel hidden" role="region" aria-labelledby="acc-trigger-1" hidden>
      <div class="accordion-body">Content for section one.</div>
    </div>
  </div>
</div>
```

```javascript
import { initAccordion, initAccordions } from "./components/accordion.js";

initAccordions(document); // all .accordion blocks

const accordion = initAccordion(document.getElementById("my-accordion"), {
  allowMultiple: false,
  defaultOpen: 0,
  onToggle: ({ index, isOpen, trigger }) => {},
});
// accordion.open(0), accordion.close(0), accordion.toggle(0), accordion.closeAll(), accordion.getOpenIndices()
```

`data-accordion-default-open` sets the initially open panel index. `data-accordion-open` on an item opens it on load (use with `data-accordion-multiple` for several). Arrow Up/Down, Home, and End move focus between headers.

### Tabs

```html
<div class="tabs">
  <div class="tabs-list" role="tablist" aria-label="Sections">
    <button type="button" class="tabs-tab" role="tab" id="tab-a" aria-selected="true" aria-controls="panel-a">Overview</button>
    <button type="button" class="tabs-tab" role="tab" id="tab-b" aria-selected="false" aria-controls="panel-b" tabindex="-1">Details</button>
  </div>
  <div id="panel-a" class="tabs-panel" role="tabpanel" aria-labelledby="tab-a">
    <div class="tabs-body">Overview content</div>
  </div>
  <div id="panel-b" class="tabs-panel hidden" role="tabpanel" aria-labelledby="tab-b" hidden>
    <div class="tabs-body">Details content</div>
  </div>
</div>
```

```javascript
import { initTab, initTabs } from "./components/tabs.js";

initTabs(document); // all .tabs blocks

// or one instance:
const tabs = initTab(document.getElementById("my-tabs"));
// tabs.selectTab(1), tabs.getActiveIndex()
```

Arrow keys move between tabs when the tab list is focused.

### Pagination

Split content across numbered pages and navigate in place — no full reload and no URL change. Pair `.pagination-panel` blocks with `.pagination-page` buttons via matching `data-pagination-panel` / `data-pagination-page` (1-based). Use `onChange` when you render content yourself instead of static panels.

```html
<div class="pagination" id="my-pagination" data-pagination-default="1">
  <div class="pagination-panels">
    <div class="pagination-panel" data-pagination-panel="1" role="region" aria-label="Page 1">
      Page one content.
    </div>
    <div class="pagination-panel hidden" data-pagination-panel="2" role="region" aria-label="Page 2" hidden>
      Page two content.
    </div>
  </div>
  <nav class="pagination-nav" aria-label="Results pages">
    <button type="button" class="btn btn-icon pagination-prev" data-pagination-prev
      aria-label="Previous page" disabled>‹</button>
    <ul class="pagination-list">
      <li class="pagination-item">
        <button type="button" class="pagination-page is-active" data-pagination-page="1"
          aria-current="page">1</button>
      </li>
      <li class="pagination-item">
        <button type="button" class="pagination-page" data-pagination-page="2" tabindex="-1">2</button>
      </li>
    </ul>
    <button type="button" class="btn btn-icon pagination-next" data-pagination-next
      aria-label="Next page">›</button>
  </nav>
  <input type="hidden" class="pagination-value" name="page" value="1" />
</div>
```

```javascript
import { initPagination, initPaginations } from "./components/pagination.js";

const pagination = initPagination(document.getElementById("my-pagination"), {
  defaultPage: 1,
  disabled: false,
  onChange: ({ page, pageCount, panel, source }) => console.log(page, source),
});

pagination?.getPage();
pagination?.goToPage(2);
pagination?.nextPage();
pagination?.prevPage();
pagination?.getPageCount();
pagination?.setDisabled(true);

initPaginations(document); // all `.pagination` blocks
```

`data-pagination-default` and `data-pagination-disabled` mirror the JS options. Previous and next disable on the first and last page. Arrow keys move between pages when the nav is focused.

### Table

Styled data tables for lists of records. Wrap a semantic `<table>` in `.table-block` and `.table-wrap`. Use `.table--striped` for alternating rows, `.table--compact` for tighter padding, and `.table-num` to right-align numeric columns.

Optional **sortable** columns: set `data-table-sortable` on `.table-block` and `data-table-sort` on `<th>` cells. Add `data-sort-type="text"`, `"number"`, or `"date"` (default `text`). Put a `.table-sort-button` inside the header or let `initTable()` create one from the header text.

Optional **row selection**: set `data-table-selectable` on `.table-block`, a `data-table-select-all` checkbox in the header row, and `data-table-row-select` on each row. Pair rows with `data-table-row-id` for stable ids in callbacks.

```html
<div class="table-block" id="issues-table" data-table-sortable data-table-selectable>
  <div class="table-wrap">
    <table class="table table--striped">
      <caption class="table-caption">Open issues</caption>
      <thead>
        <tr>
          <th class="table-select-col" scope="col">
            <label class="checkbox">
              <input type="checkbox" class="checkbox-input" data-table-select-all
                aria-label="Select all rows" />
            </label>
          </th>
          <th scope="col" data-table-sort data-sort-type="text">
            <button type="button" class="table-sort-button">Title</button>
          </th>
          <th scope="col" data-table-sort data-sort-type="number" class="table-num">
            <button type="button" class="table-sort-button">Comments</button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr data-table-row-id="42">
          <td class="table-select-col">
            <label class="checkbox">
              <input type="checkbox" class="checkbox-input" data-table-row-select
                aria-label="Select row" />
            </label>
          </td>
          <td>Fix nav overlap on mobile</td>
          <td class="table-num">3</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

```javascript
import { initTable, initTables } from "./components/table.js";

const table = initTable(document.getElementById("issues-table"), {
  sortable: true,
  selectable: true,
  onSort: ({ columnIndex, direction, sortType }) => console.log(columnIndex, direction, sortType),
  onSelectionChange: ({ selectedIds, selectedRows }) => console.log(selectedIds),
});

table?.getSelectedIds();
table?.clearSelection();
table?.setDisabled(true);
table?.destroy();

initTables(document);
```

`data-table-sortable`, `data-table-selectable`, and `data-table-disabled` mirror the JS options. Add `.table-block--wide` to remove the default `40rem` max width.

### Page navigation

Injected by `initShell()` via [`app/shell/render-shell.js`](app/shell/render-shell.js). Collects `main h2[id]` headings automatically and shows plain section-title links (same weight and colour as `.section-heading`). Give each section heading a unique `id` and optional `.section-heading` class (`scroll-margin-top` is included).

```javascript
import { initShell } from "./shell/shell.js";

initShell(); // default: main h2[id]

// Custom heading scan (e.g. h3 under a docs root):
initShell({
  pageNav: {
    headingSelector: "main h3[id]",
    headingRoot: document.getElementById("docs"),
  },
});
```

Standalone use without the full shell — insert markup from `PAGE_NAV_MARKUP` in `render-shell.js`, then:

```javascript
import { initPageNavPanel } from "./shell/page-nav.js";

const nav = initPageNavPanel(); // defaults to #page-nav
nav?.rebuild(); // call after adding/removing headings dynamically
nav?.destroy(); // remove listeners when tearing down
```

Jump up scrolls to the top; jump down scrolls to the bottom. Jump buttons are always visible at the bottom-right; the section list appears when you hover the right-edge trigger strip (or focus a section link inside the panel). The blue ring shows scroll progress. If no matching headings exist, the section list is hidden and only the jump buttons remain.

Mark a top-level nav group by adding `data-page-nav-tier` to its `h2`. The next headings in document order nest under it until another tier heading appears. Tier links use full weight; nested section links are slightly smaller and muted.

### Rich text editor (Toast UI)

Markdown and WYSIWYG editing with live preview. Includes the [table merged-cell](https://github.com/nhn/tui.editor/tree/master/plugins/table-merged-cell) plugin. Pasted or dropped images are inlined as base64 data URLs (no upload server).

The vendor bundle is large (~500KB+ minified). Omit `app/vendor/toastui-editor*` and related modules if you do not need rich text.

**Page setup** — link Toast UI CSS in `<head>` and load vendor scripts before your ES module entry (see [`demo.html`](demo.html)):

```html
<link rel="stylesheet" href="app/toastui-editor.css" />
```

`app/toastui-editor.css` imports the base editor CSS, dark theme (`app/vendor/toastui-editor/theme/toastui-editor-dark.min.css`), and the table merged-cell plugin styles.

```html
<script defer src="app/vendor/toastui-editor/toastui-editor-all.min.js"></script>
<script defer src="app/vendor/toastui-editor-plugin-table-merged-cell/toastui-editor-plugin-table-merged-cell.min.js"></script>
```

**Markup:**

```html
<div class="field rich-text-editor" id="my-editor"
  data-rich-text-editor-height="320px"
  data-rich-text-editor-edit-type="wysiwyg"
  data-rich-text-editor-preview="vertical"
  data-rich-text-editor-placeholder="Write something…">
  <span class="field-label">Body</span>
  <div class="rich-text-editor-mount" aria-label="Rich text editor"></div>
</div>
```

| `data-*` attribute | Option | Default |
| ---------------- | ------ | ------- |
| `data-rich-text-editor-height` | `height` | `300px` |
| `data-rich-text-editor-edit-type` | `initialEditType` (`markdown` \| `wysiwyg`) | `wysiwyg` |
| `data-rich-text-editor-preview` | `previewStyle` (`vertical` \| `tab`) | `vertical` |
| `data-rich-text-editor-placeholder` | `placeholder` | — |
| `data-rich-text-editor-value` | `initialValue` | `""` |
| `data-rich-text-editor-autofocus` | `autofocus` | `false` |

```javascript
import { initRichTextEditor, initRichTextEditors } from "./components/rich-text-editor.js";

const editor = initRichTextEditor(document.getElementById("my-editor"), {
  height: "320px",
  initialEditType: "wysiwyg",
  previewStyle: "vertical",
  initialValue: "## Hello\n\nStart writing…",
  placeholder: "Write something…",
  plugins: ["tableMergedCell"], // default; pass [] or plugins: false to disable
  onChange: ({ markdown, html, source }) => console.log(source, markdown.length),
});

editor?.getMarkdown();
editor?.getHTML();
editor?.setMarkdown("…");
editor?.setHTML("…"); // may not round-trip cleanly to Markdown
editor?.destroy();

initRichTextEditors(document); // every `.rich-text-editor` with a mount node
```

Theme (light/dark) follows the page `data-theme` attribute and updates on `microapp-theme-change` from [`app/theme.js`](app/theme.js).

Switch between Markdown and WYSIWYG using Toast UI’s built-in mode control in the toolbar. Converting between Markdown and HTML is lossy for complex formatting (tables, nested lists, etc.) — treat one format as canonical when persisting content.

### Code highlighting (Prism)

Optional syntax highlighting for docs or demos. See [`demo.html`](demo.html) for examples with line numbers, highlight toggle, copy, and maximise.

```html
<link rel="stylesheet" href="app/prism.css" />
<script defer src="app/vendor/prism/prism.min.js"></script>
<script defer src="app/vendor/prism/prism-python.min.js"></script>
<script defer src="app/vendor/prism/prism-line-numbers.min.js"></script>
```

```html
<div class="code-block" data-code-mode="select" data-code-copy="true" data-expandable-surface data-expandable-surface-label="Code sample">
  <div class="code-block-toolbar" role="group" aria-label="Code block options">
    <button type="button" class="btn code-block-toggle" data-code-toggle="line-numbers" aria-pressed="true">Line numbers</button>
    <button type="button" class="btn code-block-toggle" data-code-toggle="highlight" aria-pressed="true">Highlight</button>
  </div>
  <div class="code-block-body" data-expandable-surface-trigger>
    <button type="button" class="code-block-copy btn" aria-label="Copy code">Copy</button>
    <pre class="line-numbers language-python"><code class="language-python">def greet(name: str) -> str:
    return f"Hello, {name}!"
</code></pre>
  </div>
</div>
```

```javascript
import { initCodeBlocks } from "./components/code-block.js";
import { initExpandableSurfaces } from "./components/expandable-surface.js";

initCodeBlocks(document);
initExpandableSurfaces(document);
```

Set `data-code-copy="false"` on `.code-block` to disable the copy button. Line numbers require highlighting to be on.

**Interaction modes** — set `data-code-mode` on `.code-block`:

| Mode | Behaviour |
| ---- | --------- |
| `view` | Read-only display; text cannot be selected; copy button hidden |
| `select` | Read-only; text selectable; copy and highlight toggles (default) |
| `edit` | Editable overlay on highlighted `<pre>`; line numbers and highlight toggles apply |

Switch modes at runtime via `initCodeBlock()` → `setMode("edit")`, `getMode()`, `getSource()`, `setSource(text)`.

### Expandable surface

Reusable expanded overlay for code blocks, multi-line inputs, or any block marked with `data-expandable-surface`. A maximise icon appears on hover (injected into the trigger element); click expands the surface to the page body width (`--page-width`), Escape or backdrop click closes it.

```html
<div class="field" data-expandable-surface data-expandable-surface-label="Notes">
  <span class="field-label">Notes</span>
  <div data-expandable-surface-trigger>
    <textarea class="textarea" rows="4"></textarea>
  </div>
</div>
```

```javascript
import { initExpandableSurfaces } from "./components/expandable-surface.js";

initExpandableSurfaces(document);
```

Add other language components under `app/vendor/prism/` as needed from [Prism](https://prismjs.com/).

### Icons

All inline UI icons live in [`app/icons.js`](app/icons.js). Edit paths there once; pages mount them at load via `initIcons()`.

Browse and copy SVG paths from [Icônes — Google Material Icons (Round variant)](https://icones.js.org/collection/ic?s=info&variant=Round) (`ic` collection, `variant=Round`).

HTML:

```html
<button type="button" data-icon="light-mode" data-icon-class="theme-icon" aria-label="Light"></button>
```

JavaScript:

```javascript
import { createIcon, initIcons } from "./utils/icons.js";

initIcons(document); // mounts every [data-icon] in the page

const svg = createIcon("lines", { className: "btn-icon-svg" });
button.append(svg);
```

Add new icons to the `ICONS` object in `app/icons.js`. App logo (`app/res/app-light.svg`, `app/res/app-dark.svg`) and signature (`app/res/sig-light.svg`, `app/res/sig-dark.svg`) swap by theme via CSS; favicon syncs in `app/utils/brand-icon.js`.

Licensed icon sets (e.g. Material Icons) can use optional metadata on each entry:

```javascript
import { ICON_ATTRIBUTIONS } from "./utils/icons.js";

export const ICONS = {
  info: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="…"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-info", // source collection id (Icônes / Material Icons)
  },
};
```

- `name` — original icon name in the source collection (metadata only; not used at runtime)
- `attribution` — license notice, inserted as an HTML comment inside the SVG
- `ref` — alias to another `ICONS` key (e.g. `lines: { ref: "note" }`)

Pass `includeAttribution: false` to `createIcon()` if you need the SVG without the comment.
