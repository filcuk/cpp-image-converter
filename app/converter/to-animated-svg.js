/**
 * Emit an animated multi-frame SVG using SMIL opacity cycling.
 */

/**
 * @param {import("./merge-rects.js").MergedRect[]} rects
 * @returns {Map<string, import("./merge-rects.js").MergedRect[]>}
 */
function groupByColor(rects) {
  /** @type {Map<string, import("./merge-rects.js").MergedRect[]>} */
  const byColor = new Map();
  for (const rect of rects) {
    const list = byColor.get(rect.color);
    if (list) list.push(rect);
    else byColor.set(rect.color, [rect]);
  }
  return byColor;
}

/**
 * @param {Map<string, import("./merge-rects.js").MergedRect[]>} byColor
 * @param {{ minify?: boolean, indent?: string }} [options]
 */
function serializeColorGroups(byColor, { minify = false, indent = "" } = {}) {
  /** @type {string[]} */
  const parts = [];
  if (minify) {
    for (const [color, group] of byColor) {
      parts.push(`<g fill="${color}">`);
      for (const r of group) {
        parts.push(
          `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`
        );
      }
      parts.push(`</g>`);
    }
    return parts.join("");
  }

  const inner = indent + "  ";
  for (const [color, group] of byColor) {
    parts.push(`${indent}<g fill="${color}">`);
    for (const r of group) {
      parts.push(
        `${inner}<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" />`
      );
    }
    parts.push(`${indent}</g>`);
  }
  return parts.join("\n");
}

/**
 * Build discrete opacity keyTimes/values so frame `index` is visible for 1/N of the loop.
 * @param {number} frameIndex
 * @param {number} frameCount
 */
export function opacityKeyframes(frameIndex, frameCount) {
  const n = Math.max(1, frameCount);
  /** @type {string[]} */
  const values = [];
  /** @type {string[]} */
  const keyTimes = [];
  for (let i = 0; i < n; i++) {
    values.push(i === frameIndex ? "1" : "0");
    keyTimes.push(String(i / n));
  }
  // Close the loop at t=1 with the same value as t=0 so the cycle is seamless
  values.push(frameIndex === 0 ? "1" : "0");
  keyTimes.push("1");
  return { values: values.join(";"), keyTimes: keyTimes.join(";") };
}

/**
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {import("./merge-rects.js").MergedRect[][]} options.frames
 * @param {number} [options.displayScale]
 * @param {number} [options.frameDurationMs] Duration of each frame in milliseconds
 * @param {boolean} [options.minify]
 * @returns {string}
 */
export function toAnimatedSvg({
  width,
  height,
  frames,
  displayScale = 10,
  frameDurationMs = 100,
  minify = false,
}) {
  const frameCount = Math.max(1, frames.length);
  const durationSec = Math.max(0.016, (frameDurationMs * frameCount) / 1000);
  const displayW = width * displayScale;
  const displayH = height * displayScale;

  /** @type {string[]} */
  const frameBlocks = [];

  for (let i = 0; i < frameCount; i++) {
    const rects = frames[i] ?? [];
    const byColor = groupByColor(rects);
    const { values, keyTimes } = opacityKeyframes(i, frameCount);
    const body = serializeColorGroups(byColor, {
      minify,
      indent: minify ? "" : "    ",
    });
    const animate = `<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" dur="${durationSec}s" repeatCount="indefinite" calcMode="discrete"/>`;

    if (minify) {
      frameBlocks.push(
        `<g id="frame-${i}" opacity="${i === 0 ? 1 : 0}">${animate}${body}</g>`
      );
    } else {
      frameBlocks.push(
        [
          `  <g id="frame-${i}" opacity="${i === 0 ? 1 : 0}">`,
          `    ${animate}`,
          body,
          `  </g>`,
        ].join("\n")
      );
    }
  }

  if (minify) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${displayW}" height="${displayH}" shape-rendering="crispEdges">`,
      ...frameBlocks,
      `</svg>`,
    ].join("");
  }

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${displayW}" height="${displayH}" shape-rendering="crispEdges">`,
    ...frameBlocks,
    "</svg>",
  ].join("\n");
}
