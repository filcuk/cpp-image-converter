/**
 * High-level SVG → C array conversion.
 */

import { svgToPixels, svgToPixelsAsync } from "./svg-to-pixels.js";
import { buildPalette, encodePixels } from "./encode-pixels.js";
import { resizePixels } from "./resize-pixels.js";
import { toCArray } from "./to-c-array.js";
import { previewSvgFromEncoded } from "./preview-from-encoded.js";
import { indexedBitsPerPixel, isManualFormat } from "./formats.js";
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
 * @typedef {object} ConvertSvgToCOptions
 * @property {string} source
 * @property {string} [format]
 * @property {"msb" | "lsb"} [bitOrder]
 * @property {number} [scale] Output scale factor (nearest-neighbour resize before encode)
 * @property {string} [arrayName]
 * @property {number} [frameIndex] Used when animateFrames is false
 * @property {boolean} [animateFrames] Keep all frames (default true when multi-frame)
 * @property {number} [frameDurationMs] Preview animation frame duration
 * @property {string} [backgroundColor] Matte for transparent pixels when format has no alpha
 */

/**
 * @typedef {object} ConvertSvgToCResult
 * @property {string | null} source
 * @property {string | null} previewSvg
 * @property {number} width
 * @property {number} height
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {number} scale
 * @property {number} frameCount Output frame count in the C array
 * @property {number} sourceFrameCount Frame count detected in the SVG
 * @property {number} frameIndex
 * @property {boolean} animated
 * @property {boolean} hadTransparency Source frames included transparent pixels
 * @property {boolean} flattenedTransparency Transparency was composited onto backgroundColor
 * @property {string} format
 * @property {string} elementType
 * @property {string[]} warnings
 * @property {string | null} error
 */

/**
 * @param {ConvertSvgToCOptions} options
 * @param {{
 *   width: number,
 *   height: number,
 *   frames: (import("./decode-pixels.js").Rgba | null)[][],
 *   warnings: string[],
 *   error: string | null
 * }} raster
 * @returns {ConvertSvgToCResult}
 */
function encodeRaster(options, raster) {
  const format =
    options.format &&
    options.format !== "auto" &&
    isManualFormat(options.format)
      ? options.format
      : "argb32";
  const resolvedScale =
    Number.isFinite(options.scale) && options.scale > 0 ? options.scale : 1;
  const frameDurationMs = Number.isFinite(options.frameDurationMs)
    ? Math.max(16, options.frameDurationMs)
    : 100;

  /** @type {ConvertSvgToCResult} */
  const result = {
    source: null,
    previewSvg: null,
    width: 0,
    height: 0,
    sourceWidth: 0,
    sourceHeight: 0,
    scale: resolvedScale,
    frameCount: 0,
    sourceFrameCount: 0,
    frameIndex: 0,
    animated: false,
    hadTransparency: false,
    flattenedTransparency: false,
    format,
    elementType: "uint32_t",
    warnings: [...raster.warnings],
    error: null,
  };

  if (raster.error || !raster.frames.length) {
    result.error = raster.error || "No frames to encode.";
    return result;
  }

  const sourceWidth = raster.width;
  const sourceHeight = raster.height;
  const outWidth = scaledSize(sourceWidth, resolvedScale);
  const outHeight = scaledSize(sourceHeight, resolvedScale);

  result.sourceWidth = sourceWidth;
  result.sourceHeight = sourceHeight;
  result.width = outWidth;
  result.height = outHeight;

  const sourceFrameCount = raster.frames.length;
  result.sourceFrameCount = sourceFrameCount;
  const keepAllFrames =
    sourceFrameCount > 1 && options.animateFrames !== false;
  const selectedIndex = Math.min(
    Math.max(0, Math.round(options.frameIndex ?? 0)),
    sourceFrameCount - 1
  );

  /** @type {(import("./decode-pixels.js").Rgba | null)[][]} */
  const sourceFrames = keepAllFrames
    ? raster.frames
    : [raster.frames[selectedIndex]];

  result.frameCount = sourceFrames.length;
  result.frameIndex = keepAllFrames ? 0 : selectedIndex;
  result.animated = keepAllFrames && sourceFrames.length > 1;

  /** @type {(import("./decode-pixels.js").Rgba | null)[][]} */
  const resizedFrames =
    outWidth === sourceWidth && outHeight === sourceHeight
      ? sourceFrames
      : sourceFrames.map((frame) =>
          resizePixels(frame, sourceWidth, sourceHeight, outWidth, outHeight)
        );

  const prepared = prepareFramesForOpaqueFormat({
    frames: resizedFrames,
    format,
    backgroundColor: options.backgroundColor,
    animated: result.animated,
  });
  result.hadTransparency = prepared.hadTransparency;
  result.flattenedTransparency = prepared.flattenedTransparency;
  result.warnings.push(...prepared.warnings);
  const frames = prepared.frames;

  const bitOrder = options.bitOrder === "lsb" ? "lsb" : "msb";
  /** @type {import("./encode-pixels.js").BuiltPalette | null} */
  let sharedPalette = null;
  const indexedBpp = indexedBitsPerPixel(format);
  if (indexedBpp !== null) {
    sharedPalette = buildPalette(frames.flat(), 1 << indexedBpp);
    result.warnings.push(...sharedPalette.warnings);
  }

  /** @type {number[][]} */
  const encodedFrames = [];
  /** @type {number[] | null} */
  let palette = null;
  let elementType = "uint32_t";

  for (let i = 0; i < frames.length; i++) {
    const encoded = encodePixels({
      format,
      pixels: frames[i],
      width: outWidth,
      height: outHeight,
      bitOrder,
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
    arrayName: options.arrayName ?? "image",
    width: outWidth,
    height: outHeight,
    elementType,
    frames: encodedFrames,
    palette,
  });

  if (encodedFrames.length > 0) {
    const preview = previewSvgFromEncoded({
      format,
      frames: encodedFrames,
      width: outWidth,
      height: outHeight,
      bitOrder,
      palette,
      frameDurationMs,
    });
    result.previewSvg = preview.svg;
    result.warnings.push(...preview.warnings);
  }

  result.warnings = [...new Set(result.warnings)];
  return result;
}

/**
 * Sync conversion (rect-based rasteriser). Prefer {@link convertSvgToCAsync} in the browser.
 * @param {ConvertSvgToCOptions} options
 * @returns {ConvertSvgToCResult}
 */
export function convertSvgToC(options) {
  return encodeRaster(options, svgToPixels(options.source));
}

/**
 * Async conversion using canvas rasterisation in the browser (paths, strokes, etc.).
 * @param {ConvertSvgToCOptions} options
 * @returns {Promise<ConvertSvgToCResult>}
 */
export async function convertSvgToCAsync(options) {
  const raster = await svgToPixelsAsync(options.source);
  return encodeRaster(options, raster);
}
