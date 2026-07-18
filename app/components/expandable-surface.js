import { mountIcon } from "../utils/icons.js";
import { setHidden, setPageInert, trapTabKey } from "../utils/dom.js";
import { onDocumentEscape } from "../utils/document-listeners.js";
import { closeTooltip } from "./tooltip.js";

const EXPAND_LABEL = "Maximise";
const COLLAPSE_LABEL = "Minimise";
const EXPAND_ICON = "fullscreen";
const COLLAPSE_ICON = "fullscreen-exit";

/** @type {HTMLElement | null} */
let overlayEl = null;
/** @type {HTMLElement | null} */
let stageEl = null;
/** @type {ExpandSession | null} */
let activeSession = null;

function onOverlayKeydown(event) {
  if (!activeSession || !overlayEl) return;
  trapTabKey(event, overlayEl);
}

/**
 * @typedef {{
 *   surface: HTMLElement,
 *   placeholder: Comment,
 *   expandBtn: HTMLButtonElement,
 *   label: string,
 *   previouslyFocused: Element | null,
 * }} ExpandSession
 */

function ensureOverlay() {
  if (overlayEl) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "expandable-surface-overlay";
  overlayEl.className = "expandable-overlay hidden";
  overlayEl.setAttribute("role", "dialog");
  overlayEl.setAttribute("aria-modal", "true");
  overlayEl.tabIndex = -1;
  overlayEl.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "expandable-overlay__backdrop";
  backdrop.dataset.expandableSurfaceClose = "";

  stageEl = document.createElement("div");
  stageEl.className = "expandable-overlay__stage";

  overlayEl.append(backdrop, stageEl);
  document.body.appendChild(overlayEl);

  backdrop.addEventListener("click", closeActive);
  overlayEl.addEventListener("keydown", onOverlayKeydown);

  onDocumentEscape(() => {
    if (!activeSession) return false;
    closeActive();
    return true;
  }, { priority: 90 });
}

function setExpandButtonState(btn, expanded) {
  const label = expanded ? COLLAPSE_LABEL : EXPAND_LABEL;
  btn.dataset.tooltip = label;
  btn.setAttribute("aria-label", label);
  btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  mountIcon(btn, expanded ? COLLAPSE_ICON : EXPAND_ICON, {
    className: "btn-icon-svg expandable-surface__expand-icon",
    replace: true,
  });
}

/**
 * @param {ExpandSession} session
 */
function openSurface(session) {
  ensureOverlay();
  if (!stageEl || !overlayEl) return;

  const { surface, placeholder, expandBtn, label } = session;
  if (!surface.parentNode) return;

  surface.parentNode.insertBefore(placeholder, surface);
  stageEl.appendChild(surface);

  session.previouslyFocused = document.activeElement;
  activeSession = session;

  surface.classList.add("is-expanded");
  setExpandButtonState(expandBtn, true);

  overlayEl.setAttribute("aria-label", label);
  setHidden(overlayEl, false);
  document.body.classList.add("expandable-surface-open");
  setPageInert(true);

  overlayEl.focus({ preventScroll: true });
  closeTooltip();
}

function closeActive() {
  if (!activeSession || !overlayEl) return;

  const { surface, placeholder, expandBtn, previouslyFocused } = activeSession;
  const parent = placeholder.parentNode;

  if (parent) {
    parent.insertBefore(surface, placeholder);
    placeholder.remove();
  }

  surface.classList.remove("is-expanded");
  setExpandButtonState(expandBtn, false);

  setHidden(overlayEl, true);
  document.body.classList.remove("expandable-surface-open");
  setPageInert(false);

  if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
    previouslyFocused.focus();
  }

  closeTooltip();
  activeSession = null;
}

/**
 * Add a hover-revealed maximise control; expands the surface into an overlay
 * capped to the page body width (`--page-width`).
 *
 * Markup:
 *   <div class="code-block" data-expandable-surface data-expandable-surface-label="Code sample">
 *     <div class="code-block-body" data-expandable-surface-trigger>…</div>
 *   </div>
 *
 * `data-expandable-surface` — element moved into the overlay when expanded.
 * `data-expandable-surface-trigger` — optional child that hosts the button (defaults to surface).
 * `data-expandable-surface-label` — accessible name for the overlay dialog.
 *
 * @param {HTMLElement} surface
 */
export function initExpandableSurface(surface) {
  if (!(surface instanceof HTMLElement)) return null;
  if (surface.dataset.expandableSurfaceInit !== undefined) return null;

  surface.dataset.expandableSurfaceInit = "";
  surface.classList.add("expandable-surface");

  const trigger =
    surface.querySelector("[data-expandable-surface-trigger]") ?? surface;
  const label = surface.dataset.expandableSurfaceLabel ?? "Expanded content";

  trigger.classList.add("expandable-surface-trigger");

  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "expandable-surface__expand btn btn-icon";
  expandBtn.dataset.tooltipPosition = "top";
  setExpandButtonState(expandBtn, false);

  const copyBtn = trigger.querySelector(".code-block-copy");
  if (copyBtn) {
    let actionsHost = trigger.querySelector(".surface-actions");
    if (!actionsHost) {
      actionsHost = document.createElement("div");
      actionsHost.className = "surface-actions";
      copyBtn.parentNode?.insertBefore(actionsHost, copyBtn);
      actionsHost.appendChild(copyBtn);
    }
    actionsHost.prepend(expandBtn);
  } else {
    trigger.appendChild(expandBtn);
  }

  /** @type {ExpandSession} */
  const session = {
    surface,
    placeholder: document.createComment("expandable-surface-placeholder"),
    expandBtn,
    label,
    previouslyFocused: null,
  };

  expandBtn.addEventListener("click", () => {
    if (activeSession === session) {
      closeActive();
      return;
    }

    if (activeSession) {
      closeActive();
    }

    openSurface(session);
  });

  return {
    open() {
      if (activeSession === session) return;
      if (activeSession) closeActive();
      openSurface(session);
    },
    close() {
      if (activeSession === session) closeActive();
    },
    destroy() {
      if (activeSession === session) closeActive();
      expandBtn.remove();
      trigger.classList.remove("expandable-surface-trigger");
      surface.classList.remove("expandable-surface");
      delete surface.dataset.expandableSurfaceInit;
    },
  };
}

/** Wire every `[data-expandable-surface]` in `root`. */
export function initExpandableSurfaces(root = document) {
  const instances = [];
  for (const surface of root.querySelectorAll("[data-expandable-surface]")) {
    if (!(surface instanceof HTMLElement)) continue;
    const instance = initExpandableSurface(surface);
    if (instance) instances.push(instance);
  }
  return instances;
}
