/**
 * High-level SVG → C array conversion.
 */

import { svgToPixels } from "./svg-to-pixels.js";
import { encodePixels } from "./encode-pixels.js";
import { toCArray } from "./to-c-array.js";
import { isManualFormat } from "./formats.js";

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
 * @returns {ConvertSvgToCResult}
 */
export function convertSvgToC({
  source,
  format: formatSelection = "argb32",
  bitOrder = "msb",
  arrayName = "image",
}) {
  const format =
    formatSelection && formatSelection !== "auto" && isManualFormat(formatSelection)
      ? formatSelection
      : "argb32";

  /** @type {ConvertSvgToCResult} */
  const result = {
    source: null,
    width: 0,
    height: 0,
    frameCount: 0,
    format,
    elementType: "uint32_t",
    warnings: [],
    error: null,
  };

  const raster = svgToPixels(source);
  result.warnings.push(...raster.warnings);
  if (raster.error || !raster.frames.length) {
    result.error = raster.error || "No frames to encode.";
    return result;
  }

  result.width = raster.width;
  result.height = raster.height;
  result.frameCount = raster.frames.length;

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
    });
    result.warnings.push(...encoded.warnings);
    encodedFrames.push(encoded.values);
    elementType = encoded.elementType;
    if (encoded.palette) palette = encoded.palette;
  }

  result.elementType = elementType;
  result.source = toCArray({
    arrayName,
    width: raster.width,
    height: raster.height,
    elementType,
    frames: encodedFrames,
    palette,
  });

  return result;
}
