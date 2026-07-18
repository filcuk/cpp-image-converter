/** @typedef {{ handler: (event: Event) => boolean | void, priority: number }} EscapeEntry */

const clickOutsideHandlers = new Set();
/** @type {EscapeEntry[]} */
const escapeHandlers = [];
let bound = false;

function ensureBound() {
  if (bound) return;
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);
  bound = true;
}

function onDocumentClick(event) {
  for (const handler of clickOutsideHandlers) {
    handler(event);
  }
}

function onDocumentKeydown(event) {
  if (event.key !== "Escape") return;

  const ordered = [...escapeHandlers].sort((a, b) => b.priority - a.priority);
  for (const { handler } of ordered) {
    if (handler(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
}

/** Register a document click handler (e.g. close menus on outside click). */
export function onDocumentClickOutside(handler) {
  ensureBound();
  clickOutsideHandlers.add(handler);
  return () => clickOutsideHandlers.delete(handler);
}

/**
 * Register an Escape handler. Return true when the event is handled.
 * Higher priority runs first (dialogs before menus).
 */
export function onDocumentEscape(handler, { priority = 0 } = {}) {
  ensureBound();
  const entry = { handler, priority };
  escapeHandlers.push(entry);
  return () => {
    const index = escapeHandlers.indexOf(entry);
    if (index >= 0) escapeHandlers.splice(index, 1);
  };
}
