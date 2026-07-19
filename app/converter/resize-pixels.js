/**
 * Nearest-neighbour resize for pixel-art frames.
 */

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 */

/**
 * @param {(Rgba | null)[]} pixels
 * @param {number} srcWidth
 * @param {number} srcHeight
 * @param {number} dstWidth
 * @param {number} dstHeight
 * @returns {(Rgba | null)[]}
 */
export function resizePixels(pixels, srcWidth, srcHeight, dstWidth, dstHeight) {
  const sw = Math.max(0, srcWidth | 0);
  const sh = Math.max(0, srcHeight | 0);
  const dw = Math.max(0, dstWidth | 0);
  const dh = Math.max(0, dstHeight | 0);

  if (!sw || !sh || !dw || !dh) {
    return new Array(dw * dh).fill(null);
  }

  if (sw === dw && sh === dh) {
    return pixels.slice(0, sw * sh);
  }

  /** @type {(Rgba | null)[]} */
  const out = new Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const srcY = Math.min(sh - 1, Math.floor((y * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const srcX = Math.min(sw - 1, Math.floor((x * sw) / dw));
      out[y * dw + x] = pixels[srcY * sw + srcX] ?? null;
    }
  }
  return out;
}
