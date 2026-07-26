/**
 * Optional sticky site header and section headings.
 *
 * Opt in with attributes on `<html>`:
 *   data-sticky-header
 *   data-sticky-section-headings
 *
 * Or call setStickyHeader() / setStickySectionHeadings().
 * syncStickyOffsets() keeps --sticky-header-offset in sync so section
 * headings clear a stuck site header (remeasured on scroll), and toggles
 * data-sticky-header-stuck for cover strips under the pinned site header.
 *
 * `.demo-tier-header` and `.section-heading` share one sticky slot. Subheadings
 * in sibling `.demo-section`s push each other out natively. Tier headers are
 * pushed out by the first `.section-heading` in that tier (JS adjusts `top`).
 */

function rootEl() {
  return document.documentElement;
}

/** Resolve `--sticky-gap` to CSS pixels. */
function stickyGapPx(root) {
  const raw = getComputedStyle(root).getPropertyValue("--sticky-gap").trim();
  if (!raw) return 0;
  if (raw.endsWith("px")) return parseFloat(raw) || 0;
  if (raw.endsWith("rem")) {
    const fontSize = parseFloat(getComputedStyle(root).fontSize) || 16;
    return (parseFloat(raw) || 0) * fontSize;
  }
  return parseFloat(raw) || 0;
}

/**
 * Site header is at the document top, so `top: sticky-gap` would engage at
 * scroll 0. Stick flush (`top: 0`); toggle `data-sticky-header-stuck` so cover
 * strips only paint once the header is actually pinned.
 */
function syncStickyHeaderStuck(root) {
  const header =
    root.hasAttribute("data-sticky-header") &&
    document.querySelector("body > header");
  const stuck =
    Boolean(header) &&
    window.scrollY > 0 &&
    header.getBoundingClientRect().top <= 0.5;
  root.toggleAttribute("data-sticky-header-stuck", stuck);
}

/**
 * Live clearance below the site header chrome (border box + below gap).
 * Remeasured on scroll because the header moves between in-flow and stuck.
 */
function measureStickyHeaderOffset(root) {
  if (!root.hasAttribute("data-sticky-header")) return 0;
  const siteHeader = document.querySelector("body > header");
  if (!siteHeader) return 0;
  const gap = stickyGapPx(root);
  return Math.max(0, siteHeader.getBoundingClientRect().bottom + gap);
}

/** Sticky `top` used by section / tier headings, in CSS pixels. */
function sectionStickY(root) {
  const headerOffset =
    parseFloat(root.style.getPropertyValue("--sticky-header-offset")) || 0;
  return Math.max(headerOffset, stickyGapPx(root));
}

function clearTierHeaderPush() {
  document.querySelectorAll(".demo-tier-header").forEach((el) => {
    el.style.top = "";
  });
}

/**
 * Measure sticky chrome and publish CSS offset variables.
 * Safe to call when stickiness is off (offsets reset to 0).
 */
export function syncStickyOffsets() {
  const root = rootEl();
  syncStickyHeaderStuck(root);
  const headerOffset = measureStickyHeaderOffset(root);
  const next = `${Math.round(headerOffset)}px`;
  if (root.style.getPropertyValue("--sticky-header-offset") !== next) {
    root.style.setProperty("--sticky-header-offset", next);
  }
  syncStickyHeadingStack();
}

/**
 * Push each tier header out of the sticky slot as its first subheading arrives.
 * Subheading-to-subheading handoff is native sticky (sibling sections).
 */
export function syncStickyHeadingStack() {
  const root = rootEl();

  if (!root.hasAttribute("data-sticky-section-headings")) {
    clearTierHeaderPush();
    return;
  }

  const stickY = sectionStickY(root);

  document.querySelectorAll(".demo-tier-header").forEach((tierHeader) => {
    const tier = tierHeader.closest(".demo-tier");
    const sub = tier?.querySelector(".section-heading");
    if (!sub) {
      tierHeader.style.top = "";
      return;
    }

    const height = tierHeader.offsetHeight;
    const subTop = sub.getBoundingClientRect().top;
    const overlap = stickY + height - subTop;
    if (overlap <= 0) {
      tierHeader.style.top = "";
      return;
    }

    const push = Math.min(overlap, height);
    tierHeader.style.top = `${Math.round(stickY - push)}px`;
  });
}

/** @param {boolean} enabled */
export function setStickyHeader(enabled) {
  rootEl().toggleAttribute("data-sticky-header", Boolean(enabled));
  requestAnimationFrame(syncStickyOffsets);
}

/** @param {boolean} enabled */
export function setStickySectionHeadings(enabled) {
  rootEl().toggleAttribute("data-sticky-section-headings", Boolean(enabled));
  requestAnimationFrame(syncStickyOffsets);
}

/** @returns {boolean} */
export function isStickyHeader() {
  return rootEl().hasAttribute("data-sticky-header");
}

/** @returns {boolean} */
export function isStickySectionHeadings() {
  return rootEl().hasAttribute("data-sticky-section-headings");
}

let listenersBound = false;

/**
 * Sync offsets now and on resize/scroll. Call once from `initShell()`.
 */
export function initStickyChrome() {
  syncStickyOffsets();
  if (listenersBound) return;
  listenersBound = true;
  window.addEventListener("resize", syncStickyOffsets);
  window.addEventListener("scroll", syncStickyOffsets, { passive: true });
}
