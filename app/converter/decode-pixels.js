/**
 * Decode packed C array values into a flat RGBA pixel buffer.
 */

import {
  frameValueCount,
  indexedBitsPerPixel,
  packedGrayBitsPerPixel,
  packedStride,
} from "./formats.js";

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 * @typedef {"msb" | "lsb"} BitOrder
 */

/**
 * Expand a 5-bit channel to 8-bit.
 * @param {number} v5
 */
function expand5to8(v5) {
  return Math.round((v5 / 31) * 255);
}

/**
 * Expand a 6-bit channel to 8-bit.
 * @param {number} v6
 */
function expand6to8(v6) {
  return Math.round((v6 / 63) * 255);
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @returns {Rgba | null}
 */
function rgbaOrNull(r, g, b, a) {
  if (a === 0) return null;
  return { r, g, b, a };
}

/**
 * Little-endian RGBA (`0xAABBGGRR`). Opaque red is `0xff0000ff`.
 * @param {number} value
 * @returns {Rgba | null}
 */
export function decodeArgb32(value) {
  const v = value >>> 0;
  const a = (v >>> 24) & 0xff;
  if (a === 0) return null;
  return {
    r: v & 0xff,
    g: (v >>> 8) & 0xff,
    b: (v >>> 16) & 0xff,
    a,
  };
}

/**
 * Classic AARRGGBB. Opaque red is `0xffff0000`.
 * @param {number} value
 * @returns {Rgba | null}
 */
export function decodeArgb32Classic(value) {
  const v = value >>> 0;
  const a = (v >>> 24) & 0xff;
  if (a === 0) return null;
  return {
    r: (v >>> 16) & 0xff,
    g: (v >>> 8) & 0xff,
    b: v & 0xff,
    a,
  };
}

/**
 * XRGB8888 — classic layout, alpha ignored (treated opaque).
 * @param {number} value
 * @returns {Rgba}
 */
export function decodeXrgb8888(value) {
  const v = value >>> 0;
  return {
    r: (v >>> 16) & 0xff,
    g: (v >>> 8) & 0xff,
    b: v & 0xff,
    a: 255,
  };
}

/**
 * @param {number} value
 * @returns {Rgba}
 */
export function decodeRgb565(value) {
  const v = value & 0xffff;
  const r5 = (v >>> 11) & 0x1f;
  const g6 = (v >>> 5) & 0x3f;
  const b5 = v & 0x1f;
  return {
    r: expand5to8(r5),
    g: expand6to8(g6),
    b: expand5to8(b5),
    a: 255,
  };
}

/**
 * @param {number} value
 * @returns {Rgba}
 */
export function decodeRgb565Swap(value) {
  const v = value & 0xffff;
  const swapped = ((v & 0xff) << 8) | ((v >>> 8) & 0xff);
  return decodeRgb565(swapped);
}

/**
 * Bytes per row for 1-bit packed data.
 * @param {number} width
 */
export function oneBitStride(width) {
  return packedStride(width, 1);
}

/**
 * @param {number[]} bytes
 * @param {number} width
 * @param {number} height
 * @param {Rgba} foreground
 * @param {BitOrder} [bitOrder]
 * @returns {(Rgba | null)[]}
 */
export function decode1Bit(
  bytes,
  width,
  height,
  foreground = { r: 0, g: 0, b: 0, a: 255 },
  bitOrder = "msb"
) {
  const stride = oneBitStride(width);
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(width * height).fill(null);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byteIndex = y * stride + (x >> 3);
      const bit =
        bitOrder === "lsb" ? x & 7 : 7 - (x & 7);
      const byte = bytes[byteIndex] ?? 0;
      if ((byte >>> bit) & 1) {
        pixels[y * width + x] = { ...foreground };
      }
    }
  }

  return pixels;
}

/**
 * @param {number} bitsPerPixel
 * @param {number} levelCount
 * @returns {Rgba[]}
 */
export function grayRamp(levelCount) {
  const n = Math.max(2, levelCount);
  /** @type {Rgba[]} */
  const ramp = [];
  for (let i = 0; i < n; i++) {
    const g = Math.round((i / (n - 1)) * 255);
    ramp.push({ r: g, g, b: g, a: 255 });
  }
  return ramp;
}

/**
 * Decode palette entries (little-endian RGBA / `0xAABBGGRR`).
 * @param {number[]} values
 * @returns {(Rgba | null)[]}
 */
export function decodePaletteEntries(values) {
  return values.map((v) => decodeArgb32(v));
}

/**
 * @param {number[]} bytes
 * @param {number} width
 * @param {number} height
 * @param {number} bitsPerPixel
 * @param {BitOrder} bitOrder
 * @param {(index: number) => Rgba | null} indexToColor
 * @returns {(Rgba | null)[]}
 */
