/**
 * High-level SVG → C array conversion.
 */

import { svgToPixels, svgToPixelsAsync } from "./svg-to-pixels.js";
import { buildPalette, encodePixels } from "./encode-pixels.js";
import { toCArray } from "./to-c-array.js";
import { indexedBitsPerPixel, isManualFormat } from "./formats.js";

/**
 * @typedef {object} ConvertSvgToCOptions
 * @property {string} source
 * @property {string} [format]
 * @property {"msb" | "lsb"} [bitOrder]
 * @property {string} [arrayName]
 */

/**
 * @typedef {object} ConvertSvgToCResult
 * @property {string | null} source
 * @property {number} width
 * @property {number} height
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

  /** @type {ConvertSvgToCResult} */
  const result = {
    source: null,
    width: 0,
    height: 0,
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

  result.width = raster.width;
  result.height = raster.height;
  result.frameCount = raster.frames.length;

  const bitOrder = options.bitOrder === "lsb" ? "lsb" : "msb";
  /** @type {import("./encode-pixels.js").BuiltPalette | null} */
  let sharedPalette = null;
  const indexedBpp = indexedBitsPerPixel(format);
  if (indexedBpp !== null) {
    sharedPalette = buildPalette(raster.frames.flat(), 1 << indexedBpp);
    result.warnings.push(...sharedPalette.warnings);
  }

  /** @type {number[][]} */
  const encodedFrames = [];
  /** @type {number[] | null} */
  let palette = null;
  let elementType = "uint32_t";

  for (let i = 0; i < raster.frames.length; i++) {
    const encoded = encodePixels({
      format,
      pixels: raster.frames[i],
      width: raster.width,
      height: raster.height,
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
    width: raster.width,
    height: raster.height,
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
