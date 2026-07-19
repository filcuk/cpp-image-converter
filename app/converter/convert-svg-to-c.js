/**
 * High-level SVG → C array conversion.
 */

import { svgToPixels, svgToPixelsAsync } from "./svg-to-pixels.js";
import { buildPalette, encodePixels } from "./encode-pixels.js";
import { resizePixels } from "./resize-pixels.js";
import { toCArray } from "./to-c-array.js";
import { indexedBitsPerPixel, isManualFormat } from "./formats.js";

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
 */

/**
 * @typedef {object} ConvertSvgToCResult
 * @property {string | null} source
 * @property {number} width
 * @property {number} height
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {number} scale
 * @property {number} frameCount
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

  /** @type {ConvertSvgToCResult} */
  const result = {
    source: null,
    width: 0,
    height: 0,
    sourceWidth: 0,
    sourceHeight: 0,
    scale: resolvedScale,
    frameCount: 0,
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
  result.frameCount = raster.frames.length;

  /** @type {(import("./decode-pixels.js").Rgba | null)[][]} */
  const frames =
    outWidth === sourceWidth && outHeight === sourceHeight
      ? raster.frames
      : raster.frames.map((frame) =>
          resizePixels(frame, sourceWidth, sourceHeight, outWidth, outHeight)
        );

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

  result.elementType = elementType;
  result.source = toCArray({
    arrayName: options.arrayName ?? "image",
    width: outWidth,
    height: outHeight,
    elementType,
    frames: encodedFrames,
    palette,
  });

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
