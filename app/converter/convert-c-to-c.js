/**
 * High-level C array → C array conversion (repack + optional output scale).
 */

import { parseCArray, sliceFrameValues } from "./parse-c-array.js";
import { resolveFormat } from "./detect-format.js";
import {
  frameValueCount,
  indexedBitsPerPixel,
  isManualFormat,
} from "./formats.js";
import { decodePixels } from "./decode-pixels.js";
import { buildPalette, encodePixels } from "./encode-pixels.js";
import { resizePixels } from "./resize-pixels.js";
import { previewSvgFromEncoded } from "./preview-from-encoded.js";
import { toCArray } from "./to-c-array.js";
import {
  prepareFramesForOpaqueFormat,
  warningsForCollapsedFrames,
} from "./matte-pixels.js";

/**
 * @param {number} size
 * @param {number} scale
 */
function scaledSize(size, scale) {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return Math.max(1, Math.round(size * s));
}

/**
 * @typedef {object} ConvertCToCOptions
 * @property {string} source
 * @property {string} [inputFormat]
 * @property {string} [outputFormat]
 * @property {"msb" | "lsb"} [bitOrder]
 * @property {number | null} [width] Input width when source defines are missing
 * @property {number | null} [height] Input height when source defines are missing
 * @property {number} [scale] Output scale factor (nearest-neighbour resize)
 * @property {string} [arrayName]
 * @property {number} [frameIndex] Used when animateFrames is false
 * @property {boolean} [animateFrames] Keep all frames (default true when multi-frame)
 * @property {number} [frameDurationMs] Preview animation frame duration
 * @property {string} [backgroundColor] Matte for transparent pixels when output format has no alpha
 */

/**
 * @typedef {object} ConvertCToCResult
 * @property {string | null} source
 * @property {string | null} previewSvg
 * @property {number} width
 * @property {number} height
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {number} scale
 * @property {number} frameCount Output frame count in the C array
 * @property {number} sourceFrameCount Frame count in the input array
 * @property {number} frameIndex
 * @property {boolean} animated
 * @property {boolean} hadTransparency Source frames included transparent pixels
 * @property {boolean} flattenedTransparency Transparency was composited onto backgroundColor
 * @property {string} inputFormat
 * @property {string | null} detectedFormat
 * @property {string} outputFormat
 * @property {string} elementType
 * @property {string[]} warnings
 * @property {string | null} error
 */

/**
 * @param {ConvertCToCOptions} options
 * @returns {ConvertCToCResult}
 */
