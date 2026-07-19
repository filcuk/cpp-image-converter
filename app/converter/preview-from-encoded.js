/**
 * Build a preview SVG from already-encoded frame values (post-quantisation appearance).
 */

import { decodePixels, pixelColorKey } from "./decode-pixels.js";
import { mergeRects } from "./merge-rects.js";
import { toSvg } from "./to-svg.js";
import { toAnimatedSvg } from "./to-animated-svg.js";

/**
 * @param {object} options
 * @param {string} options.format
 * @param {number[][]} options.frames Encoded frame value arrays
 * @param {number} options.width
 * @param {number} options.height
 * @param {"msb" | "lsb"} [options.bitOrder]
 * @param {number[] | null} [options.palette]
 * @param {number} [options.frameDurationMs]
 * @returns {{ svg: string, warnings: string[] }}
 */
export function previewSvgFromEncoded({
  format,
  frames,
  width,
  height,
  bitOrder = "msb",
  palette = null,
  frameDurationMs = 100,
}) {
  /** @type {string[]} */
  const warnings = [];
  /** @type {import("./merge-rects.js").MergedRect[][]} */
  const rectFrames = [];

  for (const values of frames) {
    const decoded = decodePixels({
      format,
      values,
      width,
      height,
      bitOrder,
      palette,
    });
    warnings.push(...decoded.warnings);
    const colorGrid = decoded.pixels.map((p) => pixelColorKey(p, null));
    rectFrames.push(mergeRects(colorGrid, width, height));
  }

  if (rectFrames.length === 0) {
    return { svg: "", warnings: [...new Set(warnings)] };
  }

  if (rectFrames.length === 1) {
    return {
      svg: toSvg({
        width,
        height,
        rects: rectFrames[0],
        displayScale: 1,
        minify: true,
      }),
      warnings: [...new Set(warnings)],
    };
  }

  return {
    svg: toAnimatedSvg({
      width,
      height,
      frames: rectFrames,
      displayScale: 1,
      frameDurationMs,
      minify: true,
    }),
    warnings: [...new Set(warnings)],
  };
}
