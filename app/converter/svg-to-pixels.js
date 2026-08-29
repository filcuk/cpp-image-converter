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

const RESOURCE_ATTR_RE =
  /\s(?:href|xlink:href|src|srcset)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+)/gi;
const URL_FUNCTION_RE =
  /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;

/**
 * Keep only same-document fragment references in resource-bearing SVG
 * attributes and CSS URL functions. This prevents the browser's SVG image
 * decoder from fetching external resources while preserving local gradients,
 * symbols, masks, and filters.
 * @param {string} markup
 * @returns {string}
 */
export function sanitizeSvgReferences(markup) {
  if (typeof markup !== "string") return "";

  let sanitized = markup.replace(RESOURCE_ATTR_RE, (attribute) => {
    const match = attribute.match(
      /^\s(?:href|xlink:href|src|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/i
    );
    const value = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
    return value.trim().startsWith("#") ? attribute : "";
  });

  sanitized = sanitized.replace(
    /@import\s+(?:"[^"]*"|'[^']*'|url\([^)]*\))[^;]*;?/gi,
    ""
  );
  return sanitized.replace(
    URL_FUNCTION_RE,
    (full, doubleQuoted, singleQuoted, unquoted) => {
      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
      return value.trim().startsWith("#") ? full : "none";
    }
  );
}

/**
 * @param {string} attrs
 * @param {string} name
 * @returns {string | null}
 */
function getAttr(attrs, name) {
  const match = attrs.match(
    new RegExp(
      `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"'/]+))`,
      "i"
    )
  );
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

/**
 * Resolve paint colour from `fill="…"` or `style="fill:…"`.
 * @param {string} attrs
 * @returns {string | null}
 */
export function resolveFillValue(attrs) {
  const style = getAttr(attrs, "style");
  if (style) {
    const fillMatch = style.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i);
    if (fillMatch) {
      const value = fillMatch[1].trim();
      if (value) return value;
    }
  }
  return getAttr(attrs, "fill");
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
 * Collect rects from markup, inheriting fill from ancestor `<g>` tags
 * (`fill` attribute or `style="fill:…"`).
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
      const fill = resolveFillValue(attrs);
      fillStack.push(fill ?? fillStack[fillStack.length - 1] ?? null);
      continue;
    }

    if (lower.startsWith("<rect")) {
      const attrs = token.slice(5, token.endsWith("/>") ? -2 : -1);
      const ownFill = resolveFillValue(attrs);
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
 * Prepare a frame `<g id="frame-N">…</g>` for static rasterisation:
 * drop SMIL `<animate>` and force the group visible (animated exports use opacity="0").
 * @param {string} markup
 * @returns {string}
 */
export function prepareFrameGroupMarkup(markup) {
  let out = markup.replace(/<animate\b[^>]*\/?\s*>/gi, "");
  out = out.replace(/<g\b([^>]*)>/i, (_full, attrs) => {
    const cleaned = String(attrs).replace(
      /\s*\bopacity\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"'/]+)/gi,
      ""
    );
    return `<g${cleaned} opacity="1">`;
  });
  return out;
}

/**
 * Count `<g id="frame-N">` groups in SVG markup (no rasterisation).
 * @param {string} source
 * @returns {number}
 */
export function countSvgFrames(source) {
  if (typeof source !== "string" || !source.trim()) return 1;
  const cleaned = source
    .replace(/<\?xml[\s\S]*?\?>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const openMatch = cleaned.match(/<svg\b[^>]*>/i);
  const closeIdx = cleaned.toLowerCase().lastIndexOf("</svg>");
  const body =
    openMatch && closeIdx !== -1
      ? cleaned.slice((openMatch.index ?? 0) + openMatch[0].length, closeIdx)
      : cleaned;
  const frames = extractFrameGroups(body);
  return Math.max(1, frames.length || 1);
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
 */
function ensureSvgXmlns(source) {
  if (/<svg\b[^>]*\bxmlns\s*=/i.test(source)) return source;
  return source.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

/**
 * Wrap inner markup as a standalone SVG document for canvas drawing.
 * @param {string} inner
 * @param {number} width
 * @param {number} height
 */
function wrapSvgDocument(inner, width, height) {
  return ensureSvgXmlns(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${inner}</svg>`
  );
}

/**
 * Rasterise any SVG via canvas (paths, circles, etc.). Browser only.
 * @param {string} svgDocument
 * @param {number} width
 * @param {number} height
 * @returns {Promise<(Rgba | null)[]>}
 */
export async function rasterizeSvgDocumentWithCanvas(svgDocument, width, height) {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("Canvas SVG rasterisation requires a browser.");
  }

  const safeSvgDocument = sanitizeSvgReferences(svgDocument);
  const blob = new Blob([ensureSvgXmlns(safeSvgDocument)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(undefined);
      img.onerror = () => reject(new Error("Browser could not decode the SVG image."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create canvas context.");

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    /** @type {(Rgba | null)[]} */
    const pixels = new Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const a = data[o + 3];
      if (a === 0) {
        pixels[i] = null;
      } else {
        pixels[i] = {
          r: data[o],
          g: data[o + 1],
          b: data[o + 2],
          a,
        };
      }
    }
    return pixels;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Sync rect-only rasteriser (Node tests + fallback).
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

  const cleaned = sanitizeSvgReferences(
    source
      .replace(/<\?xml[\s\S]*?\?>/i, "")
      .replace(/<!--[\s\S]*?-->/g, "")
  );

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
      "This environment only rasterises <rect> fills; path-based shapes need the browser canvas path."
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
      rasterizeRects(collectRects(prepareFrameGroupMarkup(g.markup)), size.width, size.height)
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

/**
 * Prefer canvas rasterisation in the browser (paths, strokes, etc.).
 * Falls back to the rect-only parser when canvas is unavailable.
 * @param {string} source
 * @returns {Promise<{
 *   width: number,
 *   height: number,
 *   frames: (Rgba | null)[][],
 *   warnings: string[],
 *   error: string | null
 * }>}
 */
export async function svgToPixelsAsync(source) {
  const canUseCanvas =
    typeof document !== "undefined" &&
    typeof Image !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function";

  if (!canUseCanvas) {
    return svgToPixels(source);
  }

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

  const cleaned = sanitizeSvgReferences(
    source
      .replace(/<\?xml[\s\S]*?\?>/i, "")
      .replace(/<!--[\s\S]*?-->/g, "")
  );

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

  const openMatch = cleaned.match(/<svg\b[^>]*>/i);
  const closeIdx = cleaned.toLowerCase().lastIndexOf("</svg>");
  const body =
    openMatch && closeIdx !== -1
      ? cleaned.slice((openMatch.index ?? 0) + openMatch[0].length, closeIdx)
      : cleaned;

  const frameGroups = extractFrameGroups(body);

  try {
    /** @type {(Rgba | null)[][]} */
    let frames;
    if (frameGroups.length > 0) {
      frameGroups.sort((a, b) => {
        const ia = Number.parseInt(a.id.replace(/\D/g, ""), 10);
        const ib = Number.parseInt(b.id.replace(/\D/g, ""), 10);
        return ia - ib;
      });
      frames = [];
      for (const g of frameGroups) {
        const inner = prepareFrameGroupMarkup(g.markup);
        frames.push(
          await rasterizeSvgDocumentWithCanvas(
            wrapSvgDocument(inner, size.width, size.height),
            size.width,
            size.height
          )
        );
      }
    } else {
      frames = [
        await rasterizeSvgDocumentWithCanvas(
          ensureSvgXmlns(cleaned),
          size.width,
          size.height
        ),
      ];
    }

    const opaque = frames.reduce(
      (sum, frame) => sum + frame.filter((p) => p && p.a > 0).length,
      0
    );
    if (opaque === 0) {
      warnings.push(
        "Canvas rasterisation produced no opaque pixels; check that the SVG has visible fills and a valid viewBox."
      );
    }

    return {
      width: size.width,
      height: size.height,
      frames,
      warnings,
      error: null,
    };
  } catch (err) {
    const fallback = svgToPixels(source);
    fallback.warnings.unshift(
      err instanceof Error
        ? `Canvas rasterisation failed (${err.message}); fell back to <rect>-only parsing.`
        : "Canvas rasterisation failed; fell back to <rect>-only parsing."
    );
    return fallback;
  }
}