export function convertCToC({
  source,
  inputFormat: inputSelection = "auto",
  outputFormat: outputSelection = "argb32",
  bitOrder = "msb",
  width: widthOverride = null,
  height: heightOverride = null,
  scale = 1,
  arrayName = "image",
  frameIndex = 0,
  animateFrames = true,
  frameDurationMs = 100,
  backgroundColor = "#000000",
}) {
  const parsed = parseCArray(source);
  const decodeWidth = parsed.width ?? widthOverride;
  const decodeHeight = parsed.height ?? heightOverride;
  const { format: inputFormat, detected } = resolveFormat(inputSelection, {
    elementType: parsed.elementType,
    palette: parsed.palette,
    width: decodeWidth,
    height: decodeHeight,
    valueCount: parsed.values.length,
    frameCount: parsed.frameCount,
    colorCount: parsed.colorCount,
  });
  const outputFormat =
    outputSelection &&
    outputSelection !== "auto" &&
    isManualFormat(outputSelection)
      ? outputSelection
      : "argb32";

  const resolvedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const duration = Number.isFinite(frameDurationMs)
    ? Math.max(16, frameDurationMs)
    : 100;

  /** @type {ConvertCToCResult} */
  const result = {
    source: null,
    previewSvg: null,
    width: 0,
    height: 0,
    sourceWidth: decodeWidth ?? 0,
    sourceHeight: decodeHeight ?? 0,
    scale: resolvedScale,
    frameCount: parsed.frameCount,
    sourceFrameCount: parsed.frameCount,
    frameIndex: 0,
    animated: false,
    hadTransparency: false,
    flattenedTransparency: false,
    inputFormat,
    detectedFormat: detected,
    outputFormat,
    elementType: "uint8_t",
    warnings: [...parsed.warnings],
    error: null,
  };

  if (!decodeWidth || !decodeHeight || decodeWidth <= 0 || decodeHeight <= 0) {
    result.error =
      "Could not determine input width/height. Set them manually or include FRAME_WIDTH / FRAME_HEIGHT defines.";
    return result;
  }

  const outWidth = scaledSize(decodeWidth, resolvedScale);
  const outHeight = scaledSize(decodeHeight, resolvedScale);
  result.sourceWidth = decodeWidth;
  result.sourceHeight = decodeHeight;
  result.width = outWidth;
  result.height = outHeight;

  const frameSize = frameValueCount(inputFormat, decodeWidth, decodeHeight);
  const allValues = parsed.values;
  const expected = parsed.frameCount * frameSize;

  if (allValues.length < frameSize) {
    result.warnings.push(
      `Expected at least ${frameSize} values for one frame; found ${allValues.length}.`
    );
  } else if (parsed.frameCount === 1 && allValues.length > frameSize) {
    result.warnings.push(
      `Found ${allValues.length} values but frame size is ${frameSize}; using the first ${frameSize}.`
    );
  } else if (allValues.length < expected && parsed.frameCount > 1) {
    result.warnings.push(
      `Expected about ${expected} values for ${parsed.frameCount} frames; found ${allValues.length}.`
    );
  }

  const resolvedBitOrder = bitOrder === "lsb" ? "lsb" : "msb";
  const oneBitForeground = { r: 0, g: 0, b: 0, a: 255 };

  const keepAllFrames = parsed.frameCount > 1 && animateFrames !== false;
  const selectedIndex = Math.min(
    Math.max(0, Math.round(frameIndex ?? 0)),
    Math.max(0, parsed.frameCount - 1)
  );
  /** @type {number[]} */
  const frameIndices = keepAllFrames
    ? Array.from({ length: parsed.frameCount }, (_, i) => i)
    : [selectedIndex];

  result.sourceFrameCount = parsed.frameCount;
  result.frameCount = frameIndices.length;
  result.frameIndex = keepAllFrames ? 0 : selectedIndex;
  result.animated = keepAllFrames && frameIndices.length > 1;

  /** @type {(import("./decode-pixels.js").Rgba | null)[][]} */
  const frames = [];
  for (const i of frameIndices) {
    const values = sliceFrameValues(allValues, i, frameSize);
    const decoded = decodePixels({
      format: inputFormat,
      values,
      width: decodeWidth,
      height: decodeHeight,
      frameIndex: 0,
      oneBitForeground,
      bitOrder: resolvedBitOrder,
      palette: parsed.palette,
    });
    result.warnings.push(...decoded.warnings);
    const resized =
      outWidth === decodeWidth && outHeight === decodeHeight
        ? decoded.pixels
        : resizePixels(
            decoded.pixels,
            decodeWidth,
            decodeHeight,
            outWidth,
            outHeight
          );
    frames.push(resized);
  }

  if (!frames.length) {
    result.error = "No frames to encode.";
    return result;
  }

  const prepared = prepareFramesForOpaqueFormat({
    frames,
    format: outputFormat,
    backgroundColor,
    animated: result.animated,
  });
  result.hadTransparency = prepared.hadTransparency;
  result.flattenedTransparency = prepared.flattenedTransparency;
  result.warnings.push(...prepared.warnings);
  const encodeFrames = prepared.frames;

  /** @type {import("./encode-pixels.js").BuiltPalette | null} */
  let sharedPalette = null;
  const indexedBpp = indexedBitsPerPixel(outputFormat);
  if (indexedBpp !== null) {
    sharedPalette = buildPalette(encodeFrames.flat(), 1 << indexedBpp);
    result.warnings.push(...sharedPalette.warnings);
  }

  /** @type {number[][]} */
  const encodedFrames = [];
  /** @type {number[] | null} */
  let palette = null;
  let elementType = "uint32_t";

  for (const pixels of encodeFrames) {
    const encoded = encodePixels({
      format: outputFormat,
      pixels,
      width: outWidth,
      height: outHeight,
      bitOrder: resolvedBitOrder,
      sharedPalette,
    });
    result.warnings.push(...encoded.warnings);
    encodedFrames.push(encoded.values);
    elementType = encoded.elementType;
    if (encoded.palette) palette = encoded.palette;
  }

  if (result.flattenedTransparency) {
    result.warnings.push(
      ...warningsForCollapsedFrames(encodedFrames, result.animated)
    );
  }

  result.elementType = elementType;
  result.source = toCArray({
    arrayName,
    width: outWidth,
    height: outHeight,
    elementType,
    frames: encodedFrames,
    palette,
  });

  if (encodedFrames.length > 0) {
    const preview = previewSvgFromEncoded({
      format: outputFormat,
      frames: encodedFrames,
      width: outWidth,
      height: outHeight,
      bitOrder: resolvedBitOrder,
      palette,
      frameDurationMs: duration,
    });
    result.previewSvg = preview.svg;
    result.warnings.push(...preview.warnings);
  }

  result.warnings = [...new Set(result.warnings)];
  return result;
}
