/**
 * On/off switch control.
 *
 * Markup:
 *   <div class="toggle" data-toggle-default="false">
 *     <button type="button" class="toggle-btn" role="switch" aria-checked="false">
 *       <span class="toggle-track" aria-hidden="true">
 *         <span class="toggle-thumb">
 *           <span data-icon="check" data-icon-class="toggle-thumb-icon" aria-hidden="true"></span>
 *         </span>
 *       </span>
 *       <span class="toggle-label">Notifications</span>
 *     </button>
 *     <input type="hidden" class="toggle-value" />
 *   </div>
 *
 * data-toggle-default — initial state ("true" / "false", or presence for on)
 * data-toggle-disabled — disable the switch
 */

import { parseBooleanAttr } from "../utils/dom.js";
import { initIcons } from "../utils/icons.js";

function resolveDisabled(toggleEl, disabledOption, toggleBtn) {
  if (typeof disabledOption === "boolean") return disabledOption;
  if (parseBooleanAttr(toggleEl?.dataset.toggleDisabled)) return true;
  return toggleBtn.disabled;
}

function resolveDefaultChecked(toggleEl, defaultCheckedOption) {
  if (typeof defaultCheckedOption === "boolean") return defaultCheckedOption;
  const fromAttr = toggleEl?.dataset.toggleDefault;
  if (fromAttr !== undefined) return parseBooleanAttr(fromAttr) ?? false;
  const hiddenInput = toggleEl.querySelector(".toggle-value");
  if (hiddenInput?.value === "true") return true;
  if (hiddenInput?.value === "false") return false;
  const btn = toggleEl.querySelector(".toggle-btn");
  return btn?.getAttribute("aria-checked") === "true";
}

export function initToggle(
  toggleEl,
  { defaultChecked, disabled, onChange } = {}
) {
  if (!toggleEl) return null;

  const toggleBtn = toggleEl.querySelector(".toggle-btn");
  const hiddenInput = toggleEl.querySelector(".toggle-value");

  if (!toggleBtn || toggleBtn.getAttribute("role") !== "switch") return null;

  let isChecked = resolveDefaultChecked(toggleEl, defaultChecked);
  let isDisabled = resolveDisabled(toggleEl, disabled, toggleBtn);

  function syncDom({ emit = true, source = "init" } = {}) {
    toggleBtn.setAttribute("aria-checked", isChecked ? "true" : "false");
    toggleEl.classList.toggle("is-on", isChecked);
    toggleBtn.disabled = isDisabled;
    toggleEl.classList.toggle("toggle--disabled", isDisabled);

    if (hiddenInput) {
      hiddenInput.value = isChecked ? "true" : "false";
    }

    if (emit) {
      onChange?.({
        toggleEl,
        checked: isChecked,
        source,
      });
    }
  }

  function setChecked(nextChecked, { emit = true, source = "api" } = {}) {
    const next = Boolean(nextChecked);
    if (next === isChecked) {
      syncDom({ emit: false });
      return;
    }
    isChecked = next;
    syncDom({ emit, source });
  }

  function applyDisabled(nextDisabled) {
    isDisabled = Boolean(nextDisabled);
    syncDom({ emit: false });
  }

  toggleBtn.addEventListener("click", () => {
    if (isDisabled) return;
    setChecked(!isChecked, { source: "click" });
  });

  syncDom({ emit: Boolean(onChange) });
  initIcons(toggleEl);

  return {
    getChecked() {
      return isChecked;
    },
    setChecked(checked) {
      setChecked(checked);
    },
    toggle() {
      setChecked(!isChecked, { source: "api" });
    },
    setDisabled(nextDisabled) {
      applyDisabled(nextDisabled);
    },
    isDisabled() {
      return isDisabled;
    },
  };
}

/** Wire every `.toggle` block in `root`. */
export function initToggles(root = document) {
  const instances = [];
  root.querySelectorAll(".toggle").forEach((toggleEl) => {
    const instance = initToggle(toggleEl);
    if (instance) instances.push(instance);
  });
  return instances;
}
