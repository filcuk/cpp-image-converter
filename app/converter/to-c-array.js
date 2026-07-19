/**
 * Emit a Piskel-like C source file from packed frame values.
 */

/**
 * @param {string} name
 */
function sanitizeIdent(name) {
  const cleaned = String(name || "image")
    .trim()
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^([^A-Za-z_])/, "_$1");
  return cleaned || "image";
}

/**
 * @param {number} value
 * @param {string} elementType
 */
function formatHex(value, elementType) {
  const v = value >>> 0;
  if (elementType === "uint32_t") {
    return `0x${v.toString(16).padStart(8, "0")}`;
  }
  if (elementType === "uint16_t") {
    return `0x${(v & 0xffff).toString(16).padStart(4, "0")}`;
  }
  return `0x${(v & 0xff).toString(16).padStart(2, "0")}`;
}

/**
 * @param {number[]} values
 * @param {string} elementType
 * @param {number} width hint for wrapping (pixels or bytes per row)
 */
function formatValueRows(values, elementType, perRow) {
  const rowSize = Math.max(1, perRow);
  /** @type {string[]} */
  const lines = [];
  for (let i = 0; i < values.length; i += rowSize) {
    const slice = values.slice(i, i + rowSize);
    const cells = slice.map((v) => formatHex(v, elementType));
    const suffix = i + rowSize < values.length ? "," : "";
    lines.push(`${cells.join(", ")}${suffix}`);
  }
  return lines;
}

/**
 * @param {object} options
 * @param {string} [options.arrayName]
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.elementType
 * @param {number[][]} options.frames values per frame
 * @param {number[] | null} [options.palette]
 * @returns {string}
 */
export function toCArray({
  arrayName = "image",
  width,
  height,
  elementType,
  frames,
  palette = null,
}) {
  const name = sanitizeIdent(arrayName);
  const prefix = name.toUpperCase();
  const frameCount = Math.max(1, frames.length);
  const frameSize = frames[0]?.length ?? 0;
  const perRow =
    elementType === "uint8_t"
      ? Math.min(16, Math.max(1, width))
      : Math.min(14, Math.max(1, width));

  /** @type {string[]} */
  const lines = [
    "#include <stdint.h>",
    "",
    `#define ${prefix}_FRAME_COUNT ${frameCount}`,
    `#define ${prefix}_FRAME_WIDTH ${width}`,
    `#define ${prefix}_FRAME_HEIGHT ${height}`,
  ];

  if (palette && palette.length > 0) {
    lines.push(`#define ${prefix}_COLOR_COUNT ${palette.length}`, "");
    lines.push(`static const uint32_t ${name}_color[${palette.length}] = {`);
    lines.push(
      ...formatValueRows(palette, "uint32_t", Math.min(8, palette.length)).map(
        (row) => `  ${row}`
      )
    );
    lines.push("};", "");
  } else {
    lines.push("");
  }

  lines.push(
    `static const ${elementType} ${name}_data[${frameCount}][${frameSize}] = {`
  );

  frames.forEach((frameValues, frameIndex) => {
    lines.push("{");
    const rows = formatValueRows(frameValues, elementType, perRow);
    for (const row of rows) {
      lines.push(`  ${row}`);
    }
    lines.push(frameIndex < frames.length - 1 ? "}," : "}");
  });

  lines.push("};", "");
  return lines.join("\n");
}
