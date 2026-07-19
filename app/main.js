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
import { convertSvgToCAsync } from "./converter/convert-svg-to-c.js";
import { parseCArray } from "./converter/parse-c-array.js";
import {
  formatLabel as formatIdLabel,
  formatNeedsBitOrder,
} from "./converter/formats.js";
import { EXAMPLE_SOURCE } from "./examples/example-heart.js";

initShell({ pageNav: false });

const sourceTextarea = document.getElementById("source-textarea");
const svgTextarea = document.getElementById("svg-textarea");
const arrayNameInput = document.getElementById("array-name-input");
const clearSourceBtn = document.getElementById("clear-source-btn");
const clearSvgBtn = document.getElementById("clear-svg-btn");
const loadExampleBtn = document.getElementById("load-example-btn");
const downloadSvgBtn = document.getElementById("download-svg-btn");
const downloadCBtn = document.getElementById("download-c-btn");
const previewEl = document.getElementById("svg-preview");
const previewEmptyEl = document.getElementById("svg-preview-empty");
const metaEl = document.getElementById("converter-meta");
const cOutputTextarea = document.getElementById("c-output-textarea");
const cPreviewEl = document.getElementById("c-preview");
const cPreviewEmptyEl = document.getElementById("c-preview-empty");
const cMetaEl = document.getElementById("c-converter-meta");
const cInputPanel = document.getElementById("c-input-panel");
const svgInputPanel = document.getElementById("svg-input-panel");
const svgOutputPanel = document.getElementById("svg-output-panel");
const cOutputPanel = document.getElementById("c-output-panel");
const frameStepperEl = document.getElementById("frame-stepper");
const animateOptionsWrapEl = document.getElementById("animate-options-wrap");
const fillWrapEl = document.getElementById("fill-color-picker");
const bitOrderWrapEl = document.getElementById("bit-order-wrap");
const formatDropdownLabelEl = document.getElementById("format-dropdown-label");
const formatLabelEl = document.getElementById("format-label");

const errorBanner = document.getElementById("converter-error");
const errorBody = document.getElementById("converter-error-body");
const warningBanner = document.getElementById("converter-warning");
const warningBody = document.getElementById("converter-warning-body");
const successBanner = document.getElementById("converter-success");
const successBody = document.getElementById("converter-success-body");

/** @type {string | null} */
let latestSvg = null;
/** @type {string | null} */
let latestC = null;
/** @type {string} */
let downloadFilename = "converted.svg";
/** @type {string} */
let downloadCFilename = "converted.c";
/** @type {number} */
let lastFrameCount = 1;
/** @type {"c-to-svg" | "svg-to-c"} */
let direction = "c-to-svg";
/** Skip stepper-driven reconvert while syncing size from source defines */
let applyingMetadata = false;
let convertTimer = 0;
/** Paste fires before the textarea value updates; `input` always sees the new text. */
let sourceChangeFromPaste = false;
let svgChangeFromPaste = false;

/** @type {string} */
let selectedFormat = "auto";
/** @type {ReturnType<typeof initSegmentedControl>} */
let directionControl = null;
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
let animateFramesToggle = null;
/** @type {ReturnType<typeof initStepper>} */
let frameDurationStepper = null;
/** @type {ReturnType<typeof initToggle>} */
let overrideToggle = null;
/** @type {ReturnType<typeof initToggle>} */
let minifyToggle = null;
/** @type {ReturnType<typeof initColorPicker>} */
let fillPicker = null;
/** @type {ReturnType<typeof initFileDropzone>} */
let sourceDropzone = null;
/** @type {ReturnType<typeof initFileDropzone>} */
let svgDropzone = null;
/** True while textarea content came from a loaded file */
let sourceFromFile = false;
let svgFromFile = false;
/** Skip clearing the textarea when we clear the dropzone ourselves */
let ignoringDropzoneClear = false;
let ignoringSvgDropzoneClear = false;

