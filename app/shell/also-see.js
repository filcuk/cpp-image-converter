import { APP_CONFIG } from "../config.js";
import { createIcon } from "../utils/icons.js";
import { initPopupMenu } from "../utils/menu.js";
import {
  alsoSeeHasItems,
  mountAlsoSee,
  normalizeAlsoSee,
} from "./render-shell.js";

/**
 * Drop a failed menu icon; remove the wrap when empty, or show the remaining
 * theme variant in both themes so the slot is not blank.
 *
 * @param {HTMLImageElement} img
 */
function hideBrokenAlsoSeeIcon(img) {
  const wrap = img.closest(".dropdown-menu-item-icon-wrap");
  img.remove();
  if (!wrap) return;

  const remaining = wrap.querySelectorAll("img");
  if (!remaining.length) {
    wrap.remove();
    return;
  }

  remaining.forEach((el) => {
    el.classList.remove("brand-icon--light", "brand-icon--dark");
  });
}

/**
 * Hide also-see icons that 404 (including already-failed cached loads).
 *
 * @param {ParentNode} root
 */
function bindAlsoSeeIconFallback(root) {
  root.querySelectorAll(".dropdown-menu-item-icon").forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.complete && img.naturalWidth === 0) {
      hideBrokenAlsoSeeIcon(img);
      return;
    }
    img.addEventListener("error", () => hideBrokenAlsoSeeIcon(img), {
      once: true,
    });
  });
}

/**
 * @param {ParentNode} [root=document]
 * @returns {ReturnType<typeof initPopupMenu> | null}
 */
function wireAlsoSeeMenu(root = document) {
  const containerEl =
    root.querySelector?.("#footer-also-see") ??
    document.getElementById("footer-also-see");
  if (!containerEl) return null;

  const trigger = containerEl.querySelector(".footer-also-see-trigger");
  const menuEl = containerEl.querySelector(".footer-also-see-menu");
  if (!trigger || !menuEl) return null;

  if (!trigger.querySelector(".external-link-icon")) {
    trigger.classList.add("external-link");
    trigger.append(createIcon("arrow-outward", { className: "external-link-icon" }));
  }

  bindAlsoSeeIconFallback(menuEl);

  return initPopupMenu({
    containerEl,
    menuEl,
    toggleEl: trigger,
    itemSelector: ".dropdown-menu-item",
    // Fixed so the upward menu is not covered by main content (editors, etc.).
    fixed: true,
    onSelect: ({ item }) => {
      // Plain left-click / keyboard: same window. Middle-click and Ctrl/Cmd-click
      // use the native <a> behaviour (menu.js skips onSelect for those).
      const url =
        (item instanceof HTMLAnchorElement && item.getAttribute("href")) ||
        item.dataset.url;
      if (!url) return;
      window.location.assign(url);
    },
  });
}

/**
 * @param {string} url
 * @returns {Promise<unknown>}
 */
async function fetchAlsoSeeJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`alsoSee fetch failed (${response.status})`);
  }
  return response.json();
}

/**
 * @param {object} [options]
 * @returns {string[] | false | null | undefined}
 */
function resolveAlsoSeeTopics(options = {}) {
  if ("alsoSeeTopics" in options) return options.alsoSeeTopics;
  if ("alsoSeeTopics" in APP_CONFIG) return APP_CONFIG.alsoSeeTopics;
  return undefined;
}

/**
 * Wire the footer “also see” dropdown (opens related-app links).
 * No-op when `#footer-also-see` is absent and there is no remote URL to load.
 *
 * When `alsoSeeUrl` is set, fetches that JSON (topics and/or flat links)
 * and replaces the menu (excluding `appUrl`). On failure, keeps the local fallback.
 *
 * @param {ParentNode} [root=document]
 * @param {object} [options]
 * @param {string} [options.alsoSeeUrl]
 * @param {string} [options.appUrl]
 * @param {string[] | false | null} [options.alsoSeeTopics] Topic whitelist
 * @returns {Promise<ReturnType<typeof initPopupMenu> | null>}
 */
export async function initAlsoSee(root = document, options = {}) {
  const alsoSeeUrl =
    typeof options.alsoSeeUrl === "string"
      ? options.alsoSeeUrl.trim()
      : typeof APP_CONFIG.alsoSeeUrl === "string"
        ? APP_CONFIG.alsoSeeUrl.trim()
        : "";
  const appUrl =
    typeof options.appUrl === "string"
      ? options.appUrl.trim()
      : typeof APP_CONFIG.appUrl === "string"
        ? APP_CONFIG.appUrl.trim()
        : "";
  const alsoSeeTopics = resolveAlsoSeeTopics(options);

  let menuApi = wireAlsoSeeMenu(root);

  if (!alsoSeeUrl) return menuApi;

  try {
    const data = await fetchAlsoSeeJson(alsoSeeUrl);
    const sections = normalizeAlsoSee(data, appUrl, alsoSeeTopics);
    if (!alsoSeeHasItems(sections)) {
      menuApi?.destroy?.();
      mountAlsoSee(root, []);
      return null;
    }

    menuApi?.destroy?.();
    mountAlsoSee(root, sections);
    menuApi = wireAlsoSeeMenu(root);
  } catch {
    // Keep local fallback already in the footer host.
  }

  return menuApi;
}
