/**
 * Encode an RGBA pixel grid into packed C-array values.
 */

import {
  indexedBitsPerPixel,
  packedGrayBitsPerPixel,
  packedStride,
} from "./formats.js";

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 * @typedef {"msb" | "lsb"} BitOrder
 */

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
function encodeRgb565Word(r, g, b) {
  const r5 = Math.round((r / 255) * 31) & 0x1f;
  const g6 = Math.round((g / 255) * 63) & 0x3f;
  const b5 = Math.round((b / 255) * 31) & 0x1f;
  return ((r5 << 11) | (g6 << 5) | b5) & 0xffff;
}

/**
 * @param {Rgba | null | undefined} pixel
 * @returns {Rgba}
 */
function solidOrTransparent(pixel) {
  if (!pixel || pixel.a === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return pixel;
}

/**
 * Piskel little-endian RGBA.
 * @param {Rgba | null} pixel
 */
export function encodeArgb32(pixel) {
  const p = solidOrTransparent(pixel);
  return ((p.a & 0xff) << 24) | ((p.b & 0xff) << 16) | ((p.g & 0xff) << 8) | (p.r & 0xff);
}

/**
 * Classic AARRGGBB.
 * @param {Rgba | null} pixel
 */
export function encodeArgb32Classic(pixel) {
  const p = solidOrTransparent(pixel);
  return ((p.a & 0xff) << 24) | ((p.r & 0xff) << 16) | ((p.g & 0xff) << 8) | (p.b & 0xff);
}

/**
 * @param {Rgba | null} pixel
 */
export function encodeXrgb8888(pixel) {
  const p = solidOrTransparent(pixel);
  return (0xff << 24) | ((p.r & 0xff) << 16) | ((p.g & 0xff) << 8) | (p.b & 0xff);
}

/**
 * @param {Rgba | null} pixel
 */
export function encodeRgb565(pixel) {
  const p = solidOrTransparent(pixel);
  return encodeRgb565Word(p.r, p.g, p.b);
}

/**
 * @param {Rgba | null} pixel
 */
export function encodeRgb565Swap(pixel) {
  const word = encodeRgb565(pixel);
  return ((word & 0xff) << 8) | ((word >>> 8) & 0xff);
}

/**
 * @param {(Rgba | null)[]} pixels
 * @param {number} width
 * @param {number} height
 * @param {BitOrder} bitOrder
 * @param {(pixel: Rgba | null) => boolean} isOn
 * @returns {number[]}
 */
export function encode1Bit(pixels, width, height, bitOrder, isOn) {
  const stride = packedStride(width, 1);
  /** @type {number[]} */
  const bytes = new Array(stride * height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOn(pixels[y * width + x] ?? null)) continue;
      const byteIndex = y * stride + (x >> 3);
      const bit = bitOrder === "lsb" ? x & 7 : 7 - (x & 7);
      bytes[byteIndex] |= 1 << bit;
    }
  }
  return bytes;
}

/**
 * @param {(Rgba | null)[]} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} bitsPerPixel
 * @param {BitOrder} bitOrder
 * @param {(pixel: Rgba | null) => number} pixelToIndex
 * @returns {number[]}
 */
export function encodePackedIndices(
  pixels,
  width,
  height,
  bitsPerPixel,
  bitOrder,
  pixelToIndex
) {
  const mask = (1 << bitsPerPixel) - 1;
  const pixelsPerByte = 8 / bitsPerPixel;
  const stride = packedStride(width, bitsPerPixel);
  /** @type {number[]} */
  const bytes = new Array(stride * height).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = pixelToIndex(pixels[y * width + x] ?? null) & mask;
      const byteIndex = y * stride + Math.floor(x / pixelsPerByte);
      const indexInByte = x % pixelsPerByte;
      const shift =
        bitOrder === "lsb"
          ? indexInByte * bitsPerPixel
          : (pixelsPerByte - 1 - indexInByte) * bitsPerPixel;
      bytes[byteIndex] |= index << shift;
    }
  }
  return bytes;
}

/**
 * @param {Rgba} a
 * @param {Rgba} b
 */
function colorKey(a) {
  return `${a.r},${a.g},${a.b},${a.a}`;
}

/**
 * Build a palette from unique opaque colours (plus transparent as index 0 when present).
 * @param {(Rgba | null)[]} pixels
 * @param {number} maxColors
 * @returns {{ palette: Rgba[], indexOf: (pixel: Rgba | null) => number, warnings: string[] }}
 */
export function buildPalette(pixels, maxColors) {
  /** @type {string[]} */
  const warnings = [];
  /** @type {Map<string, number>} */
  const map = new Map();
  /** @type {Rgba[]} */
  const palette = [];

  const add = (pixel) => {
    const p = solidOrTransparent(pixel);
    const key = colorKey(p);
    let idx = map.get(key);
    if (idx !== undefined) return idx;
    if (palette.length >= maxColors) return -1;
    idx = palette.length;
    map.set(key, idx);
    palette.push(p);
    return idx;
  };

  // Prefer transparent as index 0 when any transparent pixels exist
  const hasTransparent = pixels.some((p) => !p || p.a === 0);
  if (hasTransparent) {
    add({ r: 0, g: 0, b: 0, a: 0 });
  }

  for (const pixel of pixels) {
    const idx = add(pixel);
    if (idx < 0) {
      warnings.push(
        `Image has more than ${maxColors} colours; extra colours map to index 0.`
      );
      break;
    }
  }

  return {
    palette,
    indexOf: (pixel) => {
      const p = solidOrTransparent(pixel);
      const idx = map.get(colorKey(p));
      return idx === undefined ? 0 : idx;
    },
    warnings,
  };
}

