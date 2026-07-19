/**
 * Flatten transparency onto an opaque matte colour for formats without alpha.
 */

import { parseCssColor } from "./svg-to-pixels.js";
import { formatLabel, formatPreservesAlpha } from "./formats.js";

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 */

/**
 * @param {string | null | undefined} raw
 * @returns {{ colour: Rgba, hex: string }}
 */
export function resolveMatteColour(raw) {
  const parsed = parseCssColor(raw ?? "");
  if (parsed && parsed.a > 0) {
    return {
      colour: { r: parsed.r, g: parsed.g, b: parsed.b, a: 255 },
      hex: `#${[parsed.r, parsed.g, parsed.b]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`,
    };
  }
  return {
    colour: { r: 0, g: 0, b: 0, a: 255 },
    hex: "#000000",
  };
}

/**
 * @param {(Rgba | null)[][]} frames
 * @returns {boolean}
 */
export function framesHaveTransparency(frames) {
  for (const frame of frames) {
    for (const pixel of frame) {
      if (!pixel || pixel.a < 255) return true;
    }
  }
  return false;
}

/**
 * @param {Rgba | null | undefined} pixel
 * @param {Rgba} matte
 * @returns {Rgba}
 */
export function compositePixelOntoMatte(pixel, matte) {
  if (!pixel || pixel.a === 0) {
    return { r: matte.r, g: matte.g, b: matte.b, a: 255 };
  }
  if (pixel.a >= 255) {
    return { r: pixel.r, g: pixel.g, b: pixel.b, a: 255 };
  }
  const a = pixel.a / 255;
  const inv = 1 - a;
  return {
    r: Math.round(pixel.r * a + matte.r * inv),
    g: Math.round(pixel.g * a + matte.g * inv),
    b: Math.round(pixel.b * a + matte.b * inv),
    a: 255,
  };
}

/**
 * @param {(Rgba | null)[]} pixels
 * @param {Rgba} matte
 * @returns {Rgba[]}
 */
export function compositeFrameOntoMatte(pixels, matte) {
  return pixels.map((pixel) => compositePixelOntoMatte(pixel, matte));
}

/**
 * @param {number[][]} encodedFrames
 * @returns {number}
 */
export function countUniqueEncodedFrames(encodedFrames) {
  return new Set(encodedFrames.map((frame) => frame.join(","))).size;
}

/**
 * When the output format cannot store alpha, composite transparent pixels onto
 * `backgroundColor` and emit warnings (including collapsed animation frames).
 *
 * @param {object} options
 * @param {(Rgba | null)[][]} options.frames
 * @param {string} options.format
 * @param {string} [options.backgroundColor]
 * @returns {{
 *   frames: (Rgba | null)[][],
 *   hadTransparency: boolean,
 *   flattenedTransparency: boolean,
 *   warnings: string[]
 * }}
 */
export function prepareFramesForOpaqueFormat({
  frames,
  format,
  backgroundColor = "#000000",
}) {
  const hadTransparency = framesHaveTransparency(frames);
  if (!hadTransparency || formatPreservesAlpha(format)) {
    return {
      frames,
      hadTransparency,
      flattenedTransparency: false,
      warnings: [],
    };
  }

  const { colour: matte, hex } = resolveMatteColour(backgroundColor);
  const flattened = frames.map((frame) => compositeFrameOntoMatte(frame, matte));
  /** @type {string[]} */
  const warnings = [
    `${formatLabel(format)} has no alpha; transparency flattened onto ${hex}.`,
  ];

  return {
    frames: flattened,
    hadTransparency: true,
    flattenedTransparency: true,
    warnings,
  };
}

/**
 * @param {number[][]} encodedFrames
 * @param {boolean} animated
 * @returns {string[]}
 */
export function warningsForCollapsedFrames(encodedFrames, animated) {
  if (!animated || encodedFrames.length <= 1) return [];
  const unique = countUniqueEncodedFrames(encodedFrames);
  if (unique >= encodedFrames.length) return [];
  return [
    `Only ${unique} of ${encodedFrames.length} frames unique after flatten - try a different background, or a format with alpha.`,
  ];
}
