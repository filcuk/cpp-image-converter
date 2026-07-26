import { APP_CONFIG } from "../config.js";
import { SIG_ICON_SRC } from "../utils/brand-icon.js";
import { APP_VERSION, TEMPLATE_VERSION } from "../version.js";

const DEFAULTS = {
  repoUrl: APP_CONFIG.repoUrl,
  appUrl: APP_CONFIG.appUrl,
  brandUrl: APP_CONFIG.brandUrl,
  brandName: APP_CONFIG.brandName,
  alsoSee: APP_CONFIG.alsoSee,
  alsoSeeUrl: APP_CONFIG.alsoSeeUrl,
  alsoSeeTopics: APP_CONFIG.alsoSeeTopics,
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
 * @param {unknown} value
 * @returns {string}
 */
function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Normalize a site URL for equality checks (scheme, host, path; no query/hash; no trailing slash).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSiteUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    parsed.search = "";
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${path}`.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
}

/**
 * @typedef {{
 *   label: string,
 *   subtitle: string,
 *   url: string,
 *   icon: string,
 *   iconLight: string,
 *   iconDark: string,
 * }} AlsoSeeLink
 * @typedef {{ topic: string | null, items: AlsoSeeLink[] }} AlsoSeeSection
 */

/**
 * @param {unknown} link
 * @param {string} exclude Normalized site URL to drop, or ""
 * @returns {AlsoSeeLink | null}
 */
function normalizeAlsoSeeLink(link, exclude) {
  if (!link || typeof link !== "object") return null;

  const label = typeof link.label === "string" ? link.label.trim() : "";
  const url = typeof link.url === "string" ? link.url.trim() : "";
  if (!label || !url) return null;
  if (exclude && normalizeSiteUrl(url) === exclude) return null;

  const subtitle =
    typeof link.subtitle === "string" ? link.subtitle.trim() : "";
  const icon =
    typeof link.icon === "string" && link.icon.trim() ? link.icon.trim() : "";
  const iconLight =
    typeof link.iconLight === "string" && link.iconLight.trim()
      ? link.iconLight.trim()
      : "";
  const iconDark =
    typeof link.iconDark === "string" && link.iconDark.trim()
      ? link.iconDark.trim()
      : "";

  // Theme pair when either light/dark is set; otherwise a single always-visible icon.
  if (iconLight || iconDark) {
    return {
      label,
      subtitle,
      url,
      icon: "",
      iconLight: iconLight || iconDark,
      iconDark: iconDark || iconLight,
    };
  }

  return { label, subtitle, url, icon, iconLight: "", iconDark: "" };
}

/**
 * @param {unknown} topics
 * @returns {Set<string> | null} Lowercased topic whitelist, or null for “all topics”
 */
function normalizeAlsoSeeTopicFilter(topics) {
  if (topics === undefined || topics === null || topics === false) return null;
  if (!Array.isArray(topics)) return null;
  return new Set(
    topics
      .filter((t) => typeof t === "string")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** @param {AlsoSeeSection[]} sections */
export function alsoSeeHasItems(sections) {
  return sections.some((section) => section.items.length > 0);
}

/**
 * Normalize also-see JSON / config into sections.
 *
 * Accepts a top-level array of:
 * - `{ topic, items: link[] }` topic groups
 * - flat `{ label, url, … }` links (rendered without a group header)
 *
 * @param {unknown} alsoSee
 * @param {string} [excludeUrl] Drop entries whose `url` matches this app’s public URL
 * @param {string[] | false | null} [topics] Optional topic whitelist (case-insensitive).
 *   Omit / `null` / `false` → all topics. Empty array → no named topics (flat links only).
 *   Ungrouped flat links are always kept.
 * @returns {AlsoSeeSection[]}
 */
export function normalizeAlsoSee(alsoSee, excludeUrl = "", topics) {
  if (alsoSee === false || alsoSee === null || alsoSee === undefined) return [];
  if (!Array.isArray(alsoSee)) return [];

  const exclude = normalizeSiteUrl(excludeUrl);
  const topicFilter = normalizeAlsoSeeTopicFilter(topics);
  /** @type {AlsoSeeSection[]} */
  const sections = [];

  for (const entry of alsoSee) {
    if (!entry || typeof entry !== "object") continue;

    if (Array.isArray(entry.items)) {
      const topic =
        typeof entry.topic === "string" ? entry.topic.trim() : "";
      if (topicFilter) {
        if (!topic || !topicFilter.has(topic.toLowerCase())) continue;
      }

      const items = entry.items
        .map((link) => normalizeAlsoSeeLink(link, exclude))
        .filter(Boolean);
      if (!items.length) continue;

      sections.push({ topic: topic || null, items });
      continue;
    }

    const link = normalizeAlsoSeeLink(entry, exclude);
    if (!link) continue;

    const last = sections[sections.length - 1];
    if (last && last.topic === null) {
      last.items.push(link);
    } else {
      sections.push({ topic: null, items: [link] });
    }
  }

  return sections;
}

/**
 * @param {AlsoSeeLink} link
 * @returns {string}
 */
function renderAlsoSeeIconMarkup(link) {
  if (link.iconLight || link.iconDark) {
    return `<span class="dropdown-menu-item-icon-wrap" aria-hidden="true">
              <img class="dropdown-menu-item-icon brand-icon--light" src="${escapeAttr(link.iconLight)}" alt="" width="24" height="24" />
              <img class="dropdown-menu-item-icon brand-icon--dark" src="${escapeAttr(link.iconDark)}" alt="" width="24" height="24" />
            </span>`;
  }
  if (link.icon) {
    return `<span class="dropdown-menu-item-icon-wrap" aria-hidden="true">
              <img class="dropdown-menu-item-icon" src="${escapeAttr(link.icon)}" alt="" width="24" height="24" />
            </span>`;
  }
  return "";
}

/**
 * @param {AlsoSeeLink} link
 * @param {number} index
 * @returns {string}
 */
function renderAlsoSeeLinkItem(link, index) {
  const iconMarkup = renderAlsoSeeIconMarkup(link);
  const subtitleMarkup = link.subtitle
    ? `<span class="dropdown-menu-item-subtitle">${escapeText(link.subtitle)}</span>`
    : "";

  return `<li role="none">
          <a href="${escapeAttr(link.url)}" class="dropdown-menu-item" role="menuitem" data-no-external-icon data-value="${index}">
            ${iconMarkup}
            <span class="dropdown-menu-item-text">
              <span class="dropdown-menu-item-label">${escapeText(link.label)}</span>
              ${subtitleMarkup}
            </span>
          </a>
        </li>`;
}

/**
 * @param {AlsoSeeSection[]} sections
 * @returns {string}
 */
export function renderAlsoSeeMarkup(sections) {
  if (!alsoSeeHasItems(sections)) return "";

  let index = 0;
  const items = sections
    .map((section, sectionIndex) => {
      const linksMarkup = section.items
        .map((link) => renderAlsoSeeLinkItem(link, index++))
        .join("");
      if (!section.topic) {
        const divider =
          sectionIndex > 0
            ? `<li role="separator" class="dropdown-menu-separator"></li>`
            : "";
        return `${divider}${linksMarkup}`;
      }
      return `<li role="presentation">
          <div class="dropdown-menu-group">${escapeText(section.topic)}</div>
        </li>${linksMarkup}`;
    })
    .join("");

  return `<span class="footer-meta-sep" aria-hidden="true">·</span>
        <div class="footer-also-see dropdown" id="footer-also-see">
          <button type="button" class="footer-also-see-trigger" id="footer-also-see-trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="footer-also-see-menu">also see</button>
          <ul id="footer-also-see-menu" class="dropdown-menu footer-also-see-menu hidden" role="menu" hidden>
            ${items}
          </ul>
        </div>`;
}

/**
 * Replace the footer “also see” host contents with link markup.
 *
 * @param {ParentNode | null | undefined} root
 * @param {AlsoSeeSection[]} sections
 * @returns {HTMLElement | null} Host element, or null if missing
 */
export function mountAlsoSee(root, sections) {
  const host =
    root?.querySelector?.("#footer-also-see-host") ??
    document.getElementById("footer-also-see-host");
  if (!host) return null;
  host.innerHTML = renderAlsoSeeMarkup(sections);
  return host;
}

/**
 * Inject shared page chrome: footer (links + theme toggle) and page navigation.
 * Skips if `#app-page-footer` already exists.
 *
 * @param {object} [options]
 * @param {string} [options.repoUrl]
 * @param {string} [options.appUrl]
 * @param {string} [options.brandUrl]
 * @param {string} [options.brandName]
 * @param {false | object[]} [options.alsoSee]
 * @param {string} [options.alsoSeeUrl]
 * @param {string[] | false | null} [options.alsoSeeTopics]
 * @param {string} [options.appVersion]
 * @param {string} [options.templateVersion]
 * @param {boolean} [options.pageNav=true] When `false`, omit `#page-nav` markup
 */
export function renderPageShell(options = {}) {
  if (!document.getElementById("skip-to-main")) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<a id="skip-to-main" class="skip-link" href="#main">Skip to main content</a>`
    );
  }

  if (document.getElementById("app-page-footer")) return;

  const {
    repoUrl,
    brandUrl,
    brandName,
    alsoSee,
    alsoSeeTopics,
    appUrl,
    appVersion,
    templateVersion,
    pageNav = true,
  } = {
    ...DEFAULTS,
    ...options,
  };
  const issuesUrl = `${repoUrl}/issues`;
  const alsoSeeSections = normalizeAlsoSee(alsoSee, appUrl, alsoSeeTopics);
  const alsoSeeMarkup = renderAlsoSeeMarkup(alsoSeeSections);
  const navMarkup = pageNav === false ? "" : PAGE_NAV_MARKUP;

  document.body.insertAdjacentHTML(
    "beforeend",
    `<footer id="app-page-footer">
      <div class="footer-meta">
        <div class="footer-meta-copy">
          <span class="footer-version" data-tooltip="based on template v${templateVersion}" data-tooltip-position="top" tabindex="0">v${appVersion}</span>
          <span class="footer-meta-sep" aria-hidden="true">·</span>
          <span data-tooltip="or suggest a feature" data-tooltip-position="top" tabindex="0">report an
          <a href="${issuesUrl}" target="_blank" rel="noopener noreferrer">issue</a></span>
          <span class="footer-meta-sep" aria-hidden="true">·</span>
          <span>star on
          <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">GitHub</a></span><span id="footer-also-see-host">${alsoSeeMarkup}</span>
          <span class="footer-meta-sep" aria-hidden="true">·</span>
          <span>microapp by</span>
        </div>
        <a class="footer-brand" href="${brandUrl}" target="_blank" rel="noopener noreferrer" data-tooltip="that's me!" data-tooltip-position="top">
          <img class="brand-icon--light" src="${SIG_ICON_SRC.light}" alt="${escapeAttr(brandName)}" width="26" height="26" />
          <img class="brand-icon--dark" src="${SIG_ICON_SRC.dark}" alt="${escapeAttr(brandName)}" width="26" height="26" />
        </a>
      </div>
      <div id="theme-toggle" class="theme-toggle" role="group" aria-label="Theme">
        <button type="button" class="theme-toggle-btn" data-theme-mode="light" data-icon="light-mode" data-icon-class="theme-icon" aria-label="Light theme" aria-pressed="false" title="Light"></button>
        <button type="button" class="theme-toggle-btn" data-theme-mode="dark" data-icon="dark-mode" data-icon-class="theme-icon" aria-label="Dark theme" aria-pressed="false" title="Dark"></button>
        <button type="button" class="theme-toggle-btn" data-theme-mode="auto" data-icon="auto-mode" data-icon-class="theme-icon" aria-label="System theme" aria-pressed="false" title="System"></button>
      </div>
    </footer>
    ${navMarkup}`
  );
}
