import test from "node:test";
import assert from "node:assert/strict";
import { parseCArray, parseNumericLiterals, sliceFrameValues } from "../app/converter/parse-c-array.js";
import { detectFormatFromType, resolveFormat } from "../app/converter/detect-format.js";
import {
  decodeArgb32,
  decodeRgb565,
  decode1Bit,
  decodePixels,
  oneBitStride,
  pixelColorKey,
} from "../app/converter/decode-pixels.js";
import { mergeRects } from "../app/converter/merge-rects.js";
import { toSvg } from "../app/converter/to-svg.js";
import { convertCToSvg } from "../app/converter/convert.js";

const WIND_LIKE = `#include <stdint.h>

#define NEW_PISKEL_FRAME_COUNT 1
#define NEW_PISKEL_FRAME_WIDTH 14
#define NEW_PISKEL_FRAME_HEIGHT 14

static const uint32_t new_piskel_data[1][196] = {
{
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0xffffffff, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0x00000000, 0x00000000, 
0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000
}
};
`;

test("parseCArray reads Piskel-style wind.c fixture", () => {
  const parsed = parseCArray(WIND_LIKE);
  assert.equal(parsed.width, 14);
  assert.equal(parsed.height, 14);
  assert.equal(parsed.frameCount, 1);
  assert.equal(parsed.elementType, "uint32_t");
  assert.equal(parsed.values.length, 196);
  const opaque = parsed.values.filter((v) => (v & 0xff000000) !== 0);
  assert.equal(opaque.length, 35);
});

test("parseNumericLiterals reads hex and binary", () => {
  assert.deepEqual(parseNumericLiterals("0xff, 0b1010, 3"), [255, 10, 3]);
});

test("sliceFrameValues returns the requested frame", () => {
  assert.deepEqual(sliceFrameValues([1, 2, 3, 4], 1, 2), [3, 4]);
});

test("detectFormatFromType maps common types", () => {
  assert.equal(detectFormatFromType("uint32_t"), "argb32");
  assert.equal(detectFormatFromType("uint16_t"), "rgb565");
  assert.equal(detectFormatFromType("uint8_t"), "1bit");
  assert.equal(detectFormatFromType("float"), null);
});

test("resolveFormat prefers manual selection over auto", () => {
  assert.deepEqual(resolveFormat("rgb565", "uint32_t"), {
    format: "rgb565",
    detected: "argb32",
  });
  assert.deepEqual(resolveFormat("auto", "uint8_t"), {
    format: "1bit",
    detected: "1bit",
  });
  assert.deepEqual(resolveFormat("auto", null), {
    format: "argb32",
    detected: null,
  });
});

test("decodeArgb32 respects alpha", () => {
  assert.equal(decodeArgb32(0x00000000), null);
  assert.deepEqual(decodeArgb32(0xffffffff), { r: 255, g: 255, b: 255, a: 255 });
  assert.deepEqual(decodeArgb32(0x80ff0000), { r: 255, g: 0, b: 0, a: 128 });
});

test("decodeRgb565 expands channels", () => {
  assert.deepEqual(decodeRgb565(0xffff), { r: 255, g: 255, b: 255, a: 255 });
  assert.deepEqual(decodeRgb565(0xf800), { r: 255, g: 0, b: 0, a: 255 });
  assert.deepEqual(decodeRgb565(0x07e0), { r: 0, g: 255, b: 0, a: 255 });
  assert.deepEqual(decodeRgb565(0x001f), { r: 0, g: 0, b: 255, a: 255 });
});

test("decode1Bit unpacks MSB-first with byte padding", () => {
  assert.equal(oneBitStride(10), 2);
  // width 8: one byte 0b10000001 → pixels at x=0 and x=7
  const pixels = decode1Bit([0b10000001], 8, 1);
  assert.ok(pixels[0]);
  assert.equal(pixels[1], null);
  assert.ok(pixels[7]);
});

test("decodePixels ARGB32 frame", () => {
  const { pixels } = decodePixels({
    format: "argb32",
    values: [0x00000000, 0xffffffff, 0xff00ff00, 0x00000000],
    width: 2,
    height: 2,
  });
  assert.equal(pixels[0], null);
  assert.deepEqual(pixels[1], { r: 255, g: 255, b: 255, a: 255 });
  assert.deepEqual(pixels[2], { r: 0, g: 255, b: 0, a: 255 });
});

test("pixelColorKey supports override fill", () => {
  const pixel = { r: 1, g: 2, b: 3, a: 255 };
  assert.equal(pixelColorKey(pixel, null), "#010203");
  assert.equal(pixelColorKey(pixel, "#AABBCC"), "#AABBCC");
  assert.equal(pixelColorKey(null, "#AABBCC"), null);
});

test("mergeRects collapses a solid 2x2 into one rect", () => {
  const grid = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"];
  const rects = mergeRects(grid, 2, 2);
  assert.equal(rects.length, 1);
  assert.deepEqual(rects[0], { x: 0, y: 0, width: 2, height: 2, color: "#FFFFFF" });
});

test("mergeRects keeps an L-shape as multiple rects", () => {
  // ##
  // #
  const grid = ["#000000", "#000000", "#000000", null];
  const rects = mergeRects(grid, 2, 2);
  assert.ok(rects.length >= 2);
  const area = rects.reduce((sum, r) => sum + r.width * r.height, 0);
  assert.equal(area, 3);
});

test("toSvg groups rects by fill colour", () => {
  const svg = toSvg({
    width: 2,
    height: 1,
    rects: [
      { x: 0, y: 0, width: 1, height: 1, color: "#FF0000" },
      { x: 1, y: 0, width: 1, height: 1, color: "#00FF00" },
    ],
    displayScale: 10,
  });
  assert.match(svg, /viewBox="0 0 2 1"/);
  assert.match(svg, /fill="#FF0000"/);
  assert.match(svg, /fill="#00FF00"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
});

test("toSvg minify omits whitespace and xml declaration", () => {
  const svg = toSvg({
    width: 2,
    height: 1,
    rects: [{ x: 0, y: 0, width: 2, height: 1, color: "#FFFFFF" }],
    minify: true,
  });
  assert.equal(svg.includes("\n"), false);
  assert.equal(svg.includes("<?xml"), false);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
});

test("convertCToSvg end-to-end on wind-like fixture", () => {
  const result = convertCToSvg({ source: WIND_LIKE, format: "auto" });
  assert.equal(result.error, null);
  assert.equal(result.width, 14);
  assert.equal(result.height, 14);
  assert.equal(result.format, "argb32");
  assert.ok(result.svg);
  assert.match(result.svg, /fill="#FFFFFF"/);
  assert.ok(result.rectCount > 0);
  assert.ok(result.rectCount < 35, "neighbouring pixels should merge");
});

test("convertCToSvg override fill", () => {
  const result = convertCToSvg({
    source: WIND_LIKE,
    overrideFill: true,
    fillColor: "#00AAFF",
  });
  assert.equal(result.error, null);
  assert.match(result.svg, /fill="#00AAFF"/);
  assert.doesNotMatch(result.svg, /fill="#FFFFFF"/);
});
