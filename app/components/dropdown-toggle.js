import { initPopupMenu } from "../utils/menu.js";

function isItemSelected(item) {
  return item.getAttribute("aria-checked") === "true";
}

function setItemSelected(item, selected) {
  item.setAttribute("aria-checked", selected ? "true" : "false");
  item.classList.toggle("is-selected", selected);
}

function getMenuItems(menu, itemSelector) {
  return [...menu.querySelectorAll(itemSelector)];
}

function getSelectedItems(menu, itemSelector) {
  return getMenuItems(menu, itemSelector).filter(isItemSelected);
}

function readBaseLabel(dropdownEl, trigger) {
  const fromData = dropdownEl.dataset.toggleDropdownLabel?.trim();
  if (fromData) return fromData;

  const labelEl = trigger?.querySelector(".dropdown-trigger-label");
  if (labelEl) return labelEl.textContent.trim();

  if (!trigger) return "";

  const clone = trigger.cloneNode(true);
  clone.querySelector(".combo-btn-chevron")?.remove();
  return clone.textContent.replace(/\s+/g, " ").trim();
}

function ensureTriggerLabelEl(trigger, baseLabel) {
  let labelEl = trigger.querySelector(".dropdown-trigger-label");
  if (labelEl) return labelEl;

  labelEl = document.createElement("span");
  labelEl.className = "dropdown-trigger-label";
  labelEl.textContent = baseLabel;

  const chevron = trigger.querySelector(".combo-btn-chevron");
  if (chevron) {
    while (trigger.firstChild && trigger.firstChild !== chevron) {
      trigger.removeChild(trigger.firstChild);
    }
    trigger.insertBefore(labelEl, chevron);
  } else {
    trigger.prepend(labelEl);
  }

  return labelEl;
}

function formatTriggerLabel(baseLabel, count) {
  return count > 0 ? `${baseLabel} (${count})` : baseLabel;
}

/**
 * Dropdown menu where each item toggles on/off; menu stays open until dismissed.
 *
 * Markup: same as {@link initDropdown} but use `role="menuitemcheckbox"` and
 * `aria-checked="true|false"` on each `.dropdown-menu-item`.
 *
 * The trigger label shows a count when items are selected, e.g. `Toggle items (3)`.
 * Set the base text via `.dropdown-trigger-label` or `data-toggle-dropdown-label`.
 *
 * @param {HTMLElement | null} dropdownEl
 * @param {{ onToggle?: (detail: object) => void }} [options]
 */
export function initToggleDropdown(dropdownEl, { onToggle } = {}) {
  if (!dropdownEl) return null;

  const trigger = dropdownEl.querySelector(".dropdown-trigger");
  const menu = dropdownEl.querySelector(".dropdown-menu");
  const itemSelector = ".dropdown-menu-item";

  if (!menu || !trigger) return null;

  const baseLabel = readBaseLabel(dropdownEl, trigger);
  const labelEl = ensureTriggerLabelEl(trigger, baseLabel);

  function updateTriggerLabel() {
    const count = getSelectedItems(menu, itemSelector).length;
    labelEl.textContent = formatTriggerLabel(baseLabel, count);
  }

  for (const item of getMenuItems(menu, itemSelector)) {
    setItemSelected(item, isItemSelected(item));
  }
  updateTriggerLabel();

  const menuControl = initPopupMenu({
    containerEl: dropdownEl,
    menuEl: menu,
    toggleEl: trigger,
    itemSelector,
    closeOnSelect: false,
    onSelect: ({ item, value, label }) => {
      const selected = !isItemSelected(item);
      setItemSelected(item, selected);

      const selectedItems = getSelectedItems(menu, itemSelector);
      updateTriggerLabel();

      onToggle?.({
        dropdownEl,
        item,
        value,
        label,
        selected,
        values: selectedItems.map((el) => el.dataset.value).filter(Boolean),
        labels: selectedItems.map((el) => el.textContent.trim()),
      });
    },
  });

  if (!menuControl) return null;

  return {
    ...menuControl,
    getSelected() {
      return getSelectedItems(menu, itemSelector).map((item) => ({
        value: item.dataset.value,
        label: item.textContent.trim(),
        item,
      }));
    },
    setSelected(values) {
      const valueSet = new Set(values);
      for (const item of getMenuItems(menu, itemSelector)) {
        const value = item.dataset.value;
        setItemSelected(item, valueSet.has(value));
      }
      updateTriggerLabel();
    },
  };
}