export function decodePackedIndices(
  bytes,
  width,
  height,
  bitsPerPixel,
  bitOrder,
  indexToColor
) {
  const mask = (1 << bitsPerPixel) - 1;
  const pixelsPerByte = 8 / bitsPerPixel;
  const stride = packedStride(width, bitsPerPixel);
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(width * height).fill(null);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byteIndex = y * stride + Math.floor(x / pixelsPerByte);
      const indexInByte = x % pixelsPerByte;
      const byte = bytes[byteIndex] ?? 0;
      const shift =
        bitOrder === "lsb"
          ? indexInByte * bitsPerPixel
          : (pixelsPerByte - 1 - indexInByte) * bitsPerPixel;
      const index = (byte >>> shift) & mask;
      pixels[y * width + x] = indexToColor(index);
    }
  }

  return pixels;
}

/**
 * @param {number[]} values flat byte stream for one frame
 * @param {number} width
 * @param {number} height
 * @param {"rgb" | "bgr"} order
 * @returns {(Rgba | null)[]}
 */
export function decodeRgb888(values, width, height, order = "rgb") {
  const pixelCount = width * height;
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(pixelCount).fill(null);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 3;
    const a = values[o];
    const b = values[o + 1];
    const c = values[o + 2];
    if (a === undefined || b === undefined || c === undefined) continue;
    if (order === "bgr") {
      pixels[i] = rgbaOrNull(c & 0xff, b & 0xff, a & 0xff, 255);
    } else {
      pixels[i] = rgbaOrNull(a & 0xff, b & 0xff, c & 0xff, 255);
    }
  }
  return pixels;
}

/**
 * Planar: RGB565 little-endian colour bytes followed by the A8 plane.
 * @param {number[]} values
 * @param {number} width
 * @param {number} height
 * @returns {(Rgba | null)[]}
 */
export function decodeRgb565a8(values, width, height) {
  const pixelCount = width * height;
  const colorByteCount = pixelCount * 2;
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(pixelCount).fill(null);
  for (let i = 0; i < pixelCount; i++) {
    const colorOffset = i * 2;
    const lo = values[colorOffset];
    const hi = values[colorOffset + 1];
    const a = values[colorByteCount + i];
    if (lo === undefined || hi === undefined || a === undefined) continue;
    const color = decodeRgb565((lo & 0xff) | ((hi & 0xff) << 8));
    pixels[i] = rgbaOrNull(color.r, color.g, color.b, a & 0xff);
  }
  return pixels;
}

/**
 * Interleaved: A8 then RGB565 little-endian word as two bytes.
 * @param {number[]} values
 * @param {number} width
 * @param {number} height
 * @returns {(Rgba | null)[]}
 */
export function decodeArgb8565(values, width, height) {
  const pixelCount = width * height;
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(pixelCount).fill(null);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 3;
    const a = values[o];
    const lo = values[o + 1];
    const hi = values[o + 2];
    if (a === undefined || lo === undefined || hi === undefined) continue;
    const color = decodeRgb565((lo & 0xff) | ((hi & 0xff) << 8));
    pixels[i] = rgbaOrNull(color.r, color.g, color.b, a & 0xff);
  }
  return pixels;
}

/**
 * @param {number[]} values
 * @param {number} width
 * @param {number} height
 * @returns {(Rgba | null)[]}
 */
export function decodeL8(values, width, height) {
  const pixelCount = width * height;
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(pixelCount).fill(null);
  for (let i = 0; i < pixelCount; i++) {
    const g = values[i];
    if (g === undefined) continue;
    const v = g & 0xff;
    pixels[i] = { r: v, g: v, b: v, a: 255 };
  }
  return pixels;
}

/**
 * L8 then A8 per pixel.
 * @param {number[]} values
 * @param {number} width
 * @param {number} height
 * @returns {(Rgba | null)[]}
 */
export function decodeAl88(values, width, height) {
  const pixelCount = width * height;
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(pixelCount).fill(null);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 2;
    const g = values[o];
    const a = values[o + 1];
    if (g === undefined || a === undefined) continue;
    const v = g & 0xff;
    pixels[i] = rgbaOrNull(v, v, v, a & 0xff);
  }
  return pixels;
}

/**
 * @param {object} options
 * @param {string} options.format
 * @param {number[]} options.values one frame of values
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} [options.frameIndex] ignored when values are already sliced
 * @param {Rgba} [options.oneBitForeground]
 * @param {BitOrder} [options.bitOrder]
 * @param {number[] | null} [options.palette]
 * @returns {{ pixels: (Rgba | null)[], warnings: string[] }}
 */