/**
 * @typedef {{ palette: Rgba[], indexOf: (pixel: Rgba | null) => number, warnings: string[] }} BuiltPalette
 */

/**
 * @param {object} options
 * @param {string} options.format
 * @param {(Rgba | null)[]} options.pixels
 * @param {number} options.width
 * @param {number} options.height
 * @param {BitOrder} [options.bitOrder]
 * @param {BuiltPalette | null} [options.sharedPalette] Reuse one palette across frames (indexed formats).
 * @returns {{ values: number[], palette: number[] | null, elementType: string, warnings: string[] }}
 */
export function encodePixels({
  format,
  pixels,
  width,
  height,
  bitOrder = "msb",
  sharedPalette = null,
}) {
  /** @type {string[]} */
  const warnings = [];
  const order = bitOrder === "lsb" ? "lsb" : "msb";
  const pixelCount = width * height;

  if (format === "argb32") {
    return {
      values: pixels.map((p) => encodeArgb32(p)),
      palette: null,
      elementType: "uint32_t",
      warnings,
    };
  }
  if (format === "argb32-classic") {
    return {
      values: pixels.map((p) => encodeArgb32Classic(p)),
      palette: null,
      elementType: "uint32_t",
      warnings,
    };
  }
  if (format === "xrgb8888") {
    return {
      values: pixels.map((p) => encodeXrgb8888(p)),
      palette: null,
      elementType: "uint32_t",
      warnings,
    };
  }
  if (format === "rgb565") {
    return {
      values: pixels.map((p) => encodeRgb565(p)),
      palette: null,
      elementType: "uint16_t",
      warnings,
    };
  }
  if (format === "rgb565-swap") {
    return {
      values: pixels.map((p) => encodeRgb565Swap(p)),
      palette: null,
      elementType: "uint16_t",
      warnings,
    };
  }

  if (format === "rgb888" || format === "bgr888") {
    /** @type {number[]} */
    const values = [];
    for (let i = 0; i < pixelCount; i++) {
      const p = solidOrTransparent(pixels[i]);
      if (format === "bgr888") values.push(p.b, p.g, p.r);
      else values.push(p.r, p.g, p.b);
    }
    return { values, palette: null, elementType: "uint8_t", warnings };
  }

  if (format === "rgb565a8") {
    /** @type {number[]} */
    const values = [];
    for (let i = 0; i < pixelCount; i++) {
      const p = solidOrTransparent(pixels[i]);
      const word = encodeRgb565Word(p.r, p.g, p.b);
      values.push(word & 0xff, (word >>> 8) & 0xff, p.a & 0xff);
    }
    return { values, palette: null, elementType: "uint8_t", warnings };
  }

  if (format === "argb8565") {
    /** @type {number[]} */
    const values = [];
    for (let i = 0; i < pixelCount; i++) {
      const p = solidOrTransparent(pixels[i]);
      const word = encodeRgb565Word(p.r, p.g, p.b);
      values.push(p.a & 0xff, word & 0xff, (word >>> 8) & 0xff);
    }
    return { values, palette: null, elementType: "uint8_t", warnings };
  }

  if (format === "l8") {
    return {
      values: pixels.map((p) => {
        const c = solidOrTransparent(p);
        return Math.round(0.299 * c.r + 0.587 * c.g + 0.114 * c.b) & 0xff;
      }),
      palette: null,
      elementType: "uint8_t",
      warnings,
    };
  }

  if (format === "al88") {
    /** @type {number[]} */
    const values = [];
    for (let i = 0; i < pixelCount; i++) {
      const c = solidOrTransparent(pixels[i]);
      const g = Math.round(0.299 * c.r + 0.587 * c.g + 0.114 * c.b) & 0xff;
      values.push(g, c.a & 0xff);
    }
    return { values, palette: null, elementType: "uint8_t", warnings };
  }

  if (format === "1bit") {
    return {
      values: encode1Bit(pixels, width, height, order, (p) => Boolean(p && p.a > 0)),
      palette: null,
      elementType: "uint8_t",
      warnings,
    };
  }

  const packedBpp = packedGrayBitsPerPixel(format);
  if (packedBpp !== null) {
    const levels = (1 << packedBpp) - 1;
    return {
      values: encodePackedIndices(pixels, width, height, packedBpp, order, (p) => {
        const c = solidOrTransparent(p);
        const g = Math.round(0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
        return Math.round((g / 255) * levels);
      }),
      palette: null,
      elementType: "uint8_t",
      warnings,
    };
  }

  const indexedBpp = indexedBitsPerPixel(format);
  if (indexedBpp !== null) {
    const maxColors = 1 << indexedBpp;
    const built = sharedPalette ?? buildPalette(pixels, maxColors);
    if (!sharedPalette) warnings.push(...built.warnings);
    const paletteValues = built.palette.map((c) => encodeArgb32(c));

    if (indexedBpp === 8) {
      return {
        values: pixels.map((p) => built.indexOf(p) & 0xff),
        palette: paletteValues,
        elementType: "uint8_t",
        warnings,
      };
    }

    return {
      values: encodePackedIndices(
        pixels,
        width,
        height,
        indexedBpp,
        order,
        (p) => built.indexOf(p)
      ),
      palette: paletteValues,
      elementType: "uint8_t",
      warnings,
    };
  }

  warnings.push(`Unsupported encode format “${format}”; falling back to ARGB32 (Piskel).`);
  return {
    values: pixels.map((p) => encodeArgb32(p)),
    palette: null,
    elementType: "uint32_t",
    warnings,
  };
}
