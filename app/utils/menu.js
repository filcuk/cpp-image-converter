import { setHidden } from "./dom.js";
import { onDocumentClickOutside, onDocumentEscape } from "./document-listeners.js";

/**
 * Shared open/close behaviour for anchored popup menus (combo chevron, dropdown).
 */
export function initPopupMenu({
  containerEl,
  menuEl,
  toggleEl,
  itemSelector,
  onSelect,
  closeOnSelect = true,
}) {
  if (!containerEl || !menuEl) return null;

  let isOpen = false;

  function getItems() {
    return [...menuEl.querySelectorAll(itemSelector)].filter(
      (item) => !item.disabled && item.offsetParent !== null
    );
  }

  function focusItem(item) {
    if (item instanceof HTMLElement) item.focus();
  }

  function focusFirstItem() {
    const items = getItems();
    if (items.length) focusItem(items[0]);
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    setHidden(menuEl, true);
    toggleEl?.setAttribute("aria-expanded", "false");
    toggleEl?.focus();
  }

  function openMenu() {
    isOpen = true;
    setHidden(menuEl, false);
    toggleEl?.setAttribute("aria-expanded", "true");
    focusFirstItem();
  }

  function toggleMenu() {
    if (isOpen) closeMenu();
    else openMenu();
  }

  function activateItem(item) {
    if (closeOnSelect) closeMenu();
    onSelect?.({
      containerEl,
      item,
      value: item.dataset.value,
      label: item.textContent.trim(),
    });
  }

  function onToggleClick(e) {
    e.stopPropagation();
    toggleMenu();
  }

  function onMenuClick(e) {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    activateItem(item);
  }

  function onMenuKeydown(e) {
    if (!isOpen) return;

    const items = getItems();
    if (!items.length) return;

    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex = currentIndex;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      focusItem(items[nextIndex]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex =
        currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      focusItem(items[nextIndex]);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(items[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(items[items.length - 1]);
    } else if (e.key === "Enter" || e.key === " ") {
      const item = document.activeElement?.closest?.(itemSelector);
      if (!item || !menuEl.contains(item)) return;
      e.preventDefault();
      activateItem(item);
    }
  }

  toggleEl?.addEventListener("click", onToggleClick);
  menuEl.addEventListener("click", onMenuClick);
  menuEl.addEventListener("keydown", onMenuKeydown);

  const removeClickOutside = onDocumentClickOutside((e) => {
    if (!containerEl.contains(e.target)) closeMenu();
  });

  const removeEscape = onDocumentEscape(() => {
    if (!isOpen) return false;
    closeMenu();
    return true;
  }, { priority: 50 });

  return {
    closeMenu,
    openMenu,
    toggleMenu,
    isOpen: () => isOpen,
    destroy() {
      toggleEl?.removeEventListener("click", onToggleClick);
      menuEl.removeEventListener("click", onMenuClick);
      menuEl.removeEventListener("keydown", onMenuKeydown);
      removeClickOutside();
      removeEscape();
    },
  };
}
