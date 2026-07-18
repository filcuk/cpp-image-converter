/**
 * Merge neighbouring same-colour pixels into larger rectangles.
 */

/**
 * @typedef {{ x: number, y: number, width: number, height: number, color: string }} MergedRect
 */

/**
 * @param {(string | null)[]} colorGrid Flat row-major colour keys (`#RRGGBB` or null)
 * @param {number} width
 * @param {number} height
 * @returns {MergedRect[]}
 */
export function mergeRects(colorGrid, width, height) {
  if (!width || !height || colorGrid.length < width * height) {
    return [];
  }

  /** @type {boolean[]} */
  const visited = new Array(width * height).fill(false);
  /** @type {MergedRect[]} */
  const rects = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (visited[index]) continue;

      const color = colorGrid[index];
      if (!color) {
        visited[index] = true;
        continue;
      }

      // Grow width along this row
      let w = 1;
      while (
        x + w < width &&
        !visited[y * width + x + w] &&
        colorGrid[y * width + x + w] === color
      ) {
        w += 1;
      }

      // Grow height while every cell in the row segment matches
      let h = 1;
      grow: while (y + h < height) {
        for (let dx = 0; dx < w; dx++) {
          const i = (y + h) * width + x + dx;
          if (visited[i] || colorGrid[i] !== color) break grow;
        }
        h += 1;
      }

      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          visited[(y + dy) * width + x + dx] = true;
        }
      }

      rects.push({ x, y, width: w, height: h, color });
    }
  }

  return rects;
}

/**
 * Build a colour-key grid from pixels.
 * @param {(import("./decode-pixels.js").Rgba | null)[]} pixels
 * @param {number} width
 * @param {number} height
 * @param {string | null} overrideFill
 * @param {(pixel: import("./decode-pixels.js").Rgba | null, override: string | null) => string | null} colorKeyFn
 * @returns {(string | null)[]}
 */
export function buildColorGrid(pixels, width, height, overrideFill, colorKeyFn) {
  const grid = new Array(width * height);
  for (let i = 0; i < width * height; i++) {
    grid[i] = colorKeyFn(pixels[i] ?? null, overrideFill);
  }
  return grid;
}
