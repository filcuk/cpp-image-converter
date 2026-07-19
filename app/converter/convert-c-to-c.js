/**
 * High-level C array → C array conversion (repack + optional resize).
 */

import { parseCArray, sliceFrameValues } from "./parse-c-array.js";
import { resolveFormat } from "./detect-format.js";
import {
  frameValueCount,
  indexedBitsPerPixel,
  isManualFormat,
} from "./formats.js";
import { decodePixels, pixelColorKey } from "./decode-pixels.js";
import { buildPalette, encodePixels } from "./encode-pixels.js";
import { resizePixels } from "./resize-pixels.js";
import { mergeRects } from "./merge-rects.js";
import { toSvg } from "./to-svg.js";
import { toCArray } from "./to-c-array.js";

/**
 * @typedef {object} ConvertCToCOptions
 * @property {string} source
 * @property {string} [inputFormat]
 * @property {string} [outputFormat]
 * @property {"msb" | "lsb"} [bitOrder]
 * @property {number | null} [width] Output width (resize target); decode size prefers source defines
 * @property {number | null} [height] Output height (resize target)
 * @property {string} [arrayName]
 */

/**
 * @typedef {object} ConvertCToCResult
 * @property {string | null} source
 * @property {string | null} previewSvg
 * @property {number} width
 * @property {number} height
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {number} frameCount
 * @property {string} inputFormat
 * @property {string | null} detectedFormat
 * @property {string} outputFormat
 * @property {string} elementType
 * @property {string[]} warnings
 * @property {string | null} error
 */

/**
 * @param {ConvertCToCOptions} options
 * @returns {ConvertCToCResult}
 */
export function convertCToC({
  source,
  inputFormat: inputSelection = "auto",
  outputFormat: outputSelection = "argb32",
  bitOrder = "msb",
  width: widthOverride = null,
  height: heightOverride = null,
  arrayName = "image",
}) {
  const parsed = parseCArray(source);
  const { format: inputFormat, detected } = resolveFormat(
    inputSelection,
    parsed.elementType
  );
  const outputFormat =
    outputSelection &&
    outputSelection !== "auto" &&
    isManualFormat(outputSelection)
      ? outputSelection
      : "argb32";

  const decodeWidth = parsed.width ?? widthOverride;
  const decodeHeight = parsed.height ?? heightOverride;

  /** @type {ConvertCToCResult} */
  const result = {
    source: null,
    previewSvg: null,
    width: 0,
    height: 0,
    sourceWidth: decodeWidth ?? 0,
    sourceHeight: decodeHeight ?? 0,
    frameCount: parsed.frameCount,
    inputFormat,
    detectedFormat: detected,
    outputFormat,
    elementType: "uint8_t",
    warnings: [...parsed.warnings],
    error: null,
  };

  if (!decodeWidth || !decodeHeight || decodeWidth <= 0 || decodeHeight <= 0) {
    result.error =
      "Could not determine image width/height. Set them manually or include FRAME_WIDTH / FRAME_HEIGHT defines.";
    return result;
  }

  const outWidth = Math.max(
    1,
    Math.round(widthOverride && widthOverride > 0 ? widthOverride : decodeWidth)
  );
  const outHeight = Math.max(
    1,
    Math.round(
      heightOverride && heightOverride > 0 ? heightOverride : decodeHeight
    )
  );
  result.sourceWidth = decodeWidth;
  result.sourceHeight = decodeHeight;
  result.width = outWidth;
  result.height = outHeight;

  const frameSize = frameValueCount(inputFormat, decodeWidth, decodeHeight);
  const allValues = parsed.values;
  const expected = parsed.frameCount * frameSize;

  if (allValues.length < frameSize) {
    result.warnings.push(
      `Expected at least ${frameSize} values for one frame; found ${allValues.length}.`
    );
  } else if (parsed.frameCount === 1 && allValues.length > frameSize) {
    result.warnings.push(
      `Found ${allValues.length} values but frame size is ${frameSize}; using the first ${frameSize}.`
    );
  } else if (allValues.length < expected && parsed.frameCount > 1) {
    result.warnings.push(
      `Expected about ${expected} values for ${parsed.frameCount} frames; found ${allValues.length}.`
    );
  }

  const resolvedBitOrder = bitOrder === "lsb" ? "lsb" : "msb";
  const oneBitForeground = { r: 0, g: 0, b: 0, a: 255 };

  /** @type {(import("./decode-pixels.js").Rgba | null)[][]} */
  const frames = [];
  for (let i = 0; i < parsed.frameCount; i++) {
    const values = sliceFrameValues(allValues, i, frameSize);
    const decoded = decodePixels({
      format: inputFormat,
      values,
      width: decodeWidth,
      height: decodeHeight,
      frameIndex: 0,
      oneBitForeground,
      bitOrder: resolvedBitOrder,
      palette: parsed.palette,
    });
    result.warnings.push(...decoded.warnings);
    const resized =
      outWidth === decodeWidth && outHeight === decodeHeight
        ? decoded.pixels
        : resizePixels(
            decoded.pixels,
            decodeWidth,
            decodeHeight,
            outWidth,
            outHeight
          );
    frames.push(resized);
  }

  if (!frames.length) {
    result.error = "No frames to encode.";
    return result;
  }

  /** @type {import("./encode-pixels.js").BuiltPalette | null} */
  let sharedPalette = null;
  const indexedBpp = indexedBitsPerPixel(outputFormat);
  if (indexedBpp !== null) {
    sharedPalette = buildPalette(frames.flat(), 1 << indexedBpp);
    result.warnings.push(...sharedPalette.warnings);
  }

  /** @type {number[][]} */
  const encodedFrames = [];
  /** @type {number[] | null} */
  let palette = null;
  let elementType = "uint32_t";

  for (const pixels of frames) {
    const encoded = encodePixels({
      format: outputFormat,
      pixels,
      width: outWidth,
      height: outHeight,
      bitOrder: resolvedBitOrder,
      sharedPalette,
    });
    result.warnings.push(...encoded.warnings);
    encodedFrames.push(encoded.values);
    elementType = encoded.elementType;
    if (encoded.palette) palette = encoded.palette;
  }

  result.elementType = elementType;
  result.source = toCArray({
    arrayName,
    width: outWidth,
    height: outHeight,
    elementType,
    frames: encodedFrames,
    palette,
  });

  const colorGrid = frames[0].map((p) => pixelColorKey(p, null));
  const rects = mergeRects(colorGrid, outWidth, outHeight);
  result.previewSvg = toSvg({
    width: outWidth,
    height: outHeight,
    rects,
    displayScale: 1,
    minify: true,
  });

  return result;
}
