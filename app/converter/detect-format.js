/**
 * Hint pixel format from a C/C++ array element type and optional parse context.
 */

import { frameValueCount, isManualFormat } from "./formats.js";

/**
 * @typedef {object} FormatDetectHints
 * @property {string | null | undefined} [elementType]
 * @property {number[] | null | undefined} [palette]
 * @property {number | null | undefined} [width]
 * @property {number | null | undefined} [height]
 * @property {number | null | undefined} [valueCount]
 * @property {number | null | undefined} [frameCount]
 * @property {number | null | undefined} [colorCount]
 */

/**
 * @param {string | null | undefined} elementType
 */
function isUint8ElementType(elementType) {
  if (!elementType) return false;
  const t = String(elementType).trim().toLowerCase();
  return (
    t === "uint8_t" ||
    t === "uint8" ||
    t === "unsigned char" ||
    t === "byte" ||
    t === "uint_fast8_t" ||
    t === "uint_least8_t"
  );
}

/**
 * @param {string | null | undefined} elementType
 * @returns {string | null}
 */
export function detectFormatFromType(elementType) {
  if (!elementType) return null;
  const t = String(elementType).trim().toLowerCase();

  if (
    t === "uint32_t" ||
    t === "uint32" ||
    t === "unsigned int" ||
    t === "unsigned long" ||
    t === "uint_fast32_t" ||
    t === "uint_least32_t"
  ) {
    return "argb32";
  }

  if (
    t === "uint16_t" ||
    t === "uint16" ||
    t === "unsigned short" ||
    t === "uint_fast16_t" ||
    t === "uint_least16_t"
  ) {
    return "rgb565";
  }

  if (isUint8ElementType(elementType)) {
    return "1bit";
  }

  return null;
}

/**
 * Pick indexed I1–I8 from palette + packing when dimensions are known.
 * @param {FormatDetectHints} hints
 * @returns {string | null}
 */
function detectIndexedFormat(hints) {
  const width = hints.width ?? null;
  const height = hints.height ?? null;
  const valueCount = hints.valueCount ?? null;
  const frameCount = Math.max(1, hints.frameCount ?? 1);
  const paletteLen = hints.palette?.length ?? 0;
  const colorCount =
    hints.colorCount !== null &&
    hints.colorCount !== undefined &&
    hints.colorCount > 0
      ? hints.colorCount
      : paletteLen;

  /** @type {string[]} */
  const candidates = ["i8", "i4", "i2", "i1"];

  if (
    width !== null &&
    height !== null &&
    width > 0 &&
    height > 0 &&
    valueCount !== null &&
    valueCount > 0
  ) {
    const perFrame = Math.floor(valueCount / frameCount);
    const matches = candidates.filter(
      (id) => frameValueCount(id, width, height) === perFrame
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      if (colorCount <= 2 && matches.includes("i1")) return "i1";
      if (colorCount <= 4 && matches.includes("i2")) return "i2";
      if (colorCount <= 16 && matches.includes("i4")) return "i4";
      if (matches.includes("i8")) return "i8";
      return matches[0];
    }
  }

  if (colorCount <= 2) return "i1";
  if (colorCount <= 4) return "i2";
  if (colorCount <= 16) return "i4";
  return "i8";
}

/**
 * Auto-detect format from element type plus optional palette / size hints.
 * @param {FormatDetectHints | string | null | undefined} hintsOrType
 * @returns {string | null}
 */
export function detectFormat(hintsOrType) {
  /** @type {FormatDetectHints} */
  const hints =
    hintsOrType === null ||
    hintsOrType === undefined ||
    typeof hintsOrType === "string"
      ? { elementType: hintsOrType }
      : hintsOrType;

  const hasPalette = Boolean(hints.palette && hints.palette.length > 0);
  if (hasPalette && isUint8ElementType(hints.elementType)) {
    return detectIndexedFormat(hints);
  }

  return detectFormatFromType(hints.elementType);
}

/**
 * Resolve effective format: manual selection wins over auto-detect.
 *
 * @param {string} selected
 * @param {FormatDetectHints | string | null | undefined} hintsOrType
 * @returns {{ format: string, detected: string | null }}
 */
export function resolveFormat(selected, hintsOrType) {
  const detected = detectFormat(hintsOrType);
  if (selected && selected !== "auto" && isManualFormat(selected)) {
    return { format: selected, detected };
  }
  return { format: detected ?? "argb32", detected };
}
