import { initShell } from "./shell/shell.js";
import { setHidden } from "./utils/dom.js";
import { copyText } from "./utils/clipboard.js";
import { initFileDropzone } from "./components/file-dropzone.js";
import { downloadFile } from "./components/file-download.js";
import { initSegmentedControl } from "./components/segmented-control.js";
import { initDropdown } from "./components/dropdown.js";
import { initStepper } from "./components/stepper.js";
import { initToggle } from "./components/toggle.js";
import { initColorInput } from "./components/color-input.js";
import { initImagePreview } from "./components/image-preview.js";
import { initExpandableSurfaces } from "./components/expandable-surface.js";
import { initCodeBlock } from "./components/code-block.js";
import { initDialog } from "./components/dialog.js";
import {
  prepareButtonLabelFlash,
  setButtonLabelFlash,
  flashButtonLabel,
} from "./utils/button-label.js";
import { showBanner, hideBanner } from "./components/banner.js";
import { convertCToSvg } from "./converter/convert.js";
import { convertSvgToCAsync } from "./converter/convert-svg-to-c.js";
import { convertCToC } from "./converter/convert-c-to-c.js";
import { parseCArray } from "./converter/parse-c-array.js";
import { countSvgFrames } from "./converter/svg-to-pixels.js";
import {
  FORMAT_CATALOGUE,
  FORMAT_GROUP_LABELS,
  elementTypeForFormat,
  formatLabel as formatIdLabel,
  formatLabelWithType,
  formatNeedsBitOrder,
  formatPreservesAlpha,
} from "./converter/formats.js";
import { EXAMPLE_SOURCE } from "./examples/example-heart.js";
import { EXAMPLE_SVG } from "./examples/example-svg.js";

initShell({ pageNav: false, headingLinks: false });

const DIRECTION_STORAGE_KEY = "cpp-image-converter-direction";
/** @type {ReadonlySet<"c-to-svg" | "svg-to-c" | "c-to-c">} */
const DIRECTIONS = new Set(["c-to-svg", "svg-to-c", "c-to-c"]);

/**
 * @returns {"c-to-svg" | "svg-to-c" | "c-to-c"}
 */
function loadStoredDirection() {
  const stored = localStorage.getItem(DIRECTION_STORAGE_KEY);
  if (stored && DIRECTIONS.has(/** @type {"c-to-svg" | "svg-to-c" | "c-to-c"} */ (stored))) {
    return /** @type {"c-to-svg" | "svg-to-c" | "c-to-c"} */ (stored);
  }
  return "c-to-svg";
}

/**
 * @param {"c-to-svg" | "svg-to-c" | "c-to-c"} value
 */
function persistDirection(value) {
  localStorage.setItem(DIRECTION_STORAGE_KEY, value);
  document.documentElement.dataset.converterDirection = value;
}

const sourceCodeBlockEl = document.getElementById("source-code-block");
const svgSourceCodeBlockEl = document.getElementById("svg-source-code-block");
const arrayNameInput = document.getElementById("array-name-input");
const clearSourceBtn = document.getElementById("clear-source-btn");
const clearSvgBtn = document.getElementById("clear-svg-btn");
const loadExampleBtn = document.getElementById("load-example-btn");
const loadExampleSvgBtn = document.getElementById("load-example-svg-btn");
const overwriteDialogEl = document.getElementById("overwrite-dialog");
const confirmOverwriteBtn = document.getElementById("confirm-overwrite-btn");
const formatTypeLabelEl = document.getElementById("format-type-label");
const downloadSvgBtn = document.getElementById("download-svg-btn");
const downloadCBtn = document.getElementById("download-c-btn");
const copyOutputBtn = document.getElementById("copy-output-btn");
const outputFileSizeEl = document.getElementById("output-file-size");
const previewEl = document.getElementById("svg-preview");
const svgOutputCodeBlockEl = document.getElementById("svg-output-code-block");
const cOutputCodeBlockEl = document.getElementById("c-output-code-block");
const cPreviewEl = document.getElementById("c-preview");
const cPreviewEmptyEl = document.getElementById("c-preview-empty");
const cInputPanel = document.getElementById("c-input-panel");
const sourceDropzoneEl = document.getElementById("source-dropzone");
const svgInputPanel = document.getElementById("svg-input-panel");
const svgDropzoneEl = document.getElementById("svg-dropzone");
const svgOutputPanel = document.getElementById("svg-output-panel");
const cOutputPanel = document.getElementById("c-output-panel");
let frameStepperEl = document.getElementById("frame-stepper");
const frameFpsStepperEl = document.getElementById("frame-fps-stepper");
const animateOptionsWrapEl = document.getElementById("animate-options-wrap");
const backgroundColorPickerEl = document.getElementById("background-color-picker");
const backgroundOptionsRowEl = document.getElementById("svg-to-c-options-row");
const bitOrderWrapEl = document.getElementById("bit-order-wrap");
const formatDropdownLabelEl = document.getElementById("format-dropdown-label");
const formatLabelEl = document.getElementById("format-label");
const outputFormatWrapEl = document.getElementById("output-format-wrap");
const outputFormatDropdownLabelEl = document.getElementById(
  "output-format-dropdown-label"
);
const outputFormatTypeLabelEl = document.getElementById("output-format-type-label");

