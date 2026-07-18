import { initShell } from "./shell/shell.js";
import { setHidden } from "./utils/dom.js";
import { initFileDropzone } from "./components/file-dropzone.js";
import { downloadFile } from "./components/file-download.js";
import { initSegmentedControl } from "./components/segmented-control.js";
import { initDropdown } from "./components/dropdown.js";
import { initStepper } from "./components/stepper.js";
import { initToggle } from "./components/toggle.js";
import { initColorPicker } from "./components/color-picker.js";
import { showBanner, hideBanner } from "./components/banner.js";
import { convertCToSvg } from "./converter/convert.js";
import { parseCArray } from "./converter/parse-c-array.js";
import {
  formatLabel as formatIdLabel,
  formatNeedsBitOrder,
} from "./converter/formats.js";
import { EXAMPLE_SOURCE } from "./examples/example-heart.js";

initShell({ pageNav: false });

const sourceTextarea = document.getElementById("source-textarea");
const clearSourceBtn = document.getElementById("clear-source-btn");
const loadExampleBtn = document.getElementById("load-example-btn");
const downloadSvgBtn = document.getElementById("download-svg-btn");
const previewEl = document.getElementById("svg-preview");
const previewEmptyEl = document.getElementById("svg-preview-empty");
const metaEl = document.getElementById("converter-meta");
const frameStepperEl = document.getElementById("frame-stepper");
const fillWrapEl = document.getElementById("fill-color-picker");
const bitOrderWrapEl = document.getElementById("bit-order-wrap");
const formatDropdownLabelEl = document.getElementById("format-dropdown-label");

const errorBanner = document.getElementById("converter-error");
const errorBody = document.getElementById("converter-error-body");
const warningBanner = document.getElementById("converter-warning");
const warningBody = document.getElementById("converter-warning-body");
const successBanner = document.getElementById("converter-success");
const successBody = document.getElementById("converter-success-body");

/** @type {string | null} */
let latestSvg = null;
/** @type {string} */
let downloadFilename = "converted.svg";
/** @type {number} */
let lastFrameCount = 1;
/** Skip stepper-driven reconvert while syncing size from source defines */
let applyingMetadata = false;
let convertTimer = 0;
/** Paste fires before the textarea value updates; `input` always sees the new text. */
let sourceChangeFromPaste = false;

/** @type {string} */
let selectedFormat = "auto";
/** @type {ReturnType<typeof initSegmentedControl>} */
let bitOrderControl = null;
/** @type {ReturnType<typeof initStepper>} */
let widthStepper = null;
/** @type {ReturnType<typeof initStepper>} */
let heightStepper = null;
/** @type {ReturnType<typeof initStepper>} */
let scaleStepper = null;
/** @type {ReturnType<typeof initStepper>} */
let frameStepper = null;
/** @type {ReturnType<typeof initToggle>} */
let overrideToggle = null;
/** @type {ReturnType<typeof initToggle>} */
let minifyToggle = null;
/** @type {ReturnType<typeof initColorPicker>} */
let fillPicker = null;
/** @type {ReturnType<typeof initFileDropzone>} */
let sourceDropzone = null;
/** True while textarea content came from a loaded file */
let sourceFromFile = false;
/** Skip clearing the textarea when we clear the dropzone ourselves */
let ignoringDropzoneClear = false;

function scheduleConvert() {
  window.clearTimeout(convertTimer);
  if (!sourceTextarea?.value.trim()) return;
  convertTimer = window.setTimeout(() => {
    runConvert({ showSuccess: false });
  }, 200);
}

function onOptionChange() {
  if (applyingMetadata) return;
  scheduleConvert();
}

function syncFillEnabled(enabled) {
  fillWrapEl?.classList.toggle("is-disabled", !enabled);
  fillPicker?.setDisabled(!enabled);
}

/**
 * @param {string} formatId
 */
function syncBitOrderVisibility(formatId) {
  const effective =
    formatId === "auto" ? "1bit" : formatId;
  // Show when the resolved manual format needs bit order, or Auto (uint8 often 1-bit)
  const show =
    formatId === "auto" || formatNeedsBitOrder(effective);
  setHidden(bitOrderWrapEl, !show);
}

