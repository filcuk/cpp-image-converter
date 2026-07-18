import { setHidden } from "../utils/dom.js";
import { onDocumentClickOutside, onDocumentEscape } from "../utils/document-listeners.js";

/**
 * Text input with a filterable suggestion list.
 *
 * Markup:
 *   <div class="combobox" id="my-combobox">
 *     <label class="field-label" for="my-combobox-input">Label</label>
 *     <div class="combobox-control">
 *       <input type="text" id="my-combobox-input" class="input combobox-input"
 *         role="combobox" aria-expanded="false" aria-autocomplete="list"
 *         aria-controls="my-combobox-list" autocomplete="off" />
 *       <ul id="my-combobox-list" class="combobox-list hidden" role="listbox" hidden>
 *         <li role="presentation">
 *           <button type="button" class="combobox-option" role="option" data-value="alpha">Alpha</button>
 *         </li>
 *       </ul>
 *     </div>
 *   </div>
 *
 * data-combobox-allow-custom — accept free text on blur (default: list values only)
 */

function readOptionsFromMarkup(listEl) {
  if (!listEl) return [];

  return [...listEl.querySelectorAll(".combobox-option")].map((optionEl) => ({
    value: optionEl.dataset.value ?? optionEl.textContent.trim(),
    label: optionEl.textContent.trim(),
    element: optionEl,
    itemEl: optionEl.closest("li"),
  }));
}

function buildOptionElement({ value, label }, listId, index) {
  const item = document.createElement("li");
  item.setAttribute("role", "presentation");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "combobox-option";
  button.setAttribute("role", "option");
  button.dataset.value = value;
  button.id = `${listId}-option-${index}`;
  button.textContent = label;

  item.append(button);
  return { value, label, element: button, itemEl: item };
}

