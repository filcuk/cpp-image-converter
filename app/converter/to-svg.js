/**
 * Emit an SVG document from merged rectangles.
 */

/**
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {import("./merge-rects.js").MergedRect[]} options.rects
 * @param {number} [options.displayScale] Display width/height multiplier (attributes only)
 * @param {boolean} [options.minify] Compact single-line output without indentation
 * @returns {string}
 */
export function toSvg({ width, height, rects, displayScale = 10, minify = false }) {
  const displayW = width * displayScale;
  const displayH = height * displayScale;

  /** @type {Map<string, import("./merge-rects.js").MergedRect[]>} */
  const byColor = new Map();
  for (const rect of rects) {
    const list = byColor.get(rect.color);
    if (list) list.push(rect);
    else byColor.set(rect.color, [rect]);
  }

  if (minify) {
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${displayW}" height="${displayH}" shape-rendering="crispEdges">`,
    ];
    for (const [color, group] of byColor) {
      parts.push(`<g fill="${color}">`);
      for (const r of group) {
        parts.push(
          `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`
        );
      }
      parts.push(`</g>`);
    }
    parts.push(`</svg>`);
    return parts.join("");
  }

  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${displayW}" height="${displayH}" shape-rendering="crispEdges">`,
  ];

  for (const [color, group] of byColor) {
    lines.push(`  <g fill="${color}">`);
    for (const r of group) {
      lines.push(
        `    <rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" />`
      );
    }
    lines.push("  </g>");
  }

  lines.push("</svg>");
  return lines.join("\n");
}

/**
 * Full pipeline: pixels → colour grid → merge → SVG string.
 * @param {object} options
 * @param {(import("./decode-pixels.js").Rgba | null)[]} options.pixels
 * @param {number} options.width
 * @param {number} options.height
 * @param {string | null} [options.overrideFill]
 * @param {number} [options.displayScale]
 * @param {(pixel: import("./decode-pixels.js").Rgba | null, override: string | null) => string | null} options.colorKeyFn
 * @param {(grid: (string | null)[], w: number, h: number) => import("./merge-rects.js").MergedRect[]} options.mergeFn
 * @returns {{ svg: string, rects: import("./merge-rects.js").MergedRect[] }}
 */
export function pixelsToSvg({
  pixels,
  width,
  height,
  overrideFill = null,
  displayScale = 10,
  colorKeyFn,
  mergeFn,
}) {
  const grid = [];
  for (let i = 0; i < width * height; i++) {
    grid.push(colorKeyFn(pixels[i] ?? null, overrideFill));
  }
  const rects = mergeFn(grid, width, height);
  const svg = toSvg({ width, height, rects, displayScale });
  return { svg, rects };
}
