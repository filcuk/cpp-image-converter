/**
 * Parse C/C++ image array source text into dimensions and numeric values.
 */

/**
 * @typedef {object} ParseCArrayResult
 * @property {number | null} width
 * @property {number | null} height
 * @property {number} frameCount
 * @property {string | null} elementType
 * @property {number[]} values All numeric literals from the first data array body
 * @property {string | null} arrayName
 * @property {string[]} warnings
 */

const DEFINE_WIDTH_RE =
  /#\s*define\s+\w*(?:FRAME_)?WIDTH\w*\s+(\d+)/i;
const DEFINE_HEIGHT_RE =
  /#\s*define\s+\w*(?:FRAME_)?HEIGHT\w*\s+(\d+)/i;
const DEFINE_FRAME_COUNT_RE =
  /#\s*define\s+\w*FRAME_COUNT\w*\s+(\d+)/i;

const ARRAY_DECL_RE =
  /(?:static\s+)?(?:const\s+)?((?:unsigned\s+)?(?:long|int|short|char)|u?int(?:_fast|_least)?(?:8|16|32|64)_t|uint8|uint16|uint32|byte)\s+(\w+)\s*(?:\[[^\]]*\])+\s*=/i;

/**
 * Find the matching closing brace for an opening `{` at `openIndex`.
 * @param {string} text
 * @param {number} openIndex
 * @returns {number} Index of closing `}`, or -1
 */
function findMatchingBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Strip // and /* * / comments (best-effort; does not handle strings).
 * @param {string} text
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");
}

/**
 * Parse integer literals from a C array body (hex, binary, decimal).
 * @param {string} body
 * @returns {number[]}
 */
export function parseNumericLiterals(body) {
  const values = [];
  const cleaned = body.replace(/\s+/g, " ");

  // Walk left-to-right preferring hex/bin over overlapping decimal digits
  let i = 0;
  while (i < cleaned.length) {
    const slice = cleaned.slice(i);
    const hex = slice.match(/^0x[0-9a-fA-F]+/i);
    if (hex) {
      values.push(Number.parseInt(hex[0], 16));
      i += hex[0].length;
      continue;
    }
    const bin = slice.match(/^0b[01]+/i);
    if (bin) {
      values.push(Number.parseInt(bin[0].slice(2), 2));
      i += bin[0].length;
      continue;
    }
    const dec = slice.match(/^\d+/);
    if (dec) {
      // Skip lone digits that are part of identifiers already handled; here body is numbers/commas
      values.push(Number.parseInt(dec[0], 10));
      i += dec[0].length;
      continue;
    }
    i += 1;
  }

  return values;
}

/**
 * Extract values for a single frame from a flat value list.
 * @param {number[]} values
 * @param {number} frameIndex
 * @param {number} frameSize width * height (ARGB/RGB565) or bytes per frame (1-bit handled later)
 * @returns {number[]}
 */
export function sliceFrameValues(values, frameIndex, frameSize) {
  if (!Number.isFinite(frameSize) || frameSize <= 0) return values.slice();
  const start = frameIndex * frameSize;
  return values.slice(start, start + frameSize);
}

/**
 * @param {string} source
 * @returns {ParseCArrayResult}
 */
export function parseCArray(source) {
  /** @type {ParseCArrayResult} */
  const result = {
    width: null,
    height: null,
    frameCount: 1,
    elementType: null,
    values: [],
    arrayName: null,
    warnings: [],
  };

  if (typeof source !== "string" || !source.trim()) {
    result.warnings.push("No source text provided.");
    return result;
  }

  const text = stripComments(source);

  const widthMatch = text.match(DEFINE_WIDTH_RE);
  const heightMatch = text.match(DEFINE_HEIGHT_RE);
  const frameCountMatch = text.match(DEFINE_FRAME_COUNT_RE);

  if (widthMatch) result.width = Number.parseInt(widthMatch[1], 10);
  if (heightMatch) result.height = Number.parseInt(heightMatch[1], 10);
  if (frameCountMatch) {
    result.frameCount = Math.max(1, Number.parseInt(frameCountMatch[1], 10));
  }

  const declMatch = text.match(ARRAY_DECL_RE);
  let body = "";

  if (declMatch) {
    result.elementType = declMatch[1].replace(/\s+/g, " ").trim();
    result.arrayName = declMatch[2];
    const afterDecl = text.slice(declMatch.index + declMatch[0].length);
    const openIdx = afterDecl.indexOf("{");
    if (openIdx !== -1) {
      const absoluteOpen = (declMatch.index ?? 0) + declMatch[0].length + openIdx;
      const closeIdx = findMatchingBrace(text, absoluteOpen);
      if (closeIdx !== -1) {
        body = text.slice(absoluteOpen + 1, closeIdx);
      } else {
        result.warnings.push("Could not find matching closing brace for the data array.");
        body = afterDecl.slice(openIdx + 1);
      }
    } else {
      result.warnings.push("Array declaration found but no initializer `{`.");
    }
  } else {
    // Fallback: treat entire text as an array body of hex literals
    result.warnings.push(
      "No typed array declaration found; extracting hex/binary literals from the whole text."
    );
    body = text;
  }

  if (body) {
    const hexOrBin = [...body.matchAll(/0x[0-9a-fA-F]+|0b[01]+/gi)];
    if (hexOrBin.length > 0) {
      // Typical image dumps use hex (or binary); skip bare decimals in the body
      result.values = hexOrBin.map((m) => {
        const token = m[0];
        if (token.toLowerCase().startsWith("0b")) {
          return Number.parseInt(token.slice(2), 2);
        }
        return Number.parseInt(token, 16);
      });
    } else {
      result.values = parseNumericLiterals(body);
    }
  }

  if (result.values.length === 0) {
    result.warnings.push("No numeric literals found in the array body.");
  }

  return result;
}
