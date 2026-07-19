/**
 * Canonical pixel-format ids, labels, and packing helpers.
 */

/** @typedef {"msb" | "lsb"} BitOrder */

/**
 * @typedef {"true-colour" | "colour-16" | "bw" | "grayscale" | "indexed"} FormatGroupId
 */

/**
 * Display labels for format groups in dropdown menus.
 * @type {Record<FormatGroupId, string>}
 */
export const FORMAT_GROUP_LABELS = {
  "true-colour": "True colour",
  "colour-16": "16-bit colour (TFT / LCD)",
  bw: "Black & white / e-ink",
  grayscale: "Grayscale",
  indexed: "Indexed / palette",
};

/**
 * @typedef {object} FormatInfo
 * @property {string} id
 * @property {string} label
 * @property {FormatGroupId} [group]
 * @property {boolean} [needsBitOrder]
 * @property {boolean} [indexed]
 */

/** @type {FormatInfo[]} */
export const FORMAT_CATALOGUE = [
  { id: "auto", label: "Auto" },
  { id: "argb32", label: "ARGB32 (LE RGBA)", group: "true-colour" },
  { id: "argb32-classic", label: "ARGB32 (classic)", group: "true-colour" },
  { id: "xrgb8888", label: "XRGB8888", group: "true-colour" },
  { id: "rgb888", label: "RGB888", group: "true-colour" },
  { id: "bgr888", label: "BGR888", group: "true-colour" },
  { id: "rgb565", label: "RGB565 (TFT)", group: "colour-16" },
  { id: "rgb565-swap", label: "RGB565 (TFT, byte-swap)", group: "colour-16" },
  { id: "rgb565a8", label: "RGB565A8", group: "colour-16" },
  { id: "argb8565", label: "ARGB8565", group: "colour-16" },
  { id: "1bit", label: "1-bit (B/W)", group: "bw", needsBitOrder: true },
  { id: "l8", label: "Grayscale L8", group: "grayscale" },
  { id: "al88", label: "Grayscale AL88", group: "grayscale" },
  { id: "p2", label: "Packed 2-bit", group: "grayscale", needsBitOrder: true },
  { id: "p4", label: "Packed 4-bit", group: "grayscale", needsBitOrder: true },
  { id: "i1", label: "Indexed I1", group: "indexed", needsBitOrder: true, indexed: true },
  { id: "i2", label: "Indexed I2", group: "indexed", needsBitOrder: true, indexed: true },
  { id: "i4", label: "Indexed I4", group: "indexed", needsBitOrder: true, indexed: true },
  { id: "i8", label: "Indexed I8", group: "indexed", indexed: true },
];

/** Manual format ids (excludes auto). */
export const MANUAL_FORMAT_IDS = FORMAT_CATALOGUE.filter((f) => f.id !== "auto").map(
  (f) => f.id
);

/**
 * @param {string} id
 * @returns {FormatInfo | undefined}
 */
export function getFormatInfo(id) {
  return FORMAT_CATALOGUE.find((f) => f.id === id);
}

/**
 * C array element type used when encoding this pixel format.
 * @param {string} format
 * @returns {"uint8_t" | "uint16_t" | "uint32_t" | null}
 */
export function elementTypeForFormat(format) {
  switch (format) {
    case "argb32":
    case "argb32-classic":
    case "xrgb8888":
      return "uint32_t";
    case "rgb565":
    case "rgb565-swap":
      return "uint16_t";
    case "rgb888":
    case "bgr888":
    case "rgb565a8":
    case "argb8565":
    case "i1":
    case "i2":
    case "i4":
    case "i8":
    case "l8":
    case "al88":
    case "p2":
    case "p4":
    case "1bit":
      return "uint8_t";
    default:
      return null;
  }
}

/**
 * @param {string} id
 */
export function formatLabel(id) {
  return getFormatInfo(id)?.label ?? String(id).toUpperCase();
}

/**
 * Label including the C element type, e.g. `RGB565 (uint16_t)`.
 * @param {string} id
 */
export function formatLabelWithType(id) {
  const label = formatLabel(id);
  const elementType = elementTypeForFormat(id);
  return elementType ? `${label} · ${elementType}` : label;
}

/**
 * @param {string} format
 */
export function formatNeedsBitOrder(format) {
  return Boolean(getFormatInfo(format)?.needsBitOrder);
}

/**
 * Values (array elements) needed for one frame at the given size.
 * For word formats each pixel is one value; for byte streams each byte is one value.
 * @param {string} format
 * @param {number} width
 * @param {number} height
 */
export function frameValueCount(format, width, height) {
  const w = Math.max(0, width | 0);
  const h = Math.max(0, height | 0);
  const pixels = w * h;

  switch (format) {
    case "argb32":
    case "argb32-classic":
    case "xrgb8888":
    case "rgb565":
    case "rgb565-swap":
      return pixels;
    case "rgb888":
    case "bgr888":
    case "rgb565a8":
    case "argb8565":
      return pixels * 3;
    case "al88":
      return pixels * 2;
    case "l8":
    case "i8":
      return pixels;
    case "1bit":
    case "i1":
      return packedStride(w, 1) * h;
    case "i2":
    case "p2":
      return packedStride(w, 2) * h;
    case "i4":
    case "p4":
      return packedStride(w, 4) * h;
    default:
      return pixels;
  }
}

/**
 * Row stride in bytes for packed bit formats.
 * @param {number} width
 * @param {number} bitsPerPixel
 */
export function packedStride(width, bitsPerPixel) {
  if (bitsPerPixel <= 0) return 0;
  return Math.ceil((width * bitsPerPixel) / 8);
}

/**
 * @param {string} format
 * @returns {number | null}
 */
export function indexedBitsPerPixel(format) {
  switch (format) {
    case "i1":
      return 1;
    case "i2":
      return 2;
    case "i4":
      return 4;
    case "i8":
      return 8;
    default:
      return null;
  }
}

/**
 * @param {string} format
 * @returns {number | null}
 */
export function packedGrayBitsPerPixel(format) {
  switch (format) {
    case "p2":
      return 2;
    case "p4":
      return 4;
    default:
      return null;
  }
}

/**
 * @param {string | null | undefined} id
 * @returns {id is string}
 */
export function isManualFormat(id) {
  return typeof id === "string" && MANUAL_FORMAT_IDS.includes(id);
}
