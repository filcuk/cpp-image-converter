/**
 * Rasterise rect-based SVG (as emitted by this app) into RGBA pixel frames.
 * Uses string parsing so it runs in both browsers and Node tests (no DOMParser).
 */

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 * @typedef {{ x: number, y: number, width: number, height: number, fill: string | null }} SvgRect
 */

/**
 * @param {string} raw
 * @returns {Rgba | null}
 */
export function parseCssColor(raw) {
  if (!raw) return null;
  const value = String(raw).trim().toLowerCase();
  if (!value || value === "none" || value === "transparent") return null;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    }
    if (h.length === 6) {
      return {
        r: Number.parseInt(h.slice(0, 2), 16),
        g: Number.parseInt(h.slice(2, 4), 16),
        b: Number.parseInt(h.slice(4, 6), 16),
        a: 255,
      };
    }
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
      a: Number.parseInt(h.slice(6, 8), 16),
    };
  }

  const rgb = value.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/
  );
  if (rgb) {
    const a =
      rgb[4] === undefined ? 255 : Math.round(Number.parseFloat(rgb[4]) * 255);
    return {
      r: Math.round(Number.parseFloat(rgb[1])) & 0xff,
      g: Math.round(Number.parseFloat(rgb[2])) & 0xff,
      b: Math.round(Number.parseFloat(rgb[3])) & 0xff,
      a: Math.max(0, Math.min(255, a)),
    };
  }

  return null;
}

/**
 * @param {string} attrs
 * @param {string} name
 * @returns {string | null}
 */
function getAttr(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  if (!match) return null;
  return match[2] ?? match[3] ?? null;
}

/**
 * @param {string} markup
 * @returns {{ width: number, height: number, warnings: string[] }}
 */
export function readSvgSizeFromMarkup(markup) {
  /** @type {string[]} */
  const warnings = [];
  const viewBox = markup.match(/\bviewBox\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (viewBox) {
    const raw = viewBox[2] ?? viewBox[3] ?? "";
    const parts = raw.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return {
        width: Math.max(1, Math.round(parts[2])),
        height: Math.max(1, Math.round(parts[3])),
        warnings,
      };
    }
    warnings.push("Could not parse viewBox; falling back to width/height attributes.");
  }

  const widthAttr = Number.parseFloat(getAttr(markup, "width") ?? "");
  const heightAttr = Number.parseFloat(getAttr(markup, "height") ?? "");
  if (
    Number.isFinite(widthAttr) &&
    Number.isFinite(heightAttr) &&
    widthAttr > 0 &&
    heightAttr > 0
  ) {
    return {
      width: Math.max(1, Math.round(widthAttr)),
      height: Math.max(1, Math.round(heightAttr)),
      warnings,
    };
  }

  return {
    width: 0,
    height: 0,
    warnings: ["SVG has no usable viewBox or width/height."],
  };
}

/**
 * Collect rects from markup, inheriting fill from ancestor `<g fill="…">` tags.
 * @param {string} markup
 * @returns {SvgRect[]}
 */
export function collectRects(markup) {
  /** @type {SvgRect[]} */
  const rects = [];
  /** @type {(string | null)[]} */
  const fillStack = [null];

  const tokenRe = /<\/?g\b[^>]*>|<rect\b[^>]*\/?>/gi;
  let match;
  while ((match = tokenRe.exec(markup)) !== null) {
    const token = match[0];
    const lower = token.toLowerCase();

    if (lower.startsWith("</g")) {
      if (fillStack.length > 1) fillStack.pop();
      continue;
    }

    if (lower.startsWith("<g")) {
      const attrs = token.slice(2, -1);
      const fill = getAttr(attrs, "fill");
      fillStack.push(fill ?? fillStack[fillStack.length - 1] ?? null);
      continue;
    }

    if (lower.startsWith("<rect")) {
      const attrs = token.slice(5, token.endsWith("/>") ? -2 : -1);
      const ownFill = getAttr(attrs, "fill");
      const x = Number.parseFloat(getAttr(attrs, "x") ?? "0");
      const y = Number.parseFloat(getAttr(attrs, "y") ?? "0");
      const width = Number.parseFloat(getAttr(attrs, "width") ?? "0");
      const height = Number.parseFloat(getAttr(attrs, "height") ?? "0");
      if (![x, y, width, height].every((n) => Number.isFinite(n))) continue;
      if (width <= 0 || height <= 0) continue;
      rects.push({
        x,
        y,
        width,
        height,
        fill: ownFill ?? fillStack[fillStack.length - 1] ?? null,
      });
    }
  }

  return rects;
}

