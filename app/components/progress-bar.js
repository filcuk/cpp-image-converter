/**
 * Progress bar — visual fill for a value between min and max.
 *
 * Markup:
 *   <div class="progress-bar" data-progress-bar-value="65" data-progress-bar-max="100"
 *     data-progress-bar-label="percent">
 *     <label class="field-label" id="upload-label">Upload progress</label>
 *     <div class="progress-bar-row">
 *       <div class="progress-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"
 *         aria-valuenow="65" aria-labelledby="upload-label">
 *         <span class="progress-bar-fill"></span>
 *       </div>
 *       <span class="progress-bar-label" aria-hidden="true">65%</span>
 *     </div>
 *     <input type="hidden" class="progress-bar-value" value="65" />
 *   </div>
 *
 * data-progress-bar-value — current value
 * data-progress-bar-min / data-progress-bar-max — bounds (default 0 and 100)
 * data-progress-bar-label — "percent" or "fraction" when `.progress-bar-label` is present; omit label element for bar only
 * data-progress-bar-indeterminate — animated indeterminate state (ignores value)
 */

import { parseBooleanAttr, setHidden } from "../utils/dom.js";

function parseConfigNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computePercent(value, min, max) {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function resolveLabelFormat(progressBarEl, labelFormatOption, labelEl) {
  if (!labelEl) return null;
  const fromAttr = progressBarEl?.dataset.progressBarLabel;
  const format = labelFormatOption ?? fromAttr ?? "percent";
  if (format === "fraction" || format === "percent") return format;
  return null;
}

function formatLabelText(value, min, max, format) {
  if (format === "fraction") {
    return `${Math.round(value)}/${Math.round(max)}`;
  }
  return `${Math.round(computePercent(value, min, max))}%`;
}

function formatValueText(value, min, max, format, isIndeterminate) {
  if (isIndeterminate) return "In progress";
  if (format === "fraction") {
    return `${Math.round(value)} of ${Math.round(max)}`;
  }
  return `${Math.round(computePercent(value, min, max))} percent`;
}

export function initProgressBar(
  progressBarEl,
  { value, min, max, labelFormat, indeterminate, onChange } = {}
) {
  if (!progressBarEl) return null;

  const trackEl = progressBarEl.querySelector(".progress-bar-track");
  const fillEl = progressBarEl.querySelector(".progress-bar-fill");
  const labelEl = progressBarEl.querySelector(".progress-bar-label");
  const hiddenInput = progressBarEl.querySelector(".progress-bar-value");

  if (!trackEl || !fillEl) return null;

  const minValue = parseConfigNumber(min ?? progressBarEl.dataset.progressBarMin, 0);
  const maxValue = parseConfigNumber(max ?? progressBarEl.dataset.progressBarMax, 100);
  const resolvedLabelFormat = resolveLabelFormat(progressBarEl, labelFormat, labelEl);

  let currentValue = clamp(
    parseConfigNumber(value ?? progressBarEl.dataset.progressBarValue, minValue),
    minValue,
    maxValue
  );
  let isIndeterminate =
    typeof indeterminate === "boolean"
      ? indeterminate
      : parseBooleanAttr(progressBarEl?.dataset.progressBarIndeterminate) ?? false;

  function syncDom({ emit = true, source = "init" } = {}) {
    const percent = computePercent(currentValue, minValue, maxValue);

    progressBarEl.classList.toggle("progress-bar--indeterminate", isIndeterminate);

    if (isIndeterminate) {
      trackEl.removeAttribute("aria-valuenow");
      trackEl.setAttribute("aria-valuetext", "In progress");
      fillEl.style.width = "";
    } else {
      trackEl.setAttribute("aria-valuemin", String(minValue));
      trackEl.setAttribute("aria-valuemax", String(maxValue));
      trackEl.setAttribute("aria-valuenow", String(currentValue));
      trackEl.setAttribute(
        "aria-valuetext",
        formatValueText(currentValue, minValue, maxValue, resolvedLabelFormat, false)
      );
      fillEl.style.width = `${percent}%`;
    }

    if (labelEl) {
      if (resolvedLabelFormat && !isIndeterminate) {
        labelEl.textContent = formatLabelText(
          currentValue,
          minValue,
          maxValue,
          resolvedLabelFormat
        );
        setHidden(labelEl, false);
      } else if (isIndeterminate) {
        labelEl.textContent = "…";
        setHidden(labelEl, false);
      } else {
        labelEl.textContent = "";
        setHidden(labelEl, true);
      }
    }

    if (hiddenInput) {
      hiddenInput.value = isIndeterminate ? "" : String(currentValue);
    }

    if (emit) {
      onChange?.({
        progressBarEl,
        value: currentValue,
        min: minValue,
        max: maxValue,
        percent,
        indeterminate: isIndeterminate,
        source,
      });
    }
  }

  function setValue(nextValue, { emit = true, source = "api" } = {}) {
    isIndeterminate = false;
    currentValue = clamp(parseConfigNumber(nextValue, minValue), minValue, maxValue);
    syncDom({ emit, source });
  }

  function setIndeterminate(nextIndeterminate, { emit = true, source = "api" } = {}) {
    isIndeterminate = Boolean(nextIndeterminate);
    syncDom({ emit, source });
  }

  syncDom({ emit: Boolean(onChange) });

  return {
    getValue() {
      return currentValue;
    },
    setValue(nextValue) {
      setValue(nextValue);
    },
    getMin() {
      return minValue;
    },
    getMax() {
      return maxValue;
    },
    getPercent() {
      return computePercent(currentValue, minValue, maxValue);
    },
    setIndeterminate(nextIndeterminate) {
      setIndeterminate(nextIndeterminate);
    },
    isIndeterminate() {
      return isIndeterminate;
    },
  };
}

/** Wire every `.progress-bar` block in `root`. */
export function initProgressBars(root = document) {
  const instances = [];
  root.querySelectorAll(".progress-bar").forEach((progressBarEl) => {
    const instance = initProgressBar(progressBarEl);
    if (instance) instances.push(instance);
  });
  return instances;
}