/**
 * @param {string} value
 * @param {string} label
 */
function setFormatSelection(value, label) {
  selectedFormat = value || "auto";
  if (formatDropdownLabelEl) {
    formatDropdownLabelEl.textContent = label || formatIdLabel(selectedFormat);
  }
  const menu = document.getElementById("format-dropdown-menu");
  menu?.querySelectorAll(".dropdown-menu-item").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.value === selectedFormat);
  });
  syncBitOrderVisibility(selectedFormat);
}

/**
 * Sync width/height/frame from source defines. When width or height is defined
 * in the source, lock that stepper so the UI matches the file.
 * @param {string} source
 */
function applySourceMetadata(source) {
  const parsed = parseCArray(source);
  applyingMetadata = true;
  try {
    const hasWidth = Boolean(parsed.width);
    const hasHeight = Boolean(parsed.height);
    if (hasWidth) widthStepper?.setValue(parsed.width);
    if (hasHeight) heightStepper?.setValue(parsed.height);
    widthStepper?.setDisabled(hasWidth);
    heightStepper?.setDisabled(hasHeight);
    updateFrameStepper(parsed.frameCount);
  } finally {
    applyingMetadata = false;
  }
}

/**
 * @param {number} frameCount
 */
function updateFrameStepper(frameCount) {
  lastFrameCount = Math.max(1, frameCount || 1);
  const show = lastFrameCount > 1;
  setHidden(frameStepperEl, !show);
  if (!show) {
    frameStepper?.setValue(0);
    return;
  }
  const maxIndex = lastFrameCount - 1;
  let current = Math.round(frameStepper?.getValue() ?? 0);
  if (current > maxIndex) current = 0;
  frameStepper?.setValue(current);
}

function getFrameIndex() {
  const maxIndex = Math.max(0, lastFrameCount - 1);
  const value = Math.round(frameStepper?.getValue() ?? 0);
  return Math.min(maxIndex, Math.max(0, value));
}

/**
 * @param {string} message
 */
function showError(message) {
  hideBanner(warningBanner);
  hideBanner(successBanner);
  if (errorBody) errorBody.textContent = message;
  showBanner(errorBanner);
}

/**
 * @param {string[]} warnings
 */
function showWarnings(warnings) {
  if (!warnings.length) {
    hideBanner(warningBanner);
    return;
  }
  if (warningBody) warningBody.textContent = warnings.join(" ");
  showBanner(warningBanner);
}

/**
 * @param {string} message
 */
function showSuccessBanner(message) {
  if (successBody) successBody.textContent = message;
  showBanner(successBanner);
}

function clearPreview() {
  latestSvg = null;
  previewEl?.querySelector("svg")?.remove();
  setHidden(previewEmptyEl, false);
  setHidden(metaEl, true);
  setDownloadEnabled(false);
}

function setDownloadEnabled(enabled) {
  if (downloadSvgBtn) downloadSvgBtn.disabled = !enabled;
}

function triggerSvgDownload() {
  if (!latestSvg) return;
  void downloadFile({
    filename: downloadFilename,
    content: latestSvg,
    mimeType: "image/svg+xml;charset=utf-8",
  });
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileText(file) {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsText(file);
  });
}

function syncSourceActionVisibility() {
  const hasSource = Boolean(sourceTextarea?.value);
  setHidden(clearSourceBtn, !hasSource);
  setHidden(loadExampleBtn, hasSource);
}

function clearSourceInputs() {
  sourceFromFile = false;
  downloadFilename = "converted.svg";
  if (sourceTextarea) sourceTextarea.value = "";
  ignoringDropzoneClear = true;
  try {
    sourceDropzone?.clear();
  } finally {
    ignoringDropzoneClear = false;
  }
  syncSourceActionVisibility();
  clearPreview();
  hideBanner(errorBanner);
  hideBanner(successBanner);
  hideBanner(warningBanner);
}

/**
 * @param {File} file
 */