/**
 * @param {SvgRect[]} rects
 * @param {number} width
 * @param {number} height
 * @returns {(Rgba | null)[]}
 */
function rasterizeRects(rects, width, height) {
  /** @type {(Rgba | null)[]} */
  const pixels = new Array(width * height).fill(null);
  for (const rect of rects) {
    const fill = parseCssColor(rect.fill ?? "");
    if (!fill || fill.a === 0) continue;
    const x0 = Math.max(0, Math.floor(rect.x));
    const y0 = Math.max(0, Math.floor(rect.y));
    const x1 = Math.min(width, Math.ceil(rect.x + rect.width));
    const y1 = Math.min(height, Math.ceil(rect.y + rect.height));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        pixels[py * width + px] = { ...fill };
      }
    }
  }
  return pixels;
}

/**
 * Split top-level frame groups from SVG body markup.
 * @param {string} body
 * @returns {{ id: string, markup: string }[]}
 */
function extractFrameGroups(body) {
  /** @type {{ id: string, markup: string }[]} */
  const frames = [];
  const re = /<g\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    const attrs = match[1];
    const id = getAttr(attrs, "id");
    if (!id || !/^frame-\d+$/i.test(id)) continue;

    const openEnd = match.index + match[0].length;
    let depth = 1;
    let i = openEnd;
    while (i < body.length && depth > 0) {
      const nextOpen = body.toLowerCase().indexOf("<g", i);
      const nextClose = body.toLowerCase().indexOf("</g", i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 2;
      } else {
        depth -= 1;
        if (depth === 0) {
          frames.push({
            id,
            markup: body.slice(match.index, nextClose + 4),
          });
          re.lastIndex = nextClose + 4;
          break;
        }
        i = nextClose + 3;
      }
    }
  }
  return frames;
}

/**
 * @param {string} source
 * @returns {{
 *   width: number,
 *   height: number,
 *   frames: (Rgba | null)[][],
 *   warnings: string[],
 *   error: string | null
 * }}
 */
export function svgToPixels(source) {
  /** @type {string[]} */
  const warnings = [];

  if (typeof source !== "string" || !source.trim()) {
    return {
      width: 0,
      height: 0,
      frames: [],
      warnings,
      error: "No SVG source provided.",
    };
  }

  const cleaned = source
    .replace(/<\?xml[\s\S]*?\?>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  if (!/<svg\b/i.test(cleaned)) {
    return {
      width: 0,
      height: 0,
      frames: [],
      warnings,
      error: "Root element is not <svg>.",
    };
  }

  const size = readSvgSizeFromMarkup(cleaned);
  warnings.push(...size.warnings);
  if (!size.width || !size.height) {
    return {
      width: 0,
      height: 0,
      frames: [],
      warnings,
      error: size.warnings[0] || "Could not determine SVG size.",
    };
  }

  if (/<(path|circle|ellipse|polygon|polyline|image|use|text)\b/i.test(cleaned)) {
    warnings.push(
      "Ignored unsupported elements (only <rect> fills are rasterised)."
    );
  }

  const openMatch = cleaned.match(/<svg\b[^>]*>/i);
  const closeIdx = cleaned.toLowerCase().lastIndexOf("</svg>");
  const body =
    openMatch && closeIdx !== -1
      ? cleaned.slice((openMatch.index ?? 0) + openMatch[0].length, closeIdx)
      : cleaned;

  const frameGroups = extractFrameGroups(body);
  /** @type {(Rgba | null)[][]} */
  let frames;
  if (frameGroups.length > 0) {
    frameGroups.sort((a, b) => {
      const ia = Number.parseInt(a.id.replace(/\D/g, ""), 10);
      const ib = Number.parseInt(b.id.replace(/\D/g, ""), 10);
      return ia - ib;
    });
    frames = frameGroups.map((g) =>
      rasterizeRects(collectRects(g.markup), size.width, size.height)
    );
  } else {
    frames = [rasterizeRects(collectRects(body), size.width, size.height)];
  }

  return {
    width: size.width,
    height: size.height,
    frames,
    warnings,
    error: null,
  };
}
