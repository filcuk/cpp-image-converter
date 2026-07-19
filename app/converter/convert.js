/**
 * High-level C array → SVG conversion.
 */

import { parseCArray, sliceFrameValues } from "./parse-c-array.js";
import { resolveFormat } from "./detect-format.js";
import { frameValueCount, formatLabel } from "./formats.js";
import { decodePixels, pixelColorKey } from "./decode-pixels.js";
import { mergeRects } from "./merge-rects.js";
import { toSvg } from "./to-svg.js";
import { toAnimatedSvg } from "./to-animated-svg.js";

/**
 * @typedef {object} ConvertOptions
 * @property {string} source
 * @property {string} [format]
 * @property {"msb" | "lsb"} [bitOrder]
 * @property {number | null} [width]
 * @property {number | null} [height]
 * @property {number} [frameIndex]
 * @property {boolean} [overrideFill]
 * @property {string | null} [fillColor] `#RRGGBB`
 * @property {number} [displayScale]
 * @property {boolean} [minify]
 * @property {boolean} [animateFrames]
 * @property {number} [frameDurationMs]
 */

/**
 * @typedef {object} ConvertResult
 * @property {string | null} svg
 * @property {number} width
 * @property {number} height
 * @property {string} format
 * @property {string | null} detectedFormat
 * @property {number} frameCount
 * @property {number} frameIndex
 * @property {number} rectCount
 * @property {boolean} animated
 * @property {string | null} elementType
 * @property {string[]} warnings
 * @property {string | null} error
 */

/**
 * @param {object} options
 * @param {string} options.format
 * @param {number[]} options.allValues
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.frameIndex
 * @param {number} options.frameSize
 * @param {"msb" | "lsb"} options.bitOrder
 * @param {number[] | null} options.palette
 * @param {import("./decode-pixels.js").Rgba} options.oneBitForeground
 * @param {string | null} options.fill
 * @returns {{ rects: import("./merge-rects.js").MergedRect[], warnings: string[] }}
 */
function decodeFrameToRects({
  format,
  allValues,
  width,
  height,
  frameIndex,
  frameSize,
  bitOrder,
  palette,
  oneBitForeground,
  fill,
}) {
  const values = sliceFrameValues(allValues, frameIndex, frameSize);
  const decoded = decodePixels({
    format,
    values,
    width,
    height,
    frameIndex: 0,
    oneBitForeground,
    bitOrder,
    palette,
  });
  const colorGrid = decoded.pixels.map((p) => pixelColorKey(p, fill));
  const rects = mergeRects(colorGrid, width, height);
  return { rects, warnings: decoded.warnings };
}

/**
 * @param {ConvertOptions} options
 * @returns {ConvertResult}
 */
export function convertCToSvg({
  source,
  format: formatSelection = "auto",
  bitOrder = "msb",
  width: widthOverride = null,
  height: heightOverride = null,
  frameIndex = 0,
  overrideFill = false,
  fillColor = "#000000",
  displayScale = 10,
  minify = false,
  animateFrames = false,
  frameDurationMs = 100,
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
    animated: false,
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

  const frameSize = frameValueCount(format, width, height);
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

  const resolvedBitOrder = bitOrder === "lsb" ? "lsb" : "msb";
  const shouldAnimate = Boolean(animateFrames) && parsed.frameCount > 1;
  const duration = Number.isFinite(frameDurationMs)
    ? Math.max(16, frameDurationMs)
    : 100;

  if (shouldAnimate) {
    /** @type {import("./merge-rects.js").MergedRect[][]} */
    const frames = [];
    let totalRects = 0;
    for (let i = 0; i < parsed.frameCount; i++) {
      const { rects, warnings } = decodeFrameToRects({
        format,
        allValues,
        width,
        height,
        frameIndex: i,
        frameSize,
        bitOrder: resolvedBitOrder,
        palette: parsed.palette,
        oneBitForeground,
        fill,
      });
      result.warnings.push(...warnings);
      frames.push(rects);
      totalRects += rects.length;
    }
    result.rectCount = totalRects;
    result.animated = true;
    result.frameIndex = 0;
    result.svg = toAnimatedSvg({
      width,
      height,
      frames,
      displayScale,
      frameDurationMs: duration,
      minify,
    });
    result.warnings = [...new Set(result.warnings)];
    return result;
  }

  const { rects, warnings } = decodeFrameToRects({
    format,
    allValues,
    width,
    height,
    frameIndex,
    frameSize,
    bitOrder: resolvedBitOrder,
    palette: parsed.palette,
    oneBitForeground,
    fill,
  });
  result.warnings.push(...warnings);
  result.rectCount = rects.length;
  result.svg = toSvg({ width, height, rects, displayScale, minify });

  result.warnings = [...new Set(result.warnings)];
  return result;
}

export {
  parseCArray,
  resolveFormat,
  decodePixels,
  mergeRects,
  toSvg,
  toAnimatedSvg,
  pixelColorKey,
  formatLabel,
  frameValueCount,
};