async function loadSourceFile(file) {
  try {
    const text = await readFileText(file);
    if (!sourceTextarea) {
      showError("Source text area is missing.");
      return;
    }
    sourceFromFile = true;
    sourceTextarea.value = text;
    syncSourceActionVisibility();
    downloadFilename = file.name.replace(/\.(c|h|txt)$/i, "") + ".svg";
    runConvert({ showSuccess: true });
    if (!text.trim()) {
      showWarnings(["File was empty."]);
    }
  } catch (err) {
    sourceFromFile = false;
    showError(
      err instanceof Error
        ? `Could not read “${file.name}”: ${err.message}`
        : `Could not read “${file.name}”.`
    );
  }
}

function loadExampleSource() {
  if (!sourceTextarea) {
    showError("Source text area is missing.");
    return;
  }
  clearFileIfEditingSource();
  sourceTextarea.value = EXAMPLE_SOURCE;
  syncSourceActionVisibility();
  downloadFilename = "example.svg";
  runConvert({ showSuccess: true });
}

/** Clear the loaded file when the user edits or pastes into the textarea. */
function clearFileIfEditingSource() {
  if (!sourceFromFile) return;
  sourceFromFile = false;
  downloadFilename = "converted.svg";
  ignoringDropzoneClear = true;
  try {
    sourceDropzone?.clear();
  } finally {
    ignoringDropzoneClear = false;
  }
}

/**
 * @param {{ showSuccess?: boolean }} [options]
 */
function runConvert({ showSuccess = true } = {}) {
  const source = sourceTextarea?.value ?? "";
  if (!source.trim()) {
    // Auto-convert: empty input is a normal idle state, not an error
    clearPreview();
    hideBanner(errorBanner);
    hideBanner(successBanner);
    hideBanner(warningBanner);
    applyingMetadata = true;
    try {
      widthStepper?.setDisabled(false);
      heightStepper?.setDisabled(false);
      updateFrameStepper(1);
    } finally {
      applyingMetadata = false;
    }
    return;
  }

  applySourceMetadata(source);
  hideBanner(errorBanner);

  const parsedHint = parseCArray(source);
  const widthFromUi = Math.round(widthStepper?.getValue() ?? 0);
  const heightFromUi = Math.round(heightStepper?.getValue() ?? 0);

  const scaleFromUi = Number(scaleStepper?.getValue() ?? 1);
  const displayScale =
    Number.isFinite(scaleFromUi) && scaleFromUi > 0 ? scaleFromUi : 1;

  let result;
  try {
    result = convertCToSvg({
      source,
      format: selectedFormat,
      bitOrder: /** @type {"msb" | "lsb"} */ (
        bitOrderControl?.getValue() ?? "msb"
      ),
      width: widthFromUi > 0 ? widthFromUi : parsedHint.width,
      height: heightFromUi > 0 ? heightFromUi : parsedHint.height,
      frameIndex: getFrameIndex(),
      overrideFill: overrideToggle?.getChecked() ?? false,
      fillColor: fillPicker?.getValue() ?? "#FFFFFF",
      displayScale,
      minify: minifyToggle?.getChecked() ?? false,
    });
  } catch (err) {
    showError(
      err instanceof Error ? `Conversion failed: ${err.message}` : "Conversion failed."
    );
    clearPreview();
    return;
  }

  updateFrameStepper(result.frameCount);

  if (result.error || !result.svg) {
    showError(result.error || "Conversion failed.");
    clearPreview();
    showWarnings(result.warnings);
    return;
  }

  latestSvg = result.svg;
  showWarnings(result.warnings);

  setHidden(previewEmptyEl, true);
  previewEl?.querySelector("svg")?.remove();

  const parser = new DOMParser();
  const doc = parser.parseFromString(result.svg, "image/svg+xml");
  const svgNode = doc.documentElement;
  if (svgNode && svgNode.nodeName.toLowerCase() === "svg") {
    previewEl?.append(document.importNode(svgNode, true));
  }

  const formatLabel = formatIdLabel(result.format);
  const detected =
    result.detectedFormat && result.detectedFormat !== result.format
      ? ` (detected ${formatIdLabel(result.detectedFormat)})`
      : result.detectedFormat
        ? ` (from ${result.elementType || "type"})`
        : "";

  if (metaEl) {
    const outW = Number((result.width * displayScale).toFixed(4));
    const outH = Number((result.height * displayScale).toFixed(4));
    metaEl.textContent = `${outW}×${outH} · ${formatLabel}${detected} · ${result.rectCount} shape${result.rectCount === 1 ? "" : "s"}`;
  }
  setHidden(metaEl, false);
  setDownloadEnabled(true);

  if (showSuccess) {
    showSuccessBanner(
      `Output ready - ${result.rectCount} shape${result.rectCount === 1 ? "" : "s"}.`
    );
  }
}