const previewApi = initImagePreview(previewEl);
const cPreviewApi = initImagePreview(cPreviewEl);
/** @type {ReturnType<typeof initCodeBlock>} */
let sourceCodeBlock = null;
/** @type {ReturnType<typeof initCodeBlock>} */
let cOutputCodeBlock = null;
/** @type {ReturnType<typeof initCodeBlock>} */
let svgOutputCodeBlock = null;
/** @type {ReturnType<typeof initCodeBlock>} */
let svgSourceCodeBlock = null;

const errorBanner = document.getElementById("converter-error");
const errorBody = document.getElementById("converter-error-body");
const warningBanner = document.getElementById("converter-warning");
const warningBody = document.getElementById("converter-warning-body");
const optionsWarningBanner = document.getElementById("converter-options-warning");
const optionsWarningBody = document.getElementById(
  "converter-options-warning-body"
);
const successBanner = document.getElementById("converter-success");

/** Warnings about output format / palette limits (shown under Options). */
function isOptionsWarning(message) {
  return (
    message.includes("Indexed format keeps") ||
    message.includes("will be remapped to palette index") ||
    message.includes("has no alpha") ||
    message.includes("frames unique after flatten")
  );
}

function hideWarningBanners() {
  hideBanner(warningBanner);
  hideBanner(optionsWarningBanner);
}

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
/** @type {"c-to-svg" | "svg-to-c" | "c-to-c"} */
let direction = "c-to-svg";
/** Skip stepper-driven reconvert while syncing size from source defines */
let applyingMetadata = false;
let convertTimer = 0;
let svgChangeFromPaste = false;

/** @type {string} */
let selectedFormat = "auto";
/** @type {string} */
let selectedOutputFormat = "argb32";
/** @type {ReturnType<typeof initSegmentedControl>} */
let directionControl = null;
/** @type {ReturnType<typeof initSegmentedControl>} */
let bitOrderControl = null;
/** @type {ReturnType<typeof initDialog>} */
let overwriteDialog = null;
/** @type {ReturnType<typeof initStepper>} */
let widthStepper = null;
/** @type {ReturnType<typeof initStepper>} */
let heightStepper = null;
/** @type {ReturnType<typeof initStepper>} */
let scaleStepper = null;
/** @type {ReturnType<typeof initStepper>} */
let frameStepper = null;
let frameStepperMax = null;
/** @type {ReturnType<typeof initToggle>} */
let animateFramesToggle = null;
/** @type {ReturnType<typeof initStepper>} */
let frameFpsStepper = null;
/** @type {ReturnType<typeof initToggle>} */
let overrideToggle = null;
/** @type {ReturnType<typeof initToggle>} */
let minifyToggle = null;
/** @type {ReturnType<typeof initColorInput>} */
let fillPicker = null;
/** @type {ReturnType<typeof initColorInput>} */
let backgroundPicker = null;
/** Last conversion reported transparent pixels in the source frames */
let lastSourceHasTransparency = false;
/** @type {ReturnType<typeof initFileDropzone>} */
let sourceDropzone = null;
/** @type {ReturnType<typeof initFileDropzone>} */
let svgDropzone = null;
/** True while textarea content came from a loaded file */
let sourceFromFile = false;
let svgFromFile = false;
let pendingExampleLoad = null;
/** Skip clearing the textarea when we clear the dropzone ourselves */
let ignoringDropzoneClear = false;
let ignoringSvgDropzoneClear = false;
let sourceCodeObserverReady = false;
let svgSourceCodeObserverReady = false;
let suppressSourceCodeMutation = false;
let suppressSvgSourceCodeMutation = false;

function isSvgToC() {
  return direction === "svg-to-c";
}

function isCToC() {
  return direction === "c-to-c";
}

function writesC() {
  return isSvgToC() || isCToC();
}

/**
 * @param {number} fps
 * @returns {number}
 */
function fpsToFrameDurationMs(fps) {
  const value = Number.isFinite(fps) && fps > 0 ? fps : 10;
  return Math.max(16, Math.round(1000 / value));
}

function scheduleConvert() {
  window.clearTimeout(convertTimer);
  const source = isSvgToC()
    ? svgSourceCodeBlock?.getSource()
    : sourceCodeBlock?.getSource();
  if (!source?.trim()) return;
  convertTimer = window.setTimeout(() => {
    runConvert();
  }, 200);
}

function onOptionChange() {
  if (applyingMetadata) return;
  scheduleConvert();
}

function syncFillEnabled(enabled) {
  fillPicker?.setDisabled(!enabled);
}

/**
 * Output format used when writing C arrays.
 * @returns {string}
 */
function effectiveOutputFormat() {
  if (isCToC()) return selectedOutputFormat;
  if (isSvgToC()) {
    return selectedFormat === "auto" ? "argb32" : selectedFormat;
  }
  return selectedFormat;
}

/**
 * Show the background matte picker when the source has transparency and the
 * selected output format cannot store alpha.
 */
function syncBackgroundMatteVisibility() {
  const show =
    writesC() &&
    lastSourceHasTransparency &&
    !formatPreservesAlpha(effectiveOutputFormat());
  setHidden(backgroundColorPickerEl, !show);
  setHidden(backgroundOptionsRowEl, !show);
}

/**
 * @param {string} formatId
 * @param {string} [outputFormatId]
 */
