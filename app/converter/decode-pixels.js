/**
 * Decode packed C array values into a flat RGBA pixel buffer.
 */

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
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
 * Decode a 32-bit little-endian RGBA pixel (`0xAABBGGRR`).
 * Hex literals store channels in that order, so opaque red is
 * `0xff0000ff` — not classic AARRGGBB `0xffff0000`.
 * @param {number} value
 * @returns {Rgba | null} null = transparent / empty
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
 * Bytes per row for 1-bit packed MSB-first data.
 * @param {number} width
 */
export function oneBitStride(width) {
  return Math.ceil(width / 8);
}

/**
 * @param {number[]} bytes
 * @param {number} width
 * @param {number} height
 * @param {Rgba} foreground
 * @returns {(Rgba | null)[]}
 */
export function decode1Bit(bytes, width, height, foreground = { r: 0, g: 0, b: 0, a: 255 }) {
  const stride = oneBitStride(width);
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(width * height).fill(null);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byteIndex = y * stride + (x >> 3);
      const bit = 7 - (x & 7);
      const byte = bytes[byteIndex] ?? 0;
      if ((byte >>> bit) & 1) {
        pixels[y * width + x] = { ...foreground };
      }
    }
  }

  return pixels;
}

/**
 * @param {object} options
 * @param {"argb32" | "rgb565" | "1bit"} options.format
 * @param {number[]} options.values
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} [options.frameIndex]
 * @param {Rgba} [options.oneBitForeground]
 * @returns {{ pixels: (Rgba | null)[], warnings: string[] }}
 */
export function decodePixels({
  format,
  values,
  width,
  height,
  frameIndex = 0,
  oneBitForeground = { r: 0, g: 0, b: 0, a: 255 },
}) {
  /** @type {string[]} */
  const warnings = [];
  const pixelCount = width * height;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { pixels: [], warnings: ["Width and height must be positive integers."] };
  }

  if (format === "1bit") {
    const stride = oneBitStride(width);
    const frameBytes = stride * height;
    const start = frameIndex * frameBytes;
    const frameValues = values.slice(start, start + frameBytes);
    if (frameValues.length < frameBytes) {
      warnings.push(
        `1-bit frame needs ${frameBytes} bytes; got ${frameValues.length}. Missing bytes are treated as 0.`
      );
    }
    const pixels = decode1Bit(frameValues, width, height, oneBitForeground);
    return { pixels, warnings };
  }

  const start = frameIndex * pixelCount;
  const frameValues = values.slice(start, start + pixelCount);

  if (frameValues.length < pixelCount) {
    warnings.push(
      `Frame needs ${pixelCount} values; got ${frameValues.length}. Missing pixels are treated as empty.`
    );
  } else if (values.length > (frameIndex + 1) * pixelCount && format !== "1bit") {
    // Extra values beyond this frame are fine when multi-frame; only warn if single-frame overflow
  }

  /** @type {(Rgba | null)[]} */
  const pixels = new Array(pixelCount).fill(null);

  for (let i = 0; i < pixelCount; i++) {
    const raw = frameValues[i];
    if (raw === undefined) continue;

    if (format === "argb32") {
      pixels[i] = decodeArgb32(raw);
    } else {
      pixels[i] = decodeRgb565(raw);
    }
  }

  return { pixels, warnings };
}

/**
 * Colour key for merging / grouping: `#RRGGBB` or null.
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
  return `#${r}${g}${b}`.toUpperCase();
}
