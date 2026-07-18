/**
 * High-level C array → SVG conversion.
 */

import { parseCArray, sliceFrameValues } from "./parse-c-array.js";
import { resolveFormat } from "./detect-format.js";
import { decodePixels, pixelColorKey, oneBitStride } from "./decode-pixels.js";
import { mergeRects } from "./merge-rects.js";
import { toSvg } from "./to-svg.js";

/**
 * @typedef {object} ConvertOptions
 * @property {string} source
 * @property {"auto" | "argb32" | "rgb565" | "1bit"} [format]
 * @property {number | null} [width]
 * @property {number | null} [height]
 * @property {number} [frameIndex]
 * @property {boolean} [overrideFill]
 * @property {string | null} [fillColor] `#RRGGBB`
 * @property {number} [displayScale]
 */

/**
 * @typedef {object} ConvertResult
 * @property {string | null} svg
 * @property {number} width
 * @property {number} height
 * @property {"argb32" | "rgb565" | "1bit"} format
 * @property {"argb32" | "rgb565" | "1bit" | null} detectedFormat
 * @property {number} frameCount
 * @property {number} frameIndex
 * @property {number} rectCount
 * @property {string | null} elementType
 * @property {string[]} warnings
 * @property {string | null} error
 */

/**
 * @param {ConvertOptions} options
 * @returns {ConvertResult}
 */
export function convertCToSvg({
  source,
  format: formatSelection = "auto",
  width: widthOverride = null,
  height: heightOverride = null,
  frameIndex = 0,
  overrideFill = false,
  fillColor = "#000000",
  displayScale = 10,
}) {
  const parsed = parseCArray(source);
  const { format, detected } = resolveFormat(formatSelection, parsed.elementType);

  const width = widthOverride ?? parsed.width;
  const height = heightOverride ?? parsed.height;

  /** @type {ConvertResult} */
  const result = {
    svg: null,
    width: width ?? 0,
    height: height ?? 0,
    format,
    detectedFormat: detected,
    frameCount: parsed.frameCount,
    frameIndex,
    rectCount: 0,
    elementType: parsed.elementType,
    warnings: [...parsed.warnings],
    error: null,
  };

  if (!width || !height || width <= 0 || height <= 0) {
    result.error =
      "Could not determine image width/height. Set them manually or include FRAME_WIDTH / FRAME_HEIGHT defines.";
    return result;
  }

  result.width = width;
  result.height = height;

  let values = parsed.values;
  const pixelCount = width * height;

  if (format === "argb32" || format === "rgb565") {
    const frameSize = pixelCount;
    const expected = parsed.frameCount * frameSize;
    if (values.length < frameSize) {
      result.warnings.push(
        `Expected at least ${frameSize} values for one frame; found ${values.length}.`
      );
    } else if (parsed.frameCount === 1 && values.length > frameSize) {
      result.warnings.push(
        `Found ${values.length} values but frame size is ${frameSize}; using the first ${frameSize}.`
      );
    } else if (values.length < expected && parsed.frameCount > 1) {
      result.warnings.push(
        `Expected about ${expected} values for ${parsed.frameCount} frames; found ${values.length}.`
      );
    }
    values = sliceFrameValues(values, frameIndex, frameSize);
  } else {
    const frameBytes = oneBitStride(width) * height;
    values = sliceFrameValues(values, frameIndex, frameBytes);
  }

  const fill =
    overrideFill && fillColor
      ? fillColor.toUpperCase().startsWith("#")
        ? fillColor.toUpperCase()
        : `#${fillColor.toUpperCase()}`
      : null;

  const oneBitForeground = fill
    ? {
        r: Number.parseInt(fill.slice(1, 3), 16),
        g: Number.parseInt(fill.slice(3, 5), 16),
        b: Number.parseInt(fill.slice(5, 7), 16),
        a: 255,
      }
    : { r: 0, g: 0, b: 0, a: 255 };

  const decoded = decodePixels({
    format,
    values,
    width,
    height,
    frameIndex: 0,
    oneBitForeground,
  });
  result.warnings.push(...decoded.warnings);

  const colorGrid = decoded.pixels.map((p) => pixelColorKey(p, fill));
  const rects = mergeRects(colorGrid, width, height);
  result.rectCount = rects.length;
  result.svg = toSvg({ width, height, rects, displayScale });

  return result;
}

export {
  parseCArray,
  resolveFormat,
  decodePixels,
  mergeRects,
  toSvg,
  pixelColorKey,
};
