/**
 * Hint pixel format from a C/C++ array element type name.
 *
 * @param {string | null | undefined} elementType
 * @returns {"argb32" | "rgb565" | "1bit" | null}
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

  if (
    t === "uint8_t" ||
    t === "uint8" ||
    t === "unsigned char" ||
    t === "byte" ||
    t === "uint_fast8_t" ||
    t === "uint_least8_t"
  ) {
    return "1bit";
  }

  return null;
}

/**
 * Resolve effective format: manual selection wins over auto-detect.
 *
 * @param {"auto" | "argb32" | "rgb565" | "1bit"} selected
 * @param {string | null | undefined} elementType
 * @returns {{ format: "argb32" | "rgb565" | "1bit", detected: "argb32" | "rgb565" | "1bit" | null }}
 */
export function resolveFormat(selected, elementType) {
  const detected = detectFormatFromType(elementType);
  if (selected && selected !== "auto") {
    return { format: selected, detected };
  }
  return { format: detected ?? "argb32", detected };
}