try {
  initDropdown(document.getElementById("format-dropdown"), {
    onSelect: ({ value, label }) => {
      setFormatSelection(value || "auto", label);
      onOptionChange();
    },
  });
  setFormatSelection("auto", "Auto");

  bitOrderControl = initSegmentedControl(document.getElementById("bit-order-control"), {
    onChange: onOptionChange,
  });

  widthStepper = initStepper(document.getElementById("width-stepper"), {
    onChange: onOptionChange,
  });

  heightStepper = initStepper(document.getElementById("height-stepper"), {
    onChange: onOptionChange,
  });

  scaleStepper = initStepper(document.getElementById("scale-stepper"), {
    onChange: onOptionChange,
  });

  frameStepper = initStepper(frameStepperEl, {
    onChange: onOptionChange,
  });

  // Color picker before toggle — toggle onChange calls syncFillEnabled(fillPicker)
  fillPicker = initColorPicker(document.getElementById("fill-color-picker"), {
    onChange: onOptionChange,
  });

  overrideToggle = initToggle(document.getElementById("override-fill-toggle"), {
    onChange: ({ checked }) => {
      syncFillEnabled(checked);
      onOptionChange();
    },
  });

  minifyToggle = initToggle(document.getElementById("minify-toggle"), {
    onChange: onOptionChange,
  });

  syncFillEnabled(overrideToggle?.getChecked() ?? false);

  const dropzone = initFileDropzone(document.getElementById("source-dropzone"), {
    onFiles: ({ files }) => {
      const file = files[0];
      if (!file) return;

      if (!/\.(c|h|txt)$/i.test(file.name)) {
        showError(`Expected a .c, .h, or .txt file (got “${file.name}”).`);
        return;
      }

      void loadSourceFile(file);
    },
    onClear: () => {
      if (ignoringDropzoneClear) return;
      // User removed the file from the dropzone — clear paste/source too
      sourceFromFile = false;
      downloadFilename = "converted.svg";
      if (sourceTextarea) sourceTextarea.value = "";
      syncSourceActionVisibility();
      clearPreview();
      hideBanner(errorBanner);
      hideBanner(successBanner);
      hideBanner(warningBanner);
    },
    onError: ({ message }) => showError(message || "File upload failed."),
  });
  sourceDropzone = dropzone;

  if (!sourceDropzone) {
    showError("File upload control failed to initialize.");
  }

  downloadSvgBtn?.addEventListener("click", triggerSvgDownload);
  clearSourceBtn?.addEventListener("click", clearSourceInputs);
  loadExampleBtn?.addEventListener("click", loadExampleSource);

  // Sync now and after form restore (refresh / bfcache can fill the textarea late)
  syncSourceActionVisibility();
  window.addEventListener("pageshow", syncSourceActionVisibility);
  window.setTimeout(syncSourceActionVisibility, 0);

  sourceTextarea?.addEventListener("paste", () => {
    sourceChangeFromPaste = true;
  });

  sourceTextarea?.addEventListener("input", () => {
    const fromPaste = sourceChangeFromPaste;
    sourceChangeFromPaste = false;

    // Editing or pasting replaces a loaded file as the active input
    clearFileIfEditingSource();
    syncSourceActionVisibility();

    window.clearTimeout(convertTimer);

    if (!sourceTextarea.value.trim()) {
      clearPreview();
      hideBanner(errorBanner);
      return;
    }

    if (fromPaste) {
      runConvert({ showSuccess: true });
      return;
    }

    scheduleConvert();
  });
} catch (err) {
  showError(
    err instanceof Error
      ? `App failed to start: ${err.message}`
      : "App failed to start."
  );
}