function syncBitOrderVisibility(formatId, outputFormatId = selectedOutputFormat) {
  if (isCToC()) {
    const show =
      formatNeedsBitOrder(formatId === "auto" ? "1bit" : formatId) ||
      formatNeedsBitOrder(outputFormatId);
    setHidden(bitOrderWrapEl, !show);
    return;
  }
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
 * @param {string} [label]
 */
function setFormatSelection(value, label) {
  selectedFormat = value || "auto";
  if (formatDropdownLabelEl) {
    formatDropdownLabelEl.textContent =
      label ||
      (selectedFormat === "auto"
        ? "Auto"
        : formatIdLabel(selectedFormat));
  }
  if (formatTypeLabelEl) {
    formatTypeLabelEl.textContent = elementTypeForFormat(selectedFormat) ?? "Auto";
  }
  const menu = document.getElementById("format-dropdown-menu");
  menu?.querySelectorAll(".dropdown-menu-item").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.value === selectedFormat);
  });
  syncBitOrderVisibility(selectedFormat);
  syncBackgroundMatteVisibility();
}

/**
 * @param {string} value
 * @param {string} [label]
 */
function setOutputFormatSelection(value, label) {
  selectedOutputFormat = value || "argb32";
  if (outputFormatDropdownLabelEl) {
    outputFormatDropdownLabelEl.textContent =
      label || formatIdLabel(selectedOutputFormat);
  }
  if (outputFormatTypeLabelEl) {
    outputFormatTypeLabelEl.textContent =
      elementTypeForFormat(selectedOutputFormat) ?? "—";
  }
  const menu = document.getElementById("output-format-dropdown-menu");
  menu?.querySelectorAll(".dropdown-menu-item").forEach((item) => {
    item.classList.toggle(
      "is-selected",
      item.dataset.value === selectedOutputFormat
    );
  });
  syncBitOrderVisibility(selectedFormat, selectedOutputFormat);
  syncBackgroundMatteVisibility();
}

/**
 * @param {HTMLElement | null} menu
 * @param {{ includeAuto?: boolean, includeType?: boolean, selectedId: string }} options
 */
function fillFormatMenu(menu, { includeAuto = true, includeType = true, selectedId }) {
  if (!menu) return;
  menu.replaceChildren();
  /** @type {string | null} */
  let lastGroup = null;
  for (const format of FORMAT_CATALOGUE) {
    if (!includeAuto && format.id === "auto") continue;

    if (format.group && format.group !== lastGroup) {
      lastGroup = format.group;
      const groupLi = document.createElement("li");
      groupLi.setAttribute("role", "presentation");
      const groupLabel = document.createElement("div");
      groupLabel.className = "dropdown-menu-group";
      groupLabel.textContent = FORMAT_GROUP_LABELS[format.group] ?? format.group;
      groupLi.append(groupLabel);
      menu.append(groupLi);
    }

    const li = document.createElement("li");
    li.setAttribute("role", "none");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dropdown-menu-item";
    btn.setAttribute("role", "menuitem");
    btn.dataset.value = format.id;
    btn.textContent =
      format.id === "auto"
        ? format.label
        : includeType
          ? formatLabelWithType(format.id)
          : formatIdLabel(format.id);
    if (format.id === selectedId) {
      btn.classList.add("is-selected");
    }
    li.append(btn);
    menu.append(li);
  }
}

/**
 * Populate format menus from the catalogue.
 */
function populateFormatMenus() {
  fillFormatMenu(document.getElementById("format-dropdown-menu"), {
    includeAuto: true,
    includeType: false,
    selectedId: selectedFormat,
  });
  fillFormatMenu(document.getElementById("output-format-dropdown-menu"), {
    includeAuto: false,
    includeType: false,
    selectedId: selectedOutputFormat,
  });
}

/**
 * @param {"c-to-svg" | "svg-to-c" | "c-to-c"} next
 */
function setDirection(next) {
  direction =
    next === "svg-to-c" ? "svg-to-c" : next === "c-to-c" ? "c-to-c" : "c-to-svg";
  persistDirection(direction);
  const svgMode = isSvgToC();
  const cToC = isCToC();

  setHidden(cInputPanel, svgMode);
  setHidden(svgInputPanel, !svgMode);
  setHidden(svgOutputPanel, writesC());
  setHidden(cOutputPanel, !writesC());
  setHidden(downloadSvgBtn, writesC());
  setHidden(downloadCBtn, !writesC());
  setHidden(outputFormatWrapEl, !cToC);
  syncSourceActionVisibility();
  syncSvgActionVisibility();
  syncCopyEnabled();

  // Input width/height only for C sources; output scale is available in every mode
  document.querySelectorAll(".converter-needs-input-size").forEach((el) => {
    setHidden(el, svgMode);
  });

  document.querySelectorAll(".converter-c-to-svg-only").forEach((el) => {
    setHidden(el, svgMode || cToC);
  });
  document.querySelectorAll(".converter-c-to-c-only").forEach((el) => {
    setHidden(el, !cToC);
  });
  document.querySelectorAll(".converter-writes-c-only").forEach((el) => {
    setHidden(el, !writesC());
  });
  updateFrameStepper(1);

  if (formatLabelEl) {
    formatLabelEl.textContent = svgMode ? "Output type" : "Input type";
  }

  // Auto is for reading C; SVG→C output format stays manual
  const autoItem = document.querySelector(
    '#format-dropdown-menu [data-value="auto"]'
  );
  setHidden(autoItem?.closest("li") ?? autoItem, svgMode);
  if (svgMode && selectedFormat === "auto") {
    setFormatSelection("argb32", "ARGB32 (LE RGBA)");
  } else if (cToC) {
    setFormatSelection("auto", "Auto");
  }

  syncBitOrderVisibility(selectedFormat);
  lastSourceHasTransparency = false;
  syncBackgroundMatteVisibility();
  hideBanner(errorBanner);
  hideBanner(successBanner);
  hideWarningBanners();

  // Fresh inputs/outputs whenever the direction changes
  clearSourceInputs();
  clearSvgInputs();
  applyingMetadata = true;
  try {
    scaleStepper?.setValue(1);
  } finally {
    applyingMetadata = false;
  }
  if (cPreviewEmptyEl) {
    cPreviewEmptyEl.textContent = cToC
      ? "Converted preview will appear here."
      : "SVG preview will appear here.";
  }
}

