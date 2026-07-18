import { setHidden, prefersReducedMotion } from "../utils/dom.js";

/** @type {WeakMap<HTMLElement, ReturnType<typeof setTimeout>>} */
const expireTimers = new WeakMap();

const EXPIRE_OVERLAY_CLASS = "banner-expire";

function readBannerFadeMs() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--banner-fade-ms")
    .trim();
  const ms = Number.parseFloat(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : 200;
}

const BANNER_FADE_MS = readBannerFadeMs();

function parseExpireMs(value) {
  if (value === undefined || value === "") return 0;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

function resolveExpireMs(bannerEl, expire) {
  if (expire !== undefined) return parseExpireMs(expire);
  return parseExpireMs(bannerEl.dataset.bannerExpire);
}

function ensureExpireOverlay(bannerEl) {
  let overlay = bannerEl.querySelector(`.${EXPIRE_OVERLAY_CLASS}`);
  if (overlay) return overlay;

  overlay = document.createElement("span");
  overlay.className = EXPIRE_OVERLAY_CLASS;
  overlay.setAttribute("aria-hidden", "true");
  bannerEl.prepend(overlay);
  return overlay;
}

function clearExpireProgress(bannerEl) {
  bannerEl.classList.remove("banner-is-expiring");
  bannerEl.style.removeProperty("--banner-expire-ms");
}

function startExpireProgress(bannerEl, ms) {
  ensureExpireOverlay(bannerEl);
  clearExpireProgress(bannerEl);
  bannerEl.style.setProperty("--banner-expire-ms", `${ms}ms`);

  if (prefersReducedMotion()) return;

  void bannerEl.offsetWidth;
  requestAnimationFrame(() => {
    bannerEl.classList.add("banner-is-expiring");
  });
}

function clearExpireTimer(bannerEl) {
  const timerId = expireTimers.get(bannerEl);
  if (timerId !== undefined) {
    clearTimeout(timerId);
    expireTimers.delete(bannerEl);
  }
  clearExpireProgress(bannerEl);
}

function resetBannerVisualState(bannerEl) {
  bannerEl.classList.remove("banner-is-hiding");
  bannerEl.style.removeProperty("opacity");
}

function fadeOutBanner(bannerEl) {
  expireTimers.delete(bannerEl);
  clearExpireProgress(bannerEl);

  if (prefersReducedMotion()) {
    hideBanner(bannerEl);
    return;
  }

  bannerEl.classList.add("banner-is-hiding");

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    bannerEl.removeEventListener("animationend", onAnimationEnd);
    hideBanner(bannerEl);
  };

  const onAnimationEnd = (event) => {
    if (event.target !== bannerEl) return;
    finish();
  };

  bannerEl.addEventListener("animationend", onAnimationEnd);
  window.setTimeout(finish, BANNER_FADE_MS + 50);
}

/** Hide a banner and cancel any pending expiry. */
export function hideBanner(bannerEl) {
  if (!bannerEl) return;
  clearExpireTimer(bannerEl);
  resetBannerVisualState(bannerEl);
  setHidden(bannerEl, true);
}

/**
 * Show a banner. Auto-hides when `expire` is set (ms) or `data-banner-expire` is on the element.
 *
 * @param {HTMLElement | null} bannerEl
 * @param {{ expire?: number | string }} [options]
 */
export function showBanner(bannerEl, { expire } = {}) {
  if (!bannerEl) return;

  clearExpireTimer(bannerEl);
  resetBannerVisualState(bannerEl);
  setHidden(bannerEl, false);

  const ms = resolveExpireMs(bannerEl, expire);
  if (ms <= 0) return;

  startExpireProgress(bannerEl, ms);

  expireTimers.set(
    bannerEl,
    setTimeout(() => fadeOutBanner(bannerEl), ms)
  );
}
