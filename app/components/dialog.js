import {
  getFocusableElements,
  resolveElements,
  setHidden,
  setPageInert,
  trapTabKey,
} from "../utils/dom.js";
import { onDocumentEscape } from "../utils/document-listeners.js";

export function initDialog({ dialogEl, openTriggers = [], onOpen, onClose }) {
  if (!dialogEl) return null;

  let isOpen = false;
  let previouslyFocused = null;

  const closeElements = dialogEl.querySelectorAll("[data-dialog-close]");
  const triggers = resolveElements(openTriggers);

  function onTrapFocus(e) {
    if (!isOpen) return;
    trapTabKey(e, dialogEl);
  }

  function openDialog() {
    if (isOpen) return;

    previouslyFocused = document.activeElement;
    setHidden(dialogEl, false);
    document.body.classList.add("modal-open");
    setPageInert(true);
    isOpen = true;

    const focusable = getFocusableElements(dialogEl);
    const closeBtn = dialogEl.querySelector(".modal-close");
    const initialFocus =
      focusable.find((el) => el === closeBtn) || focusable[0] || dialogEl;
    initialFocus.focus();

    onOpen?.();
  }

  function closeDialog() {
    if (!isOpen) return;

    setHidden(dialogEl, true);
    document.body.classList.remove("modal-open");
    setPageInert(false);
    isOpen = false;

    if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
      previouslyFocused.focus();
    }

    onClose?.();
  }

  const onTriggerClick = () => openDialog();
  const onCloseClick = () => closeDialog();

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", onTriggerClick);
  });

  closeElements.forEach((el) => {
    el.addEventListener("click", onCloseClick);
  });

  dialogEl.addEventListener("keydown", onTrapFocus);

  const removeEscape = onDocumentEscape(() => {
    if (!isOpen) return false;
    closeDialog();
    return true;
  }, { priority: 100 });

  return {
    openDialog,
    closeDialog,
    isDialogOpen: () => isOpen,
    destroy() {
      removeEscape();
      dialogEl.removeEventListener("keydown", onTrapFocus);
      triggers.forEach((trigger) => {
        trigger.removeEventListener("click", onTriggerClick);
      });
      closeElements.forEach((el) => {
        el.removeEventListener("click", onCloseClick);
      });
      if (isOpen) closeDialog();
    },
  };
}