/**
 * Reset width/height to blank when there is no source size to show.
 */
function clearSizeSteppers() {
  applyingMetadata = true;
  try {
    widthStepper?.setValue(1);
    heightStepper?.setValue(1);
    widthStepper?.setDisabled(false);
    heightStepper?.setDisabled(false);
  } finally {
    applyingMetadata = false;
  }
}

/**
 * @param {string} source
 */
function applySourceMetadata(source) {
  if (!source?.trim()) {
    clearSizeSteppers();
    updateFrameStepper(1);
    return;
  }

  const parsed = parseCArray(source);
  applyingMetadata = true;
  try {
    const hasWidth = Boolean(parsed.width);
    const hasHeight = Boolean(parsed.height);

    // Width/height are input decode size (locked when defines are present)
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
function ensureFrameStepperMax(maxIndex) {
  if (frameStepper && frameStepperMax === maxIndex) return;

  const currentValue = frameStepper?.getValue() ?? 0;
  const nextValue = currentValue > maxIndex ? 0 : currentValue;

  if (frameStepper) {
    const nextEl = /** @type {HTMLElement} */ (frameStepperEl.cloneNode(true));
    nextEl.dataset.stepperMax = String(maxIndex);
    frameStepperEl.replaceWith(nextEl);
    frameStepperEl = nextEl;
  } else {
    frameStepperEl.dataset.stepperMax = String(maxIndex);
  }

  frameStepper = initStepper(frameStepperEl, {
    max: maxIndex,
    defaultValue: nextValue,
    onChange: onOptionChange,
  });
  frameStepperMax = maxIndex;
}

function updateFrameStepper(frameCount) {
  const wasMulti = lastFrameCount > 1;
  lastFrameCount = Math.max(1, frameCount || 1);

  const multi = lastFrameCount > 1;
  setHidden(animateOptionsWrapEl, !multi);

  if (!multi) {
    ensureFrameStepperMax(0);
    frameStepper?.setValue(0);
    if (animateFramesToggle?.getChecked()) {
      animateFramesToggle.setChecked(false, { emit: false });
    }
    setHidden(frameStepperEl, true);
    setHidden(frameFpsStepperEl, true);
    return;
  }

  // Newly multi-frame source → animate by default
  if (!wasMulti && animateFramesToggle && !animateFramesToggle.getChecked()) {
    animateFramesToggle.setChecked(true, { emit: false });
  }

  const animate = Boolean(animateFramesToggle?.getChecked());
  setHidden(frameStepperEl, animate);
  setHidden(frameFpsStepperEl, !animate);

  const maxIndex = lastFrameCount - 1;
  ensureFrameStepperMax(maxIndex);

  if (animate) return;

  let current = Math.round(frameStepper?.getValue() ?? 0);
  if (current > maxIndex) current = 0;
  frameStepper?.setValue(current);
}

/**
 * @param {string} source
 */
function applySvgSourceMetadata(source) {
  if (!source?.trim()) {
    updateFrameStepper(1);
    return;
  }
  updateFrameStepper(countSvgFrames(source));
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
  hideWarningBanners();
  hideBanner(successBanner);
  if (errorBody) errorBody.textContent = message;
  showBanner(errorBanner);
}

/**
 * @param {string[]} warnings
 */
function showWarnings(warnings) {
  const unique = [...new Set(warnings)];
  const optionsWarnings = unique.filter(isOptionsWarning);
  const inputWarnings = unique.filter((w) => !isOptionsWarning(w));

  if (optionsWarnings.length) {
    if (optionsWarningBody) {
      optionsWarningBody.textContent = optionsWarnings.join(" ");
    }
    showBanner(optionsWarningBanner);
  } else {
    hideBanner(optionsWarningBanner);
  }

  if (inputWarnings.length) {
    if (warningBody) warningBody.textContent = inputWarnings.join(" ");
    showBanner(warningBanner);
  } else {
    hideBanner(warningBanner);
  }
}

function syncCopyEnabled() {
  const hasOutput = writesC() ? Boolean(latestC) : Boolean(latestSvg);
  if (copyOutputBtn) copyOutputBtn.disabled = !hasOutput;
}

/**
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {string | null} content
 */
function syncOutputFileSize(content) {
  if (!outputFileSizeEl) return;
  if (!content) {
    outputFileSizeEl.textContent = "";
    setHidden(outputFileSizeEl, true);
    return;
  }
  outputFileSizeEl.textContent = `Output size: ${formatFileSize(
    new Blob([content]).size
  )}`;
  setHidden(outputFileSizeEl, false);
}

function clearPreview() {
  latestSvg = null;
  syncOutputFileSize(null);
  previewApi?.setMetaExtra("");
  previewApi?.clear();
  svgOutputCodeBlock?.setSource("");
  if (downloadSvgBtn) downloadSvgBtn.disabled = true;
  syncCopyEnabled();
}

function clearCPreview() {
  cPreviewApi?.clear();
}

function clearCOutput() {
  latestC = null;
  syncOutputFileSize(null);
  cOutputCodeBlock?.setSource("");
  clearCPreview();
  if (downloadCBtn) downloadCBtn.disabled = true;
  syncCopyEnabled();
}

/**
 * @returns {string}
 */
function getBackgroundColor() {
  return backgroundPicker?.getValue() ?? "#000000";
}

/**
 * @param {{ hadTransparency?: boolean } | null | undefined} result
 */
function updateTransparencyState(result) {
  lastSourceHasTransparency = Boolean(result?.hadTransparency);
  syncBackgroundMatteVisibility();
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

async function triggerCopyOutput() {
  if (!copyOutputBtn || copyOutputBtn.disabled) return;
  const text = writesC() ? latestC : latestSvg;
  if (!text) return;

  const restoreLabel = () => {
    setButtonLabelFlash(copyOutputBtn, "Copy code");
    copyOutputBtn.setAttribute("aria-label", "Copy code");
  };

  try {
    await copyText(text);
    flashButtonLabel(copyOutputBtn, true, {
      durationMs: 2000,
      reset: restoreLabel,
    });
  } catch {
    flashButtonLabel(copyOutputBtn, false, {
      durationMs: 2000,
      reset: restoreLabel,
    });
  }
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
  const hasSource = Boolean(sourceCodeBlock?.getSource());
  if (clearSourceBtn) clearSourceBtn.disabled = !hasSource;
  setHidden(sourceDropzoneEl, hasSource);
}

function setSourceCode(next) {
  if (!sourceCodeBlock) return;
  const value = String(next ?? "").replace(/\n+$/, "");
  suppressSourceCodeMutation =
    sourceCodeObserverReady && sourceCodeBlock.getSource() !== value;
  sourceCodeBlock.setSource(value);
}

function moveSourceActionsToCodeToolbar() {
  const toolbar = sourceCodeBlockEl?.querySelector(".code-block-toolbar");
  const leftGroup = toolbar?.querySelector(".code-block-toolbar__group--left");
  const rightGroup = toolbar?.querySelector(".code-block-toolbar__group--right");
  if (!leftGroup || !rightGroup) return;

  if (clearSourceBtn) leftGroup.appendChild(clearSourceBtn);
  if (loadExampleBtn) rightGroup.appendChild(loadExampleBtn);
}

function moveSvgActionsToCodeToolbar() {
  const toolbar = svgSourceCodeBlockEl?.querySelector(".code-block-toolbar");
  const leftGroup = toolbar?.querySelector(".code-block-toolbar__group--left");
  const rightGroup = toolbar?.querySelector(".code-block-toolbar__group--right");
  if (!leftGroup || !rightGroup) return;

  if (clearSvgBtn) leftGroup.appendChild(clearSvgBtn);
  if (loadExampleSvgBtn) rightGroup.appendChild(loadExampleSvgBtn);
}

function syncSvgActionVisibility() {
  const hasSvg = Boolean(svgSourceCodeBlock?.getSource());
  if (clearSvgBtn) clearSvgBtn.disabled = !hasSvg;
  setHidden(svgDropzoneEl, hasSvg);
}

function setSvgSourceCode(next) {
  if (!svgSourceCodeBlock) return;
  const value = String(next ?? "").replace(/\n+$/, "");
  suppressSvgSourceCodeMutation =
    svgSourceCodeObserverReady && svgSourceCodeBlock.getSource() !== value;
  svgSourceCodeBlock.setSource(value);
}

function clearSourceInputs() {
  sourceFromFile = false;
  downloadFilename = "converted.svg";
  if (isCToC()) downloadCFilename = "converted.c";
  setSourceCode("");
  ignoringDropzoneClear = true;
  try {
    sourceDropzone?.clear();
  } finally {
    ignoringDropzoneClear = false;
  }
  syncSourceActionVisibility();
  clearSizeSteppers();
  updateFrameStepper(1);
  clearPreview();
  if (writesC()) clearCOutput();
  hideBanner(errorBanner);
  hideBanner(successBanner);
  hideWarningBanners();
}

function clearSvgInputs() {
  svgFromFile = false;
  downloadCFilename = "converted.c";
  setSvgSourceCode("");
  ignoringSvgDropzoneClear = true;
  try {
    svgDropzone?.clear();
  } finally {
    ignoringSvgDropzoneClear = false;
  }
  syncSvgActionVisibility();
  updateFrameStepper(1);
  clearCOutput();
  hideBanner(errorBanner);
  hideBanner(successBanner);
  hideWarningBanners();
}

/**
 * @param {File} file
 */
async function loadSourceFile(file) {
  try {
    const text = await readFileText(file);
    if (!sourceCodeBlock) {
      showError("Source code block is missing.");
      return;
    }
    sourceFromFile = true;
    setSourceCode(text);
    syncSourceActionVisibility();
    const base = file.name.replace(/\.(c|h|txt)$/i, "");
    if (isCToC()) {
      downloadCFilename = `${base}-packed.c`;
    } else {
      downloadFilename = `${base}.svg`;
    }
    runConvert();
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
    if (!svgSourceCodeBlock) {
      showError("SVG code block is missing.");
      return;
    }
    svgFromFile = true;
    setSvgSourceCode(text);
    syncSvgActionVisibility();
    downloadCFilename = file.name.replace(/\.svg$/i, "") + ".c";
    runConvert();
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

function requestExampleLoad(load) {
  pendingExampleLoad = load;
  if (!overwriteDialog) {
    pendingExampleLoad = null;
    showError("Overwrite confirmation failed to initialize.");
    return;
  }
  overwriteDialog.openDialog();
}

/**
 * @param {{ confirmed?: boolean }} [options]
 */
function loadExampleSource({ confirmed = false } = {}) {
  if (!sourceCodeBlock) {
    showError("Source code block is missing.");
    return;
  }
  if (sourceCodeBlock.getSource().trim() && !confirmed) {
    requestExampleLoad(() => loadExampleSource({ confirmed: true }));
    return;
  }
  clearFileIfEditingSource();
  setSourceCode(EXAMPLE_SOURCE);
  syncSourceActionVisibility();
  if (isCToC()) {
    downloadCFilename = "example-packed.c";
  } else {
    downloadFilename = "example.svg";
  }
  runConvert();
}

/**
 * @param {{ confirmed?: boolean }} [options]
 */
function loadExampleSvg({ confirmed = false } = {}) {
  if (!svgSourceCodeBlock) {
    showError("SVG code block is missing.");
    return;
  }
  if (svgSourceCodeBlock.getSource().trim() && !confirmed) {
    requestExampleLoad(() => loadExampleSvg({ confirmed: true }));
    return;
  }
  clearFileIfEditingSvg();
  setSvgSourceCode(EXAMPLE_SVG);
  syncSvgActionVisibility();
  downloadCFilename = "example.c";
  runConvert();
}

function clearFileIfEditingSource() {
  if (!sourceFromFile) return;
  sourceFromFile = false;
  downloadFilename = "converted.svg";
  if (isCToC()) downloadCFilename = "converted.c";
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

function runConvertCToSvg() {
  const source = sourceCodeBlock?.getSource() ?? "";
  if (!source.trim()) {
    clearPreview();
    hideBanner(errorBanner);
    hideBanner(successBanner);
    hideWarningBanners();
    clearSizeSteppers();
    updateFrameStepper(1);
    return;
  }

  applySourceMetadata(source);
  hideBanner(errorBanner);

  const parsedHint = parseCArray(source);
  const widthRaw = widthStepper?.getValue();
  const heightRaw = heightStepper?.getValue();
  const widthFromUi = Number.isFinite(widthRaw) ? Math.round(widthRaw) : 0;
  const heightFromUi = Number.isFinite(heightRaw) ? Math.round(heightRaw) : 0;
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
      frameDurationMs: fpsToFrameDurationMs(frameFpsStepper?.getValue() ?? 10),
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
  syncOutputFileSize(result.svg);
  showWarnings(result.warnings);

  if (previewEl) {
    previewEl.dataset.imagePreviewDownloadName = downloadFilename;
  }
  if (!previewApi?.setSvg(result.svg)) {
    showError("Preview failed: generated SVG could not be displayed.");
    clearPreview();
    return;
  }

  svgOutputCodeBlock?.setSource(result.svg);
  previewApi?.setMetaExtra(
    `${result.rectCount} shape${result.rectCount === 1 ? "" : "s"}`
  );
  if (downloadSvgBtn) downloadSvgBtn.disabled = false;
  syncCopyEnabled();

}

/**
 * @param {string | null | undefined} svgMarkup
 */
function showCPreviewSvg(svgMarkup) {
  clearCPreview();
  if (!svgMarkup) return;
  cPreviewApi?.setSvg(svgMarkup);
}

async function runConvertSvgToC() {
  const source = svgSourceCodeBlock?.getSource() ?? "";
  if (!source.trim()) {
    clearCOutput();
    hideBanner(errorBanner);
    hideBanner(successBanner);
    hideWarningBanners();
    updateFrameStepper(1);
    updateTransparencyState(null);
    return;
  }

  applySvgSourceMetadata(source);
  hideBanner(errorBanner);

  let result;
  try {
    result = await convertSvgToCAsync({
      source,
      format: selectedFormat === "auto" ? "argb32" : selectedFormat,
      bitOrder: /** @type {"msb" | "lsb"} */ (
        bitOrderControl?.getValue() ?? "msb"
      ),
      scale: (() => {
        const scaleFromUi = Number(scaleStepper?.getValue() ?? 1);
        return Number.isFinite(scaleFromUi) && scaleFromUi > 0 ? scaleFromUi : 1;
      })(),
      arrayName: arrayNameInput?.value?.trim() || "image",
      overrideFill: overrideToggle?.getChecked() ?? false,
      fillColor: fillPicker?.getValue() ?? "#FFFFFF",
      frameIndex: getFrameIndex(),
      animateFrames: animateFramesToggle?.getChecked() ?? false,
      frameDurationMs: fpsToFrameDurationMs(frameFpsStepper?.getValue() ?? 10),
      backgroundColor: getBackgroundColor(),
    });
  } catch (err) {
    showError(
      err instanceof Error ? `Conversion failed: ${err.message}` : "Conversion failed."
    );
    clearCOutput();
    return;
  }

  updateFrameStepper(result.sourceFrameCount || result.frameCount);
  updateTransparencyState(result);

  if (result.error || !result.source) {
    showError(result.error || "Conversion failed.");
    clearCOutput();
    showWarnings(result.warnings);
    return;
  }

  latestC = result.source;
  syncOutputFileSize(result.source);
  cOutputCodeBlock?.setSource(result.source);
  showWarnings(result.warnings);
  showCPreviewSvg(result.previewSvg);
  if (downloadCBtn) downloadCBtn.disabled = false;
  syncCopyEnabled();

}

function runConvertCToC() {
  const source = sourceCodeBlock?.getSource() ?? "";
  if (!source.trim()) {
    clearCOutput();
    hideBanner(errorBanner);
    hideBanner(successBanner);
    hideWarningBanners();
    clearSizeSteppers();
    updateFrameStepper(1);
    updateTransparencyState(null);
    return;
  }

  applySourceMetadata(source);
  hideBanner(errorBanner);

  const parsedHint = parseCArray(source);
  const widthRaw = widthStepper?.getValue();
  const heightRaw = heightStepper?.getValue();
  const widthFromUi = Number.isFinite(widthRaw) ? Math.round(widthRaw) : 0;
  const heightFromUi = Number.isFinite(heightRaw) ? Math.round(heightRaw) : 0;
  const scaleFromUi = Number(scaleStepper?.getValue() ?? 1);
  const scale =
    Number.isFinite(scaleFromUi) && scaleFromUi > 0 ? scaleFromUi : 1;

  let result;
  try {
    result = convertCToC({
      source,
      inputFormat: selectedFormat,
      outputFormat: selectedOutputFormat,
      bitOrder: /** @type {"msb" | "lsb"} */ (
        bitOrderControl?.getValue() ?? "msb"
      ),
      width: widthFromUi > 0 ? widthFromUi : parsedHint.width,
      height: heightFromUi > 0 ? heightFromUi : parsedHint.height,
      scale,
      arrayName: arrayNameInput?.value?.trim() || "image",
      overrideFill: overrideToggle?.getChecked() ?? false,
      fillColor: fillPicker?.getValue() ?? "#FFFFFF",
      frameIndex: getFrameIndex(),
      animateFrames: animateFramesToggle?.getChecked() ?? false,
      frameDurationMs: fpsToFrameDurationMs(frameFpsStepper?.getValue() ?? 10),
      backgroundColor: getBackgroundColor(),
    });
  } catch (err) {
    showError(
      err instanceof Error ? `Conversion failed: ${err.message}` : "Conversion failed."
    );
    clearCOutput();
    return;
  }

  updateFrameStepper(result.sourceFrameCount || result.frameCount);
  updateTransparencyState(result);

  if (result.error || !result.source) {
    showError(result.error || "Conversion failed.");
    clearCOutput();
    showWarnings(result.warnings);
    return;
  }

  latestC = result.source;
  syncOutputFileSize(result.source);
  cOutputCodeBlock?.setSource(result.source);
  showWarnings(result.warnings);
  showCPreviewSvg(result.previewSvg);
  if (downloadCBtn) downloadCBtn.disabled = false;
  syncCopyEnabled();

}

function runConvert() {
  if (isSvgToC()) void runConvertSvgToC();
  else if (isCToC()) runConvertCToC();
  else runConvertCToSvg();
}

try {
  sourceCodeBlock = initCodeBlock(sourceCodeBlockEl);
  moveSourceActionsToCodeToolbar();
  svgSourceCodeBlock = initCodeBlock(svgSourceCodeBlockEl);
  moveSvgActionsToCodeToolbar();
  svgOutputCodeBlock = initCodeBlock(svgOutputCodeBlockEl);
  cOutputCodeBlock = initCodeBlock(cOutputCodeBlockEl);
  initExpandableSurfaces(document);

  directionControl = initSegmentedControl(document.getElementById("direction-control"), {
    defaultValue: loadStoredDirection(),
    onChange: ({ value }) => {
      setDirection(
        /** @type {"c-to-svg" | "svg-to-c" | "c-to-c"} */ (value || "c-to-svg")
      );
    },
  });

  populateFormatMenus();

  initDropdown(document.getElementById("format-dropdown"), {
    gridMin: 0,
    gridCols: 2,
    onSelect: ({ value, label }) => {
      setFormatSelection(value || "auto", label);
      onOptionChange();
    },
  });

  initDropdown(document.getElementById("output-format-dropdown"), {
    gridMin: 0,
    gridCols: 2,
    onSelect: ({ value, label }) => {
      setOutputFormatSelection(value || "argb32", label);
      onOptionChange();
    },
  });

  setFormatSelection("auto", "Auto");
  setOutputFormatSelection("argb32");

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
  frameStepperMax = Number(frameStepperEl?.dataset.stepperMax ?? 0);

  animateFramesToggle = initToggle(document.getElementById("animate-frames-toggle"), {
    onChange: () => {
      updateFrameStepper(lastFrameCount);
      onOptionChange();
    },
  });

  frameFpsStepper = initStepper(document.getElementById("frame-fps-stepper"), {
    onChange: onOptionChange,
  });

  fillPicker = initColorInput(document.getElementById("fill-color-picker"), {
    onChange: onOptionChange,
  });

  backgroundPicker = initColorInput(backgroundColorPickerEl, {
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

  if (copyOutputBtn) {
    prepareButtonLabelFlash(copyOutputBtn, {
      idle: "Copy code",
      success: "Copied",
      fail: "Failed",
    });
    copyOutputBtn.setAttribute("aria-label", "Copy code");
  }

  syncFillEnabled(overrideToggle?.getChecked() ?? false);

  overwriteDialog = initDialog({
    dialogEl: overwriteDialogEl,
    onClose: () => {
      pendingExampleLoad = null;
    },
  });
  confirmOverwriteBtn?.addEventListener("click", () => {
    const load = pendingExampleLoad;
    pendingExampleLoad = null;
    overwriteDialog?.closeDialog();
    load?.();
  });

  sourceDropzone = initFileDropzone(sourceDropzoneEl, {
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
      if (isCToC()) downloadCFilename = "converted.c";
      setSourceCode("");
      syncSourceActionVisibility();
      clearSizeSteppers();
      updateFrameStepper(1);
      clearPreview();
      if (writesC()) clearCOutput();
      hideBanner(errorBanner);
      hideBanner(successBanner);
      hideWarningBanners();
    },
    onError: ({ message }) => showError(message || "File upload failed."),
  });

  svgDropzone = initFileDropzone(svgDropzoneEl, {
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
      setSvgSourceCode("");
      syncSvgActionVisibility();
      updateFrameStepper(1);
      clearCOutput();
      hideBanner(errorBanner);
      hideBanner(successBanner);
      hideWarningBanners();
    },
    onError: ({ message }) => showError(message || "File upload failed."),
  });

  if (!sourceDropzone) {
    showError("File upload control failed to initialize.");
  }

  downloadSvgBtn?.addEventListener("click", triggerSvgDownload);
  downloadCBtn?.addEventListener("click", triggerCDownload);
  copyOutputBtn?.addEventListener("click", () => {
    void triggerCopyOutput();
  });
  clearSourceBtn?.addEventListener("click", clearSourceInputs);
  clearSvgBtn?.addEventListener("click", clearSvgInputs);
  loadExampleBtn?.addEventListener("click", loadExampleSource);
  loadExampleSvgBtn?.addEventListener("click", loadExampleSvg);
  arrayNameInput?.addEventListener("input", onOptionChange);

  syncSourceActionVisibility();
  syncSvgActionVisibility();
  setDirection(
    /** @type {"c-to-svg" | "svg-to-c" | "c-to-c"} */ (
      directionControl?.getValue() ?? "c-to-svg"
    )
  );

  window.addEventListener("pageshow", syncSourceActionVisibility);
  window.setTimeout(syncSourceActionVisibility, 0);

  const sourceCode = sourceCodeBlockEl?.querySelector("code");
  const svgSourceCode = svgSourceCodeBlockEl?.querySelector("code");
  const sourceObserver = sourceCode
    ? new MutationObserver(() => {
        if (suppressSourceCodeMutation) {
          suppressSourceCodeMutation = false;
          return;
        }
        clearFileIfEditingSource();
        syncSourceActionVisibility();
        window.clearTimeout(convertTimer);

        if (!sourceCodeBlock?.getSource().trim()) {
          if (isCToC()) clearCOutput();
          else clearPreview();
          clearSizeSteppers();
          hideBanner(errorBanner);
          return;
        }

        scheduleConvert();
      })
    : null;
  sourceObserver?.observe(sourceCode, {
    attributes: true,
    attributeFilter: ["data-source"],
  });
  sourceCodeObserverReady = Boolean(sourceObserver);

  const svgEditor = svgSourceCodeBlockEl?.querySelector(".code-block-editor");
  svgEditor?.addEventListener("paste", () => {
    svgChangeFromPaste = true;
    window.setTimeout(() => {
      svgChangeFromPaste = false;
    }, 0);
  });

  const svgSourceObserver = svgSourceCode
    ? new MutationObserver(() => {
        if (suppressSvgSourceCodeMutation) {
          suppressSvgSourceCodeMutation = false;
          return;
        }
        const fromPaste = svgChangeFromPaste;
        svgChangeFromPaste = false;
        clearFileIfEditingSvg();
        syncSvgActionVisibility();
        window.clearTimeout(convertTimer);

        if (!svgSourceCodeBlock?.getSource().trim()) {
          clearCOutput();
          updateFrameStepper(1);
          hideBanner(errorBanner);
          return;
        }

        if (fromPaste) {
          runConvert();
          return;
        }
        scheduleConvert();
      })
    : null;
  svgSourceObserver?.observe(svgSourceCode, {
    attributes: true,
    attributeFilter: ["data-source"],
  });
  svgSourceCodeObserverReady = Boolean(svgSourceObserver);
} catch (err) {
  showError(
    err instanceof Error
      ? `App failed to start: ${err.message}`
      : "App failed to start."
  );
}
