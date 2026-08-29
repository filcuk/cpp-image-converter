/**
 * Parse C/C++ image array source text into dimensions and numeric values.
 */

/**
 * @typedef {object} ParsedArray
 * @property {string} elementType
 * @property {string} arrayName
 * @property {number[]} values
 * @property {number | null} frameCountHint
 */

/**
 * @typedef {object} ParseCArrayResult
 * @property {number | null} width
 * @property {number | null} height
 * @property {number} frameCount
 * @property {number | null} colorCount
 * @property {string | null} elementType
 * @property {number[]} values All numeric literals from the data array body
 * @property {number[] | null} palette Palette entries when present
 * @property {string | null} arrayName
 * @property {string[]} warnings
 */

const DEFINE_WIDTH_RE =
  /#\s*define\s+\w*(?:FRAME_)?WIDTH\w*\s+(\d+)/i;
const DEFINE_HEIGHT_RE =
  /#\s*define\s+\w*(?:FRAME_)?HEIGHT\w*\s+(\d+)/i;
const DEFINE_FRAME_COUNT_RE =
  /#\s*define\s+\w*FRAME_COUNT\w*\s+(\d+)/i;
const DEFINE_COLOR_COUNT_RE =
  /#\s*define\s+\w*COLOR_COUNT\w*\s+(\d+)/i;

// Accept common storage/attribute tokens around the declarator without
// attempting to parse arbitrary C++ declaration syntax.
const ARRAY_DECL_RE =
  /(?:(?:static|const|volatile)\s+|[A-Za-z_]\w*\s+|__attribute__\s*\(\([\s\S]*?\)\)\s+)*((?:unsigned\s+)?(?:long|int|short|char)|u?int(?:_fast|_least)?(?:8|16|32|64)_t|uint8|uint16|uint32|byte)\s+(\w+)\s*((?:\[[^\]]*\])+)(?:\s+(?:[A-Za-z_]\w*|__attribute__\s*\(\([\s\S]*?\)\)))*\s*=/gi;

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
      values.push(Number.parseInt(dec[0], 10));
      i += dec[0].length;
      continue;
    }
    i += 1;
  }

  return values;
}

/**
 * @param {string} body
 * @returns {number[]}
 */
function extractArrayValues(body) {
  return parseNumericLiterals(body);
}

/**
 * @param {string} name
 */
function isPaletteArrayName(name) {
  return /color|palette/i.test(name);
}

/**
 * @param {string} text
 * @returns {ParsedArray[]}
 */
function findTypedArrays(text) {
  /** @type {ParsedArray[]} */
  const arrays = [];
  ARRAY_DECL_RE.lastIndex = 0;
  let match;
  while ((match = ARRAY_DECL_RE.exec(text)) !== null) {
    const elementType = match[1].replace(/\s+/g, " ").trim();
    const arrayName = match[2];
    const dimensions = match[3];
    const firstDimension = dimensions.match(/^\[\s*(\d+)\s*\]/);
    const afterDecl = text.slice(match.index + match[0].length);
    const openIdx = afterDecl.indexOf("{");
    if (openIdx === -1) continue;
    const absoluteOpen = match.index + match[0].length + openIdx;
    const closeIdx = findMatchingBrace(text, absoluteOpen);
    if (closeIdx === -1) continue;
    const body = text.slice(absoluteOpen + 1, closeIdx);
    arrays.push({
      elementType,
      arrayName,
      values: extractArrayValues(body),
      frameCountHint: firstDimension
        ? Number.parseInt(firstDimension[1], 10)
        : null,
    });
    ARRAY_DECL_RE.lastIndex = closeIdx + 1;
  }
  return arrays;
}

/**
 * Extract values for a single frame from a flat value list.
 * @param {number[]} values
 * @param {number} frameIndex
 * @param {number} frameSize
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
    colorCount: null,
    elementType: null,
    values: [],
    palette: null,
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
  const colorCountMatch = text.match(DEFINE_COLOR_COUNT_RE);

  if (widthMatch) result.width = Number.parseInt(widthMatch[1], 10);
  if (heightMatch) result.height = Number.parseInt(heightMatch[1], 10);
  if (frameCountMatch) {
    result.frameCount = Math.max(1, Number.parseInt(frameCountMatch[1], 10));
  }
  if (colorCountMatch) {
    result.colorCount = Math.max(0, Number.parseInt(colorCountMatch[1], 10));
  }

  const arrays = findTypedArrays(text);

  if (arrays.length === 0) {
    result.warnings.push(
      "No typed array declaration found; extracting hex/binary literals from the whole text."
    );
    result.values = extractArrayValues(text);
  } else {
    const paletteNamed = arrays.filter((a) => isPaletteArrayName(a.arrayName));
    const dataNamed = arrays.filter((a) => !isPaletteArrayName(a.arrayName));

    let data = dataNamed[0] ?? arrays[0];
    let paletteArr = paletteNamed[0] ?? null;

    if (!paletteArr && arrays.length >= 2 && result.colorCount !== null) {
      paletteArr = arrays.find((a) => a !== data) ?? arrays[1];
      if (paletteArr === data && arrays.length > 1) {
        paletteArr = arrays[1];
        data = arrays[0];
      }
    }

    result.elementType = data.elementType;
    result.arrayName = data.arrayName;
    result.values = data.values;
    if (data.frameCountHint !== null) {
      result.frameCount = Math.max(result.frameCount, data.frameCountHint);
    }

    if (paletteArr && paletteArr.values.length > 0) {
      let paletteValues = paletteArr.values;
      if (result.colorCount !== null && result.colorCount > 0) {
        paletteValues = paletteValues.slice(0, result.colorCount);
      }
      result.palette = paletteValues;
    }
  }

  if (result.values.length === 0) {
    result.warnings.push("No numeric literals found in the array body.");
  }

  return result;
}