function isSvgToC() {
  return direction === "svg-to-c";
}

function scheduleConvert() {
  window.clearTimeout(convertTimer);
  const source = isSvgToC() ? svgTextarea?.value : sourceTextarea?.value;
  if (!source?.trim()) return;
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
  if (isSvgToC()) {
    const show = formatNeedsBitOrder(formatId === "auto" ? "argb32" : formatId);
    setHidden(bitOrderWrapEl, !show);
    return;
  }
  const effective = formatId === "auto" ? "1bit" : formatId;
  const show = formatId === "auto" || formatNeedsBitOrder(effective);
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
 * @param {"c-to-svg" | "svg-to-c"} next
 */
function setDirection(next) {
  direction = next === "svg-to-c" ? "svg-to-c" : "c-to-svg";
  const svgMode = isSvgToC();

  setHidden(cInputPanel, svgMode);
  setHidden(svgInputPanel, !svgMode);
  setHidden(svgOutputPanel, svgMode);
  setHidden(cOutputPanel, !svgMode);
  setHidden(downloadSvgBtn, svgMode);
  setHidden(downloadCBtn, !svgMode);

  document.querySelectorAll(".converter-c-to-svg-only").forEach((el) => {
    // animate wrap still managed by updateFrameStepper when visible
    if (el.id === "animate-options-wrap") {
      if (svgMode) setHidden(el, true);
      else updateFrameStepper(lastFrameCount);
      return;
    }
    setHidden(el, svgMode);
  });
  document.querySelectorAll(".converter-svg-to-c-only").forEach((el) => {
    setHidden(el, !svgMode);
  });

  if (formatLabelEl) {
    formatLabelEl.textContent = svgMode ? "Output format" : "Pixel format";
  }

  // Auto is C→SVG only; default SVG→C output to Piskel ARGB32
  const autoItem = document.querySelector(
    '#format-dropdown-menu [data-value="auto"]'
  );
  setHidden(autoItem?.closest("li") ?? autoItem, svgMode);
  if (svgMode && selectedFormat === "auto") {
    setFormatSelection("argb32", "ARGB32 (Piskel)");
  }

  syncBitOrderVisibility(selectedFormat);
  hideBanner(errorBanner);
  hideBanner(successBanner);
  hideBanner(warningBanner);

  // Fresh inputs/outputs whenever the direction changes
  clearSourceInputs();
  clearSvgInputs();
}

/**
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
  if (isSvgToC()) {
    setHidden(animateOptionsWrapEl, true);
    setHidden(frameStepperEl, true);
    return;
  }

  const multi = lastFrameCount > 1;
  setHidden(animateOptionsWrapEl, !multi);

  const animate = Boolean(animateFramesToggle?.getChecked());
  setHidden(frameStepperEl, !multi || animate);

  if (!multi) {
    frameStepper?.setValue(0);
    if (animateFramesToggle?.getChecked()) {
      applyingMetadata = true;
      try {
        animateFramesToggle.setChecked(false);
      } finally {
        applyingMetadata = false;
      }
    }
    return;
  }

  if (animate) return;

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
  if (downloadSvgBtn) downloadSvgBtn.disabled = true;
}

function clearCPreview() {
  cPreviewEl?.querySelector("svg")?.remove();
  setHidden(cPreviewEmptyEl, false);
}

function clearCOutput() {
  latestC = null;
  if (cOutputTextarea) cOutputTextarea.value = "";
  clearCPreview();
  setHidden(cMetaEl, true);
  if (downloadCBtn) downloadCBtn.disabled = true;
}

function triggerSvgDownload() {
  if (!latestSvg) return;
  void downloadFile({
    filename: downloadFilename,
    content: latestSvg,
    mimeType: "image/svg+xml;charset=utf-8",
  });
}

function triggerCDownload() {
  if (!latestC) return;
  void downloadFile({
    filename: downloadCFilename,
    content: latestC,
    mimeType: "text/x-c;charset=utf-8",
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

function syncSvgActionVisibility() {
  setHidden(clearSvgBtn, !svgTextarea?.value);
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

function clearSvgInputs() {
  svgFromFile = false;
  downloadCFilename = "converted.c";
  if (svgTextarea) svgTextarea.value = "";
  ignoringSvgDropzoneClear = true;
  try {
    svgDropzone?.clear();
  } finally {
    ignoringSvgDropzoneClear = false;
  }
  syncSvgActionVisibility();
  clearCOutput();
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

/**
 * @param {File} file
 */
async function loadSvgFile(file) {
  try {
    const text = await readFileText(file);
    if (!svgTextarea) {
      showError("SVG text area is missing.");
      return;
    }
    svgFromFile = true;
    svgTextarea.value = text;
    syncSvgActionVisibility();
    downloadCFilename = file.name.replace(/\.svg$/i, "") + ".c";
    runConvert({ showSuccess: true });
    if (!text.trim()) {
      showWarnings(["File was empty."]);
    }
  } catch (err) {
    svgFromFile = false;
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

function clearFileIfEditingSvg() {
  if (!svgFromFile) return;
  svgFromFile = false;
  downloadCFilename = "converted.c";
  ignoringSvgDropzoneClear = true;
  try {
    svgDropzone?.clear();
  } finally {
    ignoringSvgDropzoneClear = false;
  }
}

/**
 * @param {{ showSuccess?: boolean }} [options]
 */
function runConvertCToSvg({ showSuccess = true } = {}) {
  const source = sourceTextarea?.value ?? "";
  if (!source.trim()) {
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
      animateFrames: animateFramesToggle?.getChecked() ?? false,
      frameDurationMs: Math.round(frameDurationStepper?.getValue() ?? 100),
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
    const anim =
      result.animated && result.frameCount > 1
        ? ` · ${result.frameCount} frames animated`
        : "";
    metaEl.textContent = `${outW}×${outH} · ${formatLabel}${detected}${anim} · ${result.rectCount} shape${result.rectCount === 1 ? "" : "s"}`;
  }
  setHidden(metaEl, false);
  if (downloadSvgBtn) downloadSvgBtn.disabled = false;

  if (showSuccess) {
    showSuccessBanner(
      `Output ready - ${result.rectCount} shape${result.rectCount === 1 ? "" : "s"}.`
    );
  }
}

/**
 * @param {{ showSuccess?: boolean }} [options]
 */
async function runConvertSvgToC({ showSuccess = true } = {}) {
  const source = svgTextarea?.value ?? "";
  if (!source.trim()) {
    clearCOutput();
    hideBanner(errorBanner);
    hideBanner(successBanner);
    hideBanner(warningBanner);
    return;
  }

  hideBanner(errorBanner);

  let result;
  try {
    result = await convertSvgToCAsync({
      source,
      format: selectedFormat === "auto" ? "argb32" : selectedFormat,
      bitOrder: /** @type {"msb" | "lsb"} */ (
        bitOrderControl?.getValue() ?? "msb"
      ),
      arrayName: arrayNameInput?.value?.trim() || "image",
    });
  } catch (err) {
    showError(
      err instanceof Error ? `Conversion failed: ${err.message}` : "Conversion failed."
    );
    clearCOutput();
    return;
  }

  if (result.error || !result.source) {
    showError(result.error || "Conversion failed.");
    clearCOutput();
    showWarnings(result.warnings);
    return;
  }

  latestC = result.source;
  if (cOutputTextarea) cOutputTextarea.value = result.source;
  showWarnings(result.warnings);

  setHidden(cPreviewEmptyEl, true);
  cPreviewEl?.querySelector("svg")?.remove();

  const parser = new DOMParser();
  const doc = parser.parseFromString(source, "image/svg+xml");
  const svgNode = doc.documentElement;
  if (svgNode && svgNode.nodeName.toLowerCase() === "svg") {
    cPreviewEl?.append(document.importNode(svgNode, true));
  }

  if (cMetaEl) {
    cMetaEl.textContent = `${result.width}×${result.height} · ${formatIdLabel(result.format)} · ${result.frameCount} frame${result.frameCount === 1 ? "" : "s"} · ${result.elementType}`;
  }
  setHidden(cMetaEl, false);
  if (downloadCBtn) downloadCBtn.disabled = false;

  if (showSuccess) {
    showSuccessBanner("C array ready.");
  }
}

/**
 * @param {{ showSuccess?: boolean }} [options]
 */
function runConvert(options = {}) {
  if (isSvgToC()) void runConvertSvgToC(options);
  else runConvertCToSvg(options);
}

try {
  directionControl = initSegmentedControl(document.getElementById("direction-control"), {
    onChange: ({ value }) => {
      setDirection(/** @type {"c-to-svg" | "svg-to-c"} */ (value || "c-to-svg"));
    },
  });

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

  animateFramesToggle = initToggle(document.getElementById("animate-frames-toggle"), {
    onChange: () => {
      updateFrameStepper(lastFrameCount);
      onOptionChange();
    },
  });

  frameDurationStepper = initStepper(document.getElementById("frame-duration-stepper"), {
    onChange: onOptionChange,
  });

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

  sourceDropzone = initFileDropzone(document.getElementById("source-dropzone"), {
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

  svgDropzone = initFileDropzone(document.getElementById("svg-dropzone"), {
    onFiles: ({ files }) => {
      const file = files[0];
      if (!file) return;
      if (!/\.svg$/i.test(file.name)) {
        showError(`Expected an .svg file (got “${file.name}”).`);
        return;
      }
      void loadSvgFile(file);
    },
    onClear: () => {
      if (ignoringSvgDropzoneClear) return;
      svgFromFile = false;
      downloadCFilename = "converted.c";
      if (svgTextarea) svgTextarea.value = "";
      syncSvgActionVisibility();
      clearCOutput();
      hideBanner(errorBanner);
      hideBanner(successBanner);
      hideBanner(warningBanner);
    },
    onError: ({ message }) => showError(message || "File upload failed."),
  });

  if (!sourceDropzone) {
    showError("File upload control failed to initialize.");
  }

  downloadSvgBtn?.addEventListener("click", triggerSvgDownload);
  downloadCBtn?.addEventListener("click", triggerCDownload);
  clearSourceBtn?.addEventListener("click", clearSourceInputs);
  clearSvgBtn?.addEventListener("click", clearSvgInputs);
  loadExampleBtn?.addEventListener("click", loadExampleSource);
  arrayNameInput?.addEventListener("input", onOptionChange);

  syncSourceActionVisibility();
  syncSvgActionVisibility();
  setDirection(
    /** @type {"c-to-svg" | "svg-to-c"} */ (
      directionControl?.getValue() ?? "c-to-svg"
    )
  );

  window.addEventListener("pageshow", syncSourceActionVisibility);
  window.setTimeout(syncSourceActionVisibility, 0);

  sourceTextarea?.addEventListener("paste", () => {
    sourceChangeFromPaste = true;
  });

  sourceTextarea?.addEventListener("input", () => {
    const fromPaste = sourceChangeFromPaste;
    sourceChangeFromPaste = false;
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

  svgTextarea?.addEventListener("paste", () => {
    svgChangeFromPaste = true;
  });

  svgTextarea?.addEventListener("input", () => {
    const fromPaste = svgChangeFromPaste;
    svgChangeFromPaste = false;
    clearFileIfEditingSvg();
    syncSvgActionVisibility();
    window.clearTimeout(convertTimer);

    if (!svgTextarea.value.trim()) {
      clearCOutput();
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
