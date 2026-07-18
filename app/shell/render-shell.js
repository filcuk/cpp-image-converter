import { APP_CONFIG } from "../config.js";
import { SIG_ICON_SRC } from "../utils/brand-icon.js";
import { APP_VERSION, TEMPLATE_VERSION } from "../version.js";

const DEFAULTS = {
  repoUrl: APP_CONFIG.repoUrl,
  brandUrl: APP_CONFIG.brandUrl,
  brandName: APP_CONFIG.brandName,
  appVersion: APP_VERSION,
  templateVersion: TEMPLATE_VERSION,
};

/** Required markup for {@link initPageNav} — also injected by {@link renderPageShell}. */
export const PAGE_NAV_MARKUP = `<nav id="page-nav" class="page-nav" aria-label="Page navigation">
  <div class="page-nav-trigger">
    <div class="page-nav-stack">
      <div class="page-nav-panel">
        <ul class="page-nav-list"></ul>
      </div>
      <div class="page-nav-jumps">
        <span class="page-nav-jump-ring" aria-hidden="true"></span>
        <div class="page-nav-jump-inner">
          <button type="button" class="page-nav-jump page-nav-jump-up" data-page-nav="up" aria-label="Back to top">
            <span data-icon="chevron-up" data-icon-class="page-nav-icon-svg"></span>
          </button>
          <button type="button" class="page-nav-jump page-nav-jump-down" data-page-nav="down" aria-label="Jump to bottom">
            <span data-icon="chevron-down" data-icon-class="page-nav-icon-svg"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</nav>`;

/**
 * Inject shared page chrome: footer (links + theme toggle) and page navigation.
 * Skips if `#app-page-footer` already exists.
 */
export function renderPageShell(options = {}) {
  if (!document.getElementById("skip-to-main")) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<a id="skip-to-main" class="skip-link" href="#main">Skip to main content</a>`
    );
  }

  if (document.getElementById("app-page-footer")) return;

  const { repoUrl, brandUrl, brandName, appVersion, templateVersion } = {
    ...DEFAULTS,
    ...options,
  };
  const issuesUrl = `${repoUrl}/issues`;

  document.body.insertAdjacentHTML(
    "beforeend",
    `<footer id="app-page-footer">
      <p class="footer-meta">
        <span>
          <span class="footer-version" data-tooltip="based on template v${templateVersion}" data-tooltip-position="top" tabindex="0">v${appVersion}</span>
          · <span data-tooltip="or suggest a feature" data-tooltip-position="top" tabindex="0">report an
          <a href="${issuesUrl}" target="_blank" rel="noopener noreferrer">issue</a></span>
          · star on
          <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
          · microapp by
        </span>
        <a class="footer-brand" href="${brandUrl}" target="_blank" rel="noopener noreferrer" data-tooltip="that's me!" data-tooltip-position="top">
          <img class="brand-icon--light" src="${SIG_ICON_SRC.light}" alt="${brandName}" width="26" height="26" />
          <img class="brand-icon--dark" src="${SIG_ICON_SRC.dark}" alt="${brandName}" width="26" height="26" />
        </a>
      </p>
      <div id="theme-toggle" class="theme-toggle" role="group" aria-label="Theme">
        <button type="button" class="theme-toggle-btn" data-theme-mode="light" data-icon="light-mode" data-icon-class="theme-icon" aria-label="Light theme" aria-pressed="false" title="Light"></button>
        <button type="button" class="theme-toggle-btn" data-theme-mode="dark" data-icon="dark-mode" data-icon-class="theme-icon" aria-label="Dark theme" aria-pressed="false" title="Dark"></button>
        <button type="button" class="theme-toggle-btn" data-theme-mode="auto" data-icon="auto-mode" data-icon-class="theme-icon" aria-label="System theme" aria-pressed="false" title="System"></button>
      </div>
    </footer>
    ${PAGE_NAV_MARKUP}`
  );
}
