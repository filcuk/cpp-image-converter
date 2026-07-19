/**
 * Numeric nudger with decrement / increment buttons and an editable value field.
 *
 * Markup:
 *   <div class="stepper" data-stepper-min="0" data-stepper-max="10" data-stepper-default="1">
 *     <label class="field-label" for="my-stepper-input">Quantity</label>
 *     <div class="stepper-control">
 *       <button type="button" class="btn btn-icon stepper-decrement" data-stepper-decrement
 *         aria-label="Decrease">−</button>
 *       <input type="text" id="my-stepper-input" class="input stepper-input" inputmode="numeric"
 *         aria-label="Quantity" />
 *       <button type="button" class="btn btn-icon stepper-increment" data-stepper-increment
 *         aria-label="Increase">+</button>
 *       <input type="hidden" class="stepper-value" />
 *     </div>
 *   </div>
 *
 * data-stepper-min / data-stepper-max — numeric bounds
 * data-stepper-step — increment (default: 1, or 0.1 for decimal)
 * data-stepper-default — initial value (omit for an empty start)
 * data-stepper-format — "integer" (default) or "decimal"
 * data-stepper-disabled — disable control
 */

import { parseBooleanAttr } from "../utils/dom.js";

function parseConfigNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalPlacesFromStep(step) {
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function snapToStep(value, min, max, step) {
  if (!Number.isFinite(value)) return min;
  const steps = Math.round((value - min) / step);
  const snapped = min + steps * step;
  const precision = decimalPlacesFromStep(step);
  const rounded = Number(snapped.toFixed(precision));
  return Math.min(max, Math.max(min, rounded));
}

function formatDisplayValue(value, { format, step }) {
  if (value === null || !Number.isFinite(value)) return "";
  if (format === "integer") {
    return String(Math.round(value));
  }
  return value.toFixed(decimalPlacesFromStep(step));
}

function resolveFormat(stepperEl, formatOption) {
  const fromAttr = stepperEl?.dataset.stepperFormat;
  const format = formatOption ?? fromAttr ?? "integer";
  return format === "decimal" ? "decimal" : "integer";
}

function defaultStepForFormat(format) {
  return format === "decimal" ? 0.1 : 1;
}

function resolveDisabled(stepperEl, disabledOption) {
  if (typeof disabledOption === "boolean") return disabledOption;
  return parseBooleanAttr(stepperEl?.dataset.stepperDisabled) ?? false;
}

export function initStepper(
  stepperEl,
  { min, max, step, defaultValue, format, disabled, onChange, onInput } = {}
) {
  if (!stepperEl) return null;

  const decrementBtn = stepperEl.querySelector("[data-stepper-decrement]");
  const incrementBtn = stepperEl.querySelector("[data-stepper-increment]");
  const valueInput = stepperEl.querySelector(".stepper-input");
  const hiddenInput = stepperEl.querySelector(".stepper-value");

  if (!decrementBtn || !incrementBtn || !valueInput) return null;

  const resolvedFormat = resolveFormat(stepperEl, format);
  const minValue = parseConfigNumber(min ?? stepperEl.dataset.stepperMin, 0);
  const maxValue = parseConfigNumber(max ?? stepperEl.dataset.stepperMax, 100);
  const stepValue = parseConfigNumber(
    step ?? stepperEl.dataset.stepperStep,
    defaultStepForFormat(resolvedFormat)
  );

  const bounds =
    minValue <= maxValue
      ? { min: minValue, max: maxValue }
      : { min: maxValue, max: minValue };

  const config = {
    min: bounds.min,
    max: bounds.max,
    step: stepValue > 0 ? stepValue : defaultStepForFormat(resolvedFormat),
    format: resolvedFormat,
  };

  const hasExplicitDefault =
    defaultValue !== undefined ||
    Object.prototype.hasOwnProperty.call(stepperEl.dataset, "stepperDefault") ||
    Boolean(String(valueInput.value ?? "").trim()) ||
    Boolean(String(hiddenInput?.value ?? "").trim());

  const initialRaw = hasExplicitDefault
    ? (defaultValue ??
      stepperEl.dataset.stepperDefault ??
      valueInput.value ??
      hiddenInput?.value)
    : null;

  /** @type {number | null} */
  let currentValue = null;
  if (hasExplicitDefault) {
    const parsedInitial = parseOptionalNumber(initialRaw);
    currentValue =
      parsedInitial === null
        ? null
        : snapToStep(parsedInitial, config.min, config.max, config.step);
  }

  let isEditing = false;
  let isDisabled = resolveDisabled(stepperEl, disabled);
  const controls = [decrementBtn, incrementBtn, valueInput];

  function applyDisabled(nextDisabled) {
    isDisabled = nextDisabled;
    stepperEl.classList.toggle("stepper--disabled", nextDisabled);
    controls.forEach((control) => {
      control.disabled = nextDisabled;
    });
    syncButtonStates();
  }

  applyDisabled(isDisabled);

  function buildPayload(source) {
    return {
      stepperEl,
      value: currentValue,
      display: formatDisplayValue(currentValue, config),
      format: config.format,
      source,
    };
  }

  function syncButtonStates() {
    if (isDisabled) return;
    if (currentValue === null) {
      decrementBtn.disabled = false;
      incrementBtn.disabled = false;
      return;
    }
    decrementBtn.disabled = currentValue <= config.min;
    incrementBtn.disabled = currentValue >= config.max;
  }

  function syncDom({ emit = true, source = "init" } = {}) {
    if (!isEditing) {
      valueInput.value = formatDisplayValue(currentValue, config);
    }
    if (hiddenInput) {
      hiddenInput.value = currentValue === null ? "" : String(currentValue);
    }
    syncButtonStates();

    if (emit) {
      onChange?.(buildPayload(source));
    }
  }

  /**
   * @param {number | string | null | undefined} nextValue
   */
  function setValue(nextValue, { emit = true, source = "api" } = {}) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      currentValue = null;
    } else {
      const parsed =
        typeof nextValue === "number" ? nextValue : Number(nextValue);
      currentValue = snapToStep(
        Number.isFinite(parsed) ? parsed : config.min,
        config.min,
        config.max,
        config.step
      );
    }
    isEditing = false;
    syncDom({ emit, source });
  }

  function nudge(delta, { emit = true, source = "button" } = {}) {
    if (isDisabled) return;
    // From empty, −/+ both land on min first
    const resolved =
      currentValue === null
        ? config.min
        : snapToStep(
            currentValue + delta,
            config.min,
            config.max,
            config.step
          );
    if (resolved === currentValue) return;
    currentValue = resolved;
    isEditing = false;
    valueInput.value = formatDisplayValue(currentValue, config);
    if (hiddenInput) hiddenInput.value = String(currentValue);
    syncButtonStates();
    onInput?.(buildPayload(source));
    if (emit) {
      onChange?.(buildPayload(source));
    }
  }

  function commitTypedValue({ emit = true } = {}) {
    const raw = String(valueInput.value).trim();
    if (raw === "") {
      currentValue = null;
      isEditing = false;
      valueInput.removeAttribute("aria-invalid");
      syncDom({ emit, source: "input" });
      return true;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      valueInput.value = formatDisplayValue(currentValue, config);
      valueInput.removeAttribute("aria-invalid");
      isEditing = false;
      return false;
    }

    currentValue = snapToStep(parsed, config.min, config.max, config.step);
    isEditing = false;
    valueInput.removeAttribute("aria-invalid");
    syncDom({ emit, source: "input" });
    return true;
  }

  decrementBtn.addEventListener("click", () => {
    nudge(-config.step, { source: "decrement" });
  });

  incrementBtn.addEventListener("click", () => {
    nudge(config.step, { source: "increment" });
  });

  valueInput.addEventListener("focus", () => {
    isEditing = true;
  });

  valueInput.addEventListener("input", () => {
    isEditing = true;
    const raw = String(valueInput.value).trim();
    if (raw === "") {
      valueInput.removeAttribute("aria-invalid");
      onInput?.({
        ...buildPayload("input"),
        value: null,
        display: valueInput.value,
      });
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      valueInput.setAttribute("aria-invalid", "true");
      return;
    }
    valueInput.removeAttribute("aria-invalid");
    const preview = snapToStep(parsed, config.min, config.max, config.step);
    onInput?.({
      ...buildPayload("input"),
      value: preview,
      display: valueInput.value,
    });
  });

  valueInput.addEventListener("change", () => {
    commitTypedValue();
  });

  valueInput.addEventListener("blur", () => {
    commitTypedValue();
  });

  valueInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      nudge(config.step, { source: "keyboard" });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      nudge(-config.step, { source: "keyboard" });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitTypedValue();
      valueInput.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      isEditing = false;
      valueInput.value = formatDisplayValue(currentValue, config);
      valueInput.removeAttribute("aria-invalid");
      valueInput.blur();
    }
  });

  syncDom({ emit: Boolean(onChange) });

  return {
    getValue() {
      return currentValue;
    },
    /**
     * @param {number | string | null | undefined} nextValue Pass `null` / `""` to clear.
     */
    setValue(nextValue) {
      setValue(nextValue);
    },
    /**
     * Update min/max bounds. Clamps the current value when it falls outside.
     * @param {{ min?: number, max?: number, emit?: boolean }} [options]
     */
    setBounds({ min, max, emit = false } = {}) {
      const nextMin =
        min === undefined ? config.min : parseConfigNumber(min, config.min);
      const nextMax =
        max === undefined ? config.max : parseConfigNumber(max, config.max);
      config.min = Math.min(nextMin, nextMax);
      config.max = Math.max(nextMin, nextMax);
      stepperEl.dataset.stepperMin = String(config.min);
      stepperEl.dataset.stepperMax = String(config.max);

      if (currentValue !== null) {
        const clamped = snapToStep(
          currentValue,
          config.min,
          config.max,
          config.step
        );
        if (clamped !== currentValue) {
          currentValue = clamped;
          syncDom({ emit, source: "api" });
          return;
        }
      }
      syncButtonStates();
    },
    clear({ emit = true } = {}) {
      setValue(null, { emit, source: "api" });
    },
    increment() {
      nudge(config.step, { source: "api" });
    },
    decrement() {
      nudge(config.step * -1, { source: "api" });
    },
    getConfig() {
      return { ...config };
    },
    commitInput() {
      commitTypedValue();
    },
    setDisabled(nextDisabled) {
      applyDisabled(Boolean(nextDisabled));
    },
    isDisabled() {
      return isDisabled;
    },
  };
}

/** Wire every `.stepper` block in `root`. */
export function initSteppers(root = document) {
  const instances = [];
  root.querySelectorAll(".stepper").forEach((stepperEl) => {
    const instance = initStepper(stepperEl);
    if (instance) instances.push(instance);
  });
  return instances;
}