export function decodePixels({
  format,
  values,
  width,
  height,
  frameIndex = 0,
  oneBitForeground = { r: 0, g: 0, b: 0, a: 255 },
  bitOrder = "msb",
  palette = null,
}) {
  /** @type {string[]} */
  const warnings = [];
  const pixelCount = width * height;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { pixels: [], warnings: ["Width and height must be positive integers."] };
  }

  const needed = frameValueCount(format, width, height);
  const start = frameIndex * needed;
  const frameValues =
    frameIndex === 0 && values.length <= needed
      ? values
      : values.slice(start, start + needed);

  if (frameValues.length < needed) {
    warnings.push(
      `Frame needs ${needed} values; got ${frameValues.length}. Missing data is treated as empty/zero.`
    );
  }

  if (format === "1bit") {
    return {
      pixels: decode1Bit(frameValues, width, height, oneBitForeground, bitOrder),
      warnings,
    };
  }

  if (format === "rgb888") {
    return { pixels: decodeRgb888(frameValues, width, height, "rgb"), warnings };
  }
  if (format === "bgr888") {
    return { pixels: decodeRgb888(frameValues, width, height, "bgr"), warnings };
  }
  if (format === "rgb565a8") {
    return { pixels: decodeRgb565a8(frameValues, width, height), warnings };
  }
  if (format === "argb8565") {
    return { pixels: decodeArgb8565(frameValues, width, height), warnings };
  }
  if (format === "l8") {
    return { pixels: decodeL8(frameValues, width, height), warnings };
  }
  if (format === "al88") {
    return { pixels: decodeAl88(frameValues, width, height), warnings };
  }

  const indexedBpp = indexedBitsPerPixel(format);
  if (indexedBpp !== null) {
    const levelCount = 1 << indexedBpp;
    const paletteLen = palette && palette.length > 0 ? palette.length : 0;
    /** @type {(Rgba | null)[]} */
    let colors;
    if (paletteLen > 0) {
      colors = decodePaletteEntries(palette);
    } else {
      warnings.push(
        `No palette found for ${format}; using a ${levelCount}-level grayscale ramp.`
      );
      colors = grayRamp(levelCount);
    }

    let missingIndexWarned = false;
    const indexToColor = (index) => {
      if (paletteLen > 0 && index >= paletteLen) {
        if (!missingIndexWarned) {
          missingIndexWarned = true;
          warnings.push(
            `Pixel index ${index} is outside the ${paletteLen}-entry palette; out-of-range indices use gray.`
          );
        }
        const ramp = grayRamp(levelCount);
        return ramp[index] ? { ...ramp[index] } : { r: 0, g: 0, b: 0, a: 255 };
      }
      const c = colors[index];
      if (!c || c.a === 0) return null;
      return { ...c };
    };

    if (indexedBpp === 8) {
      /** @type {(Rgba | null)[]} */
      const pixels = new Array(pixelCount).fill(null);
      for (let i = 0; i < pixelCount; i++) {
        const idx = frameValues[i];
        if (idx === undefined) continue;
        pixels[i] = indexToColor(idx & 0xff);
      }
      return { pixels, warnings };
    }

    return {
      pixels: decodePackedIndices(
        frameValues,
        width,
        height,
        indexedBpp,
        bitOrder,
        indexToColor
      ),
      warnings,
    };
  }

  const packedBpp = packedGrayBitsPerPixel(format);
  if (packedBpp !== null) {
    const levelCount = 1 << packedBpp;
    const ramp = grayRamp(levelCount);
    return {
      pixels: decodePackedIndices(
        frameValues,
        width,
        height,
        packedBpp,
        bitOrder,
        (index) => {
          const c = ramp[index];
          return c ? { ...c } : null;
        }
      ),
      warnings,
    };
  }

  /** @type {(Rgba | null)[]} */
  const pixels = new Array(pixelCount).fill(null);

  for (let i = 0; i < pixelCount; i++) {
    const raw = frameValues[i];
    if (raw === undefined) continue;

    if (format === "argb32") {
      pixels[i] = decodeArgb32(raw);
    } else if (format === "argb32-classic") {
      pixels[i] = decodeArgb32Classic(raw);
    } else if (format === "xrgb8888") {
      pixels[i] = decodeXrgb8888(raw);
    } else if (format === "rgb565-swap") {
      pixels[i] = decodeRgb565Swap(raw);
    } else {
      pixels[i] = decodeRgb565(raw);
    }
  }

  return { pixels, warnings };
}

/**
 * Colour key for merging / grouping: `#RRGGBB`, `#RRGGBBAA`, or null.
 * @param {Rgba | null} pixel
 * @param {string | null} overrideFill `#RRGGBB` or null
 * @returns {string | null}
 */
export function pixelColorKey(pixel, overrideFill = null) {
  if (!pixel || pixel.a === 0) return null;
  if (overrideFill) return overrideFill.toUpperCase();
  const r = pixel.r.toString(16).padStart(2, "0");
  const g = pixel.g.toString(16).padStart(2, "0");
  const b = pixel.b.toString(16).padStart(2, "0");
  const alpha = Math.max(0, Math.min(255, Math.round(pixel.a)));
  const alphaHex = alpha < 255 ? alpha.toString(16).padStart(2, "0") : "";
  return `#${r}${g}${b}${alphaHex}`.toUpperCase();
}