function defaultFilter(query, option) {
  if (!query) return true;
  const haystack = `${option.label} ${option.value}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function findOptionByLabel(options, text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return (
    options.find((option) => option.label.toLowerCase() === lower) ||
    options.find((option) => String(option.value).toLowerCase() === lower) ||
    null
  );
}

export function initCombobox(
  comboboxEl,
  { options, filter, allowCustom, defaultValue, onSelect, onChange, onInput } = {}
) {
  if (!comboboxEl) return null;

  const input = comboboxEl.querySelector(".combobox-input");
  const list = comboboxEl.querySelector(".combobox-list");
  const valueInput = comboboxEl.querySelector(".combobox-value");

  if (!input || !list) return null;

  const listId = list.id || `combobox-list-${Math.random().toString(36).slice(2, 9)}`;
  if (!list.id) list.id = listId;
  input.setAttribute("aria-controls", listId);

  const allowFreeText =
    allowCustom ??
    (comboboxEl.hasAttribute("data-combobox-allow-custom") ||
      comboboxEl.dataset.comboboxAllowCustom === "true");

  const matchOption =
    typeof filter === "function"
      ? (query, option) => filter(query, option)
      : defaultFilter;

  let optionRecords = [];

  function applyOptions(nextOptions) {
    list.replaceChildren();
    emptyEl = null;
    optionRecords = nextOptions.map((option, index) => {
      const record = buildOptionElement(option, listId, index);
      list.append(record.itemEl);
      return record;
    });
  }

  if (Array.isArray(options) && options.length) {
    applyOptions(options);
  } else {
    optionRecords = readOptionsFromMarkup(list).map((record, index) => {
      if (!record.element.id) {
        record.element.id = `${listId}-option-${index}`;
      }
      return record;
    });
  }

  let selectedValue = defaultValue ?? valueInput?.value ?? "";
  let selectedLabel = "";
  let isOpen = false;
  let activeIndex = -1;
  let emptyEl = list.querySelector(".combobox-empty");

  function syncSelectedLabel() {
    const match = optionRecords.find((option) => option.value === selectedValue);
    selectedLabel = match?.label ?? (allowFreeText ? selectedValue : "");
  }

  syncSelectedLabel();

  function emitChange(extra = {}) {
    onChange?.({
      comboboxEl,
      value: selectedValue,
      label: selectedLabel || input.value.trim(),
      input: input.value,
      ...extra,
    });
  }

  function setValueInput(value) {
    if (valueInput) valueInput.value = value;
  }

  function getVisibleOptions() {
    const query = input.value.trim();
    return optionRecords.filter((option) => matchOption(query, option));
  }

  function clearActiveOption() {
    for (const option of optionRecords) {
      option.element.classList.remove("is-active");
      option.element.removeAttribute("aria-selected");
    }
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");
  }

  function setActiveOption(index) {
    const visible = getVisibleOptions();
    clearActiveOption();
    if (!visible.length) return;

    const clamped = Math.max(0, Math.min(index, visible.length - 1));
    const option = visible[clamped];
    activeIndex = optionRecords.indexOf(option);
    option.element.classList.add("is-active");
    option.element.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", option.element.id);
    option.element.scrollIntoView({ block: "nearest" });
  }

  function ensureEmptyState(visibleCount) {
    if (visibleCount > 0) {
      if (emptyEl) setHidden(emptyEl, true);
      return;
    }

    if (!emptyEl) {
      emptyEl = document.createElement("li");
      emptyEl.className = "combobox-empty";
      emptyEl.setAttribute("role", "presentation");
      emptyEl.textContent = "No matches";
      list.append(emptyEl);
    } else if (!emptyEl.parentElement) {
      list.append(emptyEl);
    }

    setHidden(emptyEl, false);
  }

  function renderList() {
    const query = input.value.trim();
    const visible = getVisibleOptions();
    const visibleSet = new Set(visible);

    for (const option of optionRecords) {
      const show = visibleSet.has(option);
      setHidden(option.itemEl ?? option.element.closest("li"), !show);
      option.element.classList.toggle("is-selected", option.value === selectedValue);
      option.element.setAttribute("aria-selected", option.value === selectedValue ? "true" : "false");
    }

    ensureEmptyState(visible.length);

    if (isOpen && visible.length) {
      const current = activeIndex >= 0 ? optionRecords[activeIndex] : null;
      if (current && visibleSet.has(current)) {
        setActiveOption(visible.indexOf(current));
      } else {
        setActiveOption(0);
      }
    } else {
      clearActiveOption();
    }

    onInput?.({ comboboxEl, query, matches: visible.map(({ value, label }) => ({ value, label })) });
  }

  function openList() {
    if (isOpen) {
      renderList();
      return;
    }

    isOpen = true;
    setHidden(list, false);
    input.setAttribute("aria-expanded", "true");
    renderList();
  }

  function closeList({ restoreInput = false } = {}) {
    if (!isOpen && !restoreInput) return;

    isOpen = false;
    setHidden(list, true);
    input.setAttribute("aria-expanded", "false");
    clearActiveOption();

    if (restoreInput) {
      input.value = selectedLabel;
    }
  }

  function selectOption(option, { close = true } = {}) {
    if (!option) return;

    selectedValue = option.value;
    selectedLabel = option.label;
    input.value = option.label;
    setValueInput(selectedValue);
    input.removeAttribute("aria-invalid");

    onSelect?.({
      comboboxEl,
      value: option.value,
      label: option.label,
      option: option.element,
    });
    emitChange({ selected: true });

    if (close) closeList();
  }

  function commitInput({ close = true } = {}) {
    const text = input.value.trim();

    if (!text) {
      selectedValue = "";
      selectedLabel = "";
      setValueInput("");
      input.removeAttribute("aria-invalid");
      emitChange({ committed: true });
      if (close) closeList();
      return true;
    }

    const matched = findOptionByLabel(optionRecords, text);
    if (matched) {
      selectOption(matched, { close });
      return true;
    }

    if (allowFreeText) {
      selectedValue = text;
      selectedLabel = text;
      setValueInput(text);
      input.removeAttribute("aria-invalid");
      emitChange({ committed: true, custom: true });
      if (close) closeList();
      return true;
    }

    input.value = selectedLabel;
    input.setAttribute("aria-invalid", "true");
    emitChange({ committed: true, valid: false });
    if (close) closeList();
    return false;
  }

  function onInputEvent() {
    openList();
  }

  function onInputFocus() {
    input.removeAttribute("aria-invalid");
    openList();
  }

  function onInputBlur(event) {
    const next = event.relatedTarget;
    if (next && comboboxEl.contains(next)) return;
    commitInput();
  }

  function onInputKeydown(event) {
    const visible = getVisibleOptions();

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      if (!visible.length) return;
      const currentVisibleIndex = visible.findIndex((option) => optionRecords.indexOf(option) === activeIndex);
      setActiveOption(currentVisibleIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen || !visible.length) return;
      const currentVisibleIndex = visible.findIndex((option) => optionRecords.indexOf(option) === activeIndex);
      setActiveOption(currentVisibleIndex <= 0 ? visible.length - 1 : currentVisibleIndex - 1);
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen) return;
      event.preventDefault();
      if (activeIndex >= 0 && optionRecords[activeIndex]) {
        selectOption(optionRecords[activeIndex]);
        return;
      }
      commitInput();
      return;
    }

    if (event.key === "Escape") {
      if (!isOpen) return;
      event.preventDefault();
      closeList({ restoreInput: true });
    }
  }

  function onListClick(event) {
    const optionEl = event.target.closest(".combobox-option");
    if (!optionEl) return;
    const record = optionRecords.find((option) => option.element === optionEl);
    selectOption(record);
    input.focus();
  }

  function onListPointerDown(event) {
    if (event.target.closest(".combobox-option")) {
      event.preventDefault();
    }
  }

  input.addEventListener("input", onInputEvent);
  input.addEventListener("focus", onInputFocus);
  input.addEventListener("blur", onInputBlur);
  input.addEventListener("keydown", onInputKeydown);
  list.addEventListener("click", onListClick);
  list.addEventListener("mousedown", onListPointerDown);

  const removeClickOutside = onDocumentClickOutside((event) => {
    if (!comboboxEl.contains(event.target)) {
      commitInput();
      closeList();
    }
  });

  const removeEscape = onDocumentEscape(() => {
    if (!isOpen) return false;
    closeList({ restoreInput: true });
    return true;
  }, { priority: 50 });

  if (selectedValue) {
    const match = optionRecords.find((option) => option.value === selectedValue);
    if (match) {
      input.value = match.label;
      setValueInput(selectedValue);
    } else if (allowFreeText) {
      input.value = selectedValue;
      selectedLabel = selectedValue;
      setValueInput(selectedValue);
    }
  }

  renderList();
  emitChange();

  return {
    openList,
    closeList,
    commitInput,
    getValue() {
      return selectedValue;
    },
    getLabel() {
      return selectedLabel || input.value.trim();
    },
    setValue(value) {
      const match = optionRecords.find((option) => option.value === value);
      if (match) {
        selectOption(match, { close: false });
        renderList();
        return;
      }

      if (allowFreeText && value) {
        selectedValue = value;
        selectedLabel = value;
        input.value = value;
        setValueInput(value);
        renderList();
        emitChange();
        return;
      }

      selectedValue = "";
      selectedLabel = "";
      input.value = "";
      setValueInput("");
      renderList();
      emitChange();
    },
    setOptions(nextOptions) {
      const previousValue = selectedValue;
      applyOptions(nextOptions);
      syncSelectedLabel();
      if (previousValue) {
        const match = optionRecords.find((option) => option.value === previousValue);
        if (match) {
          input.value = match.label;
        }
      }
      renderList();
    },
    destroy() {
      input.removeEventListener("input", onInputEvent);
      input.removeEventListener("focus", onInputFocus);
      input.removeEventListener("blur", onInputBlur);
      input.removeEventListener("keydown", onInputKeydown);
      list.removeEventListener("click", onListClick);
      list.removeEventListener("mousedown", onListPointerDown);
      removeClickOutside();
      removeEscape();
    },
  };
}

/** Wire every `.combobox` block in `root`. */
export function initComboboxes(root = document) {
  const instances = [];
  root.querySelectorAll(".combobox").forEach((comboboxEl) => {
    const instance = initCombobox(comboboxEl);
    if (instance) instances.push(instance);
  });
  return instances;
}
