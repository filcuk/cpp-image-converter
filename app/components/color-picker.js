/**
 * Hex colour input with an inline swatch preview.
 *
 * Markup:
 *   <div class="color-picker" data-color-picker-default="#0969da">
 *     <label class="field-label" for="my-color-input">Colour</label>
 *     <div class="color-picker-control">
 *       <input type="text" id="my-color-input" class="input color-picker-input"
 *         autocomplete="off" spellcheck="false" aria-label="Hex colour" />
 *       <span class="color-picker-swatch" aria-hidden="true"></span>
 *       <input type="hidden" class="color-picker-value" name="colour" />
 *     </div>
 *   </div>
 *
 * data-color-picker-default — initial hex value (#RGB or #RRGGBB)
 * data-color-picker-disabled — disable the control
 */

import { parseBooleanAttr } from "../utils/dom.js";

const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const PARTIAL_HEX_PATTERN = /^#?[0-9a-fA-F]{0,6}$/;

function expandShortHex(hex) {
  if (hex.length === 3) {
    return hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return hex;
}

/** @returns {string | null} Normalised `#RRGGBB` or null when invalid. */
export function parseHexColor(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(HEX_PATTERN);
  if (!match) return null;
  return `#${expandShortHex(match[1]).toUpperCase()}`;
}

function formatDisplayValue(value) {
  return value ?? "";
}

function isPartialHexInput(value) {
  return PARTIAL_HEX_PATTERN.test(String(value ?? "").trim());
}

function resolveDisabled(colorPickerEl, disabledOption) {
  if (typeof disabledOption === "boolean") return disabledOption;
  return parseBooleanAttr(colorPickerEl?.dataset.colorPickerDisabled) ?? false;
}

function syncSwatch(swatchEl, color) {
  if (!swatchEl) return;
  swatchEl.classList.toggle("is-empty", !color);
  if (color) {
    swatchEl.style.setProperty("--color-picker-preview", color);
  } else {
    swatchEl.style.removeProperty("--color-picker-preview");
  }
}

export function initColorPicker(
  colorPickerEl,
  { defaultValue, disabled, onChange, onInput } = {}
) {
  if (!colorPickerEl) return null;

  const textInput = colorPickerEl.querySelector(".color-picker-input");
  const hiddenInput = colorPickerEl.querySelector(".color-picker-value");
  const swatchEl = colorPickerEl.querySelector(".color-picker-swatch");

  if (!textInput || !swatchEl) return null;

  const initialRaw =
    defaultValue ??
    colorPickerEl.dataset.colorPickerDefault ??
    hiddenInput?.value ??
    textInput.value;
  let currentValue = parseHexColor(initialRaw);
  let isEditing = false;
  let isDisabled = resolveDisabled(colorPickerEl, disabled);

  function buildPayload(source) {
    return {
      colorPickerEl,
      value: currentValue,
      display: formatDisplayValue(currentValue),
      source,
    };
  }

  function applyDisabled(nextDisabled) {
    isDisabled = nextDisabled;
    colorPickerEl.classList.toggle("color-picker--disabled", nextDisabled);
    textInput.disabled = nextDisabled;
  }

  applyDisabled(isDisabled);

  function syncDom({ emit = true, source = "init" } = {}) {
    if (!isEditing) {
      textInput.value = formatDisplayValue(currentValue);
    }
    if (hiddenInput) {
      hiddenInput.value = currentValue ?? "";
    }
    syncSwatch(swatchEl, currentValue);

    if (emit) {
      onChange?.(buildPayload(source));
    }
  }

  function setValue(nextValue, { emit = true, source = "api" } = {}) {
    const parsed =
      nextValue === "" || nextValue === null || nextValue === undefined
        ? null
        : parseHexColor(nextValue);
    if (nextValue && !parsed) return false;
    currentValue = parsed;
    isEditing = false;
    textInput.removeAttribute("aria-invalid");
    syncDom({ emit, source });
    return true;
  }

  function commitTypedValue({ emit = true } = {}) {
    const raw = String(textInput.value).trim();
    if (!raw) {
      currentValue = null;
      isEditing = false;
      textInput.removeAttribute("aria-invalid");
      syncDom({ emit, source: "input" });
      return true;
    }

    const parsed = parseHexColor(raw);
    if (!parsed) {
      textInput.value = formatDisplayValue(currentValue);
      textInput.removeAttribute("aria-invalid");
      isEditing = false;
      syncSwatch(swatchEl, currentValue);
      return false;
    }

    currentValue = parsed;
    isEditing = false;
    textInput.removeAttribute("aria-invalid");
    syncDom({ emit, source: "input" });
    return true;
  }

  textInput.addEventListener("focus", () => {
    isEditing = true;
  });

  textInput.addEventListener("input", () => {
    if (isDisabled) return;
    isEditing = true;
    const raw = String(textInput.value).trim();

    if (!raw) {
      textInput.removeAttribute("aria-invalid");
      syncSwatch(swatchEl, null);
      onInput?.({
        ...buildPayload("input"),
        value: null,
        display: "",
      });
      return;
    }

    if (!isPartialHexInput(raw)) {
      textInput.setAttribute("aria-invalid", "true");
      syncSwatch(swatchEl, null);
      return;
    }

    textInput.removeAttribute("aria-invalid");
    const preview = parseHexColor(raw);
    syncSwatch(swatchEl, preview);
    onInput?.({
      ...buildPayload("input"),
      value: preview,
      display: raw,
    });
  });

  textInput.addEventListener("change", () => {
    commitTypedValue();
  });

  textInput.addEventListener("blur", () => {
    commitTypedValue();
  });

  textInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitTypedValue();
      textInput.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      isEditing = false;
      textInput.value = formatDisplayValue(currentValue);
      textInput.removeAttribute("aria-invalid");
      syncSwatch(swatchEl, currentValue);
      textInput.blur();
    }
  });

  syncDom({ emit: Boolean(onChange) });

  return {
    getValue() {
      return currentValue;
    },
    setValue(nextValue) {
      return setValue(nextValue);
    },
    commitInput() {
      return commitTypedValue();
    },
    setDisabled(nextDisabled) {
      applyDisabled(Boolean(nextDisabled));
    },
    isDisabled() {
      return isDisabled;
    },
  };
}

/** Wire every `.color-picker` block in `root`. */
export function initColorPickers(root = document) {
  const instances = [];
  root.querySelectorAll(".color-picker").forEach((colorPickerEl) => {
    const instance = initColorPicker(colorPickerEl);
    if (instance) instances.push(instance);
  });
  return instances;
}
