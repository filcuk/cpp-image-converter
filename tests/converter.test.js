import test from "node:test";
import assert from "node:assert/strict";
import { parseCArray, parseNumericLiterals, sliceFrameValues } from "../app/converter/parse-c-array.js";
import { detectFormatFromType, resolveFormat } from "../app/converter/detect-format.js";
import {
  decodeArgb32,
  decodeArgb32Classic,
  decodeRgb565,
  decodeRgb565Swap,
  decode1Bit,
  decodePixels,
  oneBitStride,
  pixelColorKey,
} from "../app/converter/decode-pixels.js";
import { frameValueCount, formatNeedsBitOrder } from "../app/converter/formats.js";
import { mergeRects } from "../app/converter/merge-rects.js";
import { toSvg } from "../app/converter/to-svg.js";
import { convertCToSvg } from "../app/converter/convert.js";

const WIND_LIKE = `#include <stdint.h>

#define IMG_FRAME_COUNT 1
#define IMG_FRAME_WIDTH 14
#define IMG_FRAME_HEIGHT 14

static const uint32_t example_data[1][196] = {
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

test("parseCArray reads ARGB32 wind.c-style fixture", () => {
  const parsed = parseCArray(WIND_LIKE);
  assert.equal(parsed.width, 14);
  assert.equal(parsed.height, 14);
  assert.equal(parsed.frameCount, 1);
  assert.equal(parsed.elementType, "uint32_t");
  assert.equal(parsed.values.length, 196);
  const opaque = parsed.values.filter((v) => (v & 0xff000000) !== 0);
  assert.equal(opaque.length, 35);
});

test("parseCArray extracts palette array", () => {
  const source = `
#define IMG_COLOR_COUNT 2
#define IMG_FRAME_WIDTH 2
#define IMG_FRAME_HEIGHT 1
static const uint32_t img_color[2] = { 0xff0000ff, 0xffffffff };
static const uint8_t img_data[1][1] = { { 0x80 } };
`;
  const parsed = parseCArray(source);
  assert.equal(parsed.colorCount, 2);
  assert.deepEqual(parsed.palette, [0xff0000ff, 0xffffffff]);
  assert.equal(parsed.elementType, "uint8_t");
  assert.deepEqual(parsed.values, [0x80]);
});

test("parseNumericLiterals reads hex and binary", () => {
  assert.deepEqual(parseNumericLiterals("0xff, 0b1010, 3"), [255, 10, 3]);
});

test("parseCArray keeps decimal literals alongside hex and binary", () => {
  const source = `
#define FRAME_WIDTH 2
#define FRAME_HEIGHT 1
static const uint8_t image_data[1][6] = {
  { 0xff, 0, 0, 0b00000000, 128, 0 }
};
`;
  const parsed = parseCArray(source);
  assert.deepEqual(parsed.values, [255, 0, 0, 0, 128, 0]);
});

test("parseCArray infers frame count from the data array dimension", () => {
  const source = `
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint32_t image_data[2][1] = {
  { 0xff0000ff },
  { 0xff00ff00 }
};
`;
  const parsed = parseCArray(source);
  assert.equal(parsed.frameCount, 2);
  assert.deepEqual(parsed.values, [0xff0000ff, 0xff00ff00]);
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
  assert.deepEqual(resolveFormat("argb32-classic", "uint32_t"), {
    format: "argb32-classic",
    detected: "argb32",
  });
});

test("auto-detects indexed I8 when palette and 1 byte/pixel", () => {
  const detected = resolveFormat("auto", {
    elementType: "uint8_t",
    palette: new Array(29).fill(0xff000000),
    width: 48,
    height: 48,
    valueCount: 6 * 2304,
    frameCount: 6,
    colorCount: 29,
  });
  assert.deepEqual(detected, { format: "i8", detected: "i8" });
});

test("auto-detects indexed I1 when palette and packed bit stride", () => {
  const detected = resolveFormat("auto", {
    elementType: "uint8_t",
    palette: [0xff0000ff, 0xffffffff],
    width: 8,
    height: 1,
    valueCount: 1,
    frameCount: 1,
    colorCount: 2,
  });
  assert.deepEqual(detected, { format: "i1", detected: "i1" });
});

test("convertCToSvg auto uses I8 for paletted uint8 image", () => {
  const source = `
#define FRAME_WIDTH 2
#define FRAME_HEIGHT 1
#define COLOR_COUNT 2
static const uint32_t image_color[2] = { 0xff0000ff, 0xffffffff };
static const uint8_t image_data[1][2] = { { 0x00, 0x01 } };
`;
  const result = convertCToSvg({ source, format: "auto", displayScale: 1 });
  assert.equal(result.error, null);
  assert.equal(result.format, "i8");
  assert.equal(result.detectedFormat, "i8");
  assert.match(result.svg, /fill="#FF0000"/i);
  assert.match(result.svg, /fill="#FFFFFF"/i);
});

test("frameValueCount covers packed formats", () => {
  assert.equal(frameValueCount("argb32", 2, 2), 4);
  assert.equal(frameValueCount("rgb888", 2, 2), 12);
  assert.equal(frameValueCount("1bit", 10, 1), 2);
  assert.equal(frameValueCount("i4", 4, 2), 4);
  assert.equal(formatNeedsBitOrder("1bit"), true);
  assert.equal(formatNeedsBitOrder("rgb565"), false);
});

test("decodeArgb32 respects alpha (little-endian RGBA)", () => {
  assert.equal(decodeArgb32(0x00000000), null);
  assert.deepEqual(decodeArgb32(0xffffffff), { r: 255, g: 255, b: 255, a: 255 });
  assert.deepEqual(decodeArgb32(0xff0000ff), { r: 255, g: 0, b: 0, a: 255 });
  assert.deepEqual(decodeArgb32(0x800000ff), { r: 255, g: 0, b: 0, a: 128 });
});

test("decodeArgb32Classic uses AARRGGBB", () => {
  assert.deepEqual(decodeArgb32Classic(0xffff0000), { r: 255, g: 0, b: 0, a: 255 });
  assert.deepEqual(decodeArgb32Classic(0xff0000ff), { r: 0, g: 0, b: 255, a: 255 });
});

test("decodeRgb565 expands channels", () => {
  assert.deepEqual(decodeRgb565(0xffff), { r: 255, g: 255, b: 255, a: 255 });
  assert.deepEqual(decodeRgb565(0xf800), { r: 255, g: 0, b: 0, a: 255 });
  assert.deepEqual(decodeRgb565(0x07e0), { r: 0, g: 255, b: 0, a: 255 });
  assert.deepEqual(decodeRgb565(0x001f), { r: 0, g: 0, b: 255, a: 255 });
});

test("decodeRgb565Swap reverses bytes", () => {
  assert.deepEqual(decodeRgb565Swap(0x00f8), { r: 255, g: 0, b: 0, a: 255 });
});

test("decode1Bit unpacks MSB-first with byte padding", () => {
  assert.equal(oneBitStride(10), 2);
  const pixels = decode1Bit([0b10000001], 8, 1);
  assert.ok(pixels[0]);
  assert.equal(pixels[1], null);
  assert.ok(pixels[7]);
});

test("decode1Bit LSB-first", () => {
  const pixels = decode1Bit([0b10000001], 8, 1, { r: 0, g: 0, b: 0, a: 255 }, "lsb");
  assert.ok(pixels[0]);
  assert.equal(pixels[1], null);
  assert.ok(pixels[7]);
});

test("encode1Bit thresholds fully opaque pixels by luminance", async () => {
  const { encodePixels } = await import("../app/converter/encode-pixels.js");
  const black = { r: 0, g: 0, b: 0, a: 255 };
  const white = { r: 255, g: 255, b: 255, a: 255 };
  const encoded = encodePixels({
    format: "1bit",
    pixels: [black, white, black, white],
    width: 4,
    height: 1,
  });
  assert.deepEqual(encoded.values, [0b10100000]);
});

test("encode1Bit preserves visible silhouettes when transparency exists", async () => {
  const { encodePixels } = await import("../app/converter/encode-pixels.js");
  const white = { r: 255, g: 255, b: 255, a: 255 };
  const encoded = encodePixels({
    format: "1bit",
    pixels: [white, null, white, null],
    width: 4,
    height: 1,
  });
  assert.deepEqual(encoded.values, [0b10100000]);
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

test("decodePixels RGB888", () => {
  const { pixels } = decodePixels({
    format: "rgb888",
    values: [255, 0, 0, 0, 255, 0],
    width: 2,
    height: 1,
  });
  assert.deepEqual(pixels[0], { r: 255, g: 0, b: 0, a: 255 });
  assert.deepEqual(pixels[1], { r: 0, g: 255, b: 0, a: 255 });
});

test("RGB565A8 uses planar colour then alpha layout", async () => {
  const { encodePixels } = await import("../app/converter/encode-pixels.js");
  const red = { r: 255, g: 0, b: 0, a: 128 };
  const green = { r: 0, g: 255, b: 0, a: 255 };
  const encoded = encodePixels({
    format: "rgb565a8",
    pixels: [red, green],
    width: 2,
    height: 1,
  });

  assert.deepEqual(encoded.values, [0x00, 0xf8, 0xe0, 0x07, 0x80, 0xff]);
  const { pixels } = decodePixels({
    format: "rgb565a8",
    values: encoded.values,
    width: 2,
    height: 1,
  });
  assert.deepEqual(pixels, [
    { r: 255, g: 0, b: 0, a: 128 },
    { r: 0, g: 255, b: 0, a: 255 },
  ]);
});

test("decodePixels indexed I1 with palette", () => {
  const { pixels, warnings } = decodePixels({
    format: "i1",
    values: [0b10000000],
    width: 8,
    height: 1,
    palette: [0xff0000ff, 0xffffffff],
  });
  assert.equal(warnings.length, 0);
  // MSB: bit7=1 → index 1 (white), bit6=0 → index 0 (red)
  assert.deepEqual(pixels[0], { r: 255, g: 255, b: 255, a: 255 });
  assert.deepEqual(pixels[1], { r: 255, g: 0, b: 0, a: 255 });
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

test("convertCToSvg classic ARGB32 red", () => {
  const source = `
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint32_t data[1] = { 0xffff0000 };
`;
  const classic = convertCToSvg({ source, format: "argb32-classic" });
  assert.match(classic.svg, /fill="#FF0000"/);
  const piskel = convertCToSvg({ source, format: "argb32" });
  assert.match(piskel.svg, /fill="#0000FF"/);
});

test("opacityKeyframes cycles frames", async () => {
  const { opacityKeyframes } = await import("../app/converter/to-animated-svg.js");
  assert.deepEqual(opacityKeyframes(0, 2), {
    values: "1;0;1",
    keyTimes: "0;0.5;1",
  });
  assert.deepEqual(opacityKeyframes(1, 2), {
    values: "0;1;0",
    keyTimes: "0;0.5;1",
  });
});

test("convertCToSvg animateFrames emits SMIL groups", () => {
  const source = `
#define FRAME_COUNT 2
#define FRAME_WIDTH 2
#define FRAME_HEIGHT 1
static const uint32_t data[2][2] = {
  { 0xff0000ff, 0xff0000ff },
  { 0xffffffff, 0xffffffff }
};
`;
  const result = convertCToSvg({
    source,
    format: "argb32",
    animateFrames: true,
    frameDurationMs: 100,
  });
  assert.equal(result.error, null);
  assert.equal(result.animated, true);
  assert.equal(result.frameCount, 2);
  assert.match(result.svg, /id="frame-0"/);
  assert.match(result.svg, /id="frame-1"/);
  assert.match(result.svg, /<animate attributeName="opacity"/);
  assert.match(result.svg, /fill="#FF0000"/);
  assert.match(result.svg, /fill="#FFFFFF"/);
});

test("convertCToSvg animateFrames dedupes per-frame decode warnings", () => {
  const source = `
#define FRAME_COUNT 3
#define FRAME_WIDTH 8
#define FRAME_HEIGHT 1
static const uint32_t palette[] = { 0xff0000ff };
static const uint8_t data[3][1] = { { 0x00 }, { 0xff }, { 0xaa } };
`;
  const result = convertCToSvg({
    source,
    format: "i1",
    animateFrames: true,
  });
  assert.equal(result.error, null);
  assert.equal(result.animated, true);
  const paletteWarnings = result.warnings.filter((w) =>
    w.includes("outside the") && w.includes("palette")
  );
  assert.equal(paletteWarnings.length, 1);
});

test("decodePixels short indexed palette does not warn when indices fit", () => {
  const { pixels, warnings } = decodePixels({
    format: "i8",
    values: [0, 1, 0, 1],
    width: 2,
    height: 2,
    palette: [0xff0000ff, 0xffffffff],
  });
  assert.equal(warnings.length, 0);
  assert.deepEqual(pixels[0], { r: 255, g: 0, b: 0, a: 255 });
  assert.deepEqual(pixels[1], { r: 255, g: 255, b: 255, a: 255 });
});

test("buildPalette warns when unique colours exceed format limit", async () => {
  const { buildPalette } = await import("../app/converter/encode-pixels.js");
  const pixels = [
    { r: 255, g: 0, b: 0, a: 255 },
    { r: 0, g: 255, b: 0, a: 255 },
    { r: 0, g: 0, b: 255, a: 255 },
  ];
  const built = buildPalette(pixels, 2);
  assert.equal(built.palette.length, 2);
  assert.equal(built.warnings.length, 1);
  assert.match(built.warnings[0], /keeps 2 colours; image has 3 unique/);
  assert.match(built.warnings[0], /1 colour will be remapped/);
  assert.equal(built.indexOf(pixels[2]), 0);
});

test("svg round-trip preserves ARGB32 red pixel", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const source = `
#define FRAME_WIDTH 2
#define FRAME_HEIGHT 1
static const uint32_t data[1][2] = { { 0xff0000ff, 0x00000000 } };
`;
  const forward = convertCToSvg({
    source,
    format: "argb32",
    displayScale: 1,
  });
  assert.ok(forward.svg);
  const back = convertSvgToC({
    source: forward.svg,
    format: "argb32",
    arrayName: "roundtrip",
  });
  assert.equal(back.error, null);
  assert.ok(back.source);
  assert.match(back.source, /0xff0000ff/i);
  assert.match(back.source, /ROUNDTRIP_FRAME_WIDTH 2/);
});

test("svg round-trip preserves RGB565 red", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const source = `
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint16_t data[1][1] = { { 0xf800 } };
`;
  const forward = convertCToSvg({ source, format: "rgb565", displayScale: 1 });
  assert.ok(forward.svg);
  const back = convertSvgToC({ source: forward.svg, format: "rgb565" });
  assert.equal(back.error, null);
  assert.match(back.source, /0xf800/i);
});

test("svgToPixels reads style=fill colours", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const inkscape = `<svg viewBox="0 0 2 1"><rect
     style="fill:#ff0000;fill-opacity:1;stroke:none"
     width="1" height="1" x="0" y="0" /></svg>`;
  const back = convertSvgToC({ source: inkscape, format: "argb32" });
  assert.equal(back.error, null);
  assert.match(back.source, /0xff0000ff/i);

  const styleOnG = `<svg viewBox="0 0 2 1"><g style="fill:#00FF00"><rect x="0" y="0" width="1" height="1"/></g></svg>`;
  const backG = convertSvgToC({ source: styleOnG, format: "argb32" });
  assert.match(backG.source, /0xff00ff00/i);
});

test("prepareFrameGroupMarkup forces opacity and drops animate", async () => {
  const { prepareFrameGroupMarkup } = await import(
    "../app/converter/svg-to-pixels.js"
  );
  const markup = `<g id="frame-1" opacity="0"><animate attributeName="opacity" values="0;1" dur="1s"/><rect x="0" y="0" width="1" height="1" fill="#FF0000"/></g>`;
  const prepared = prepareFrameGroupMarkup(markup);
  assert.match(prepared, /opacity="1"/);
  assert.doesNotMatch(prepared, /opacity="0"/);
  assert.doesNotMatch(prepared, /<animate\b/i);
  assert.match(prepared, /<rect/);
});

test("animated SVG round-trip keeps all frames", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const source = `
#define FRAME_COUNT 2
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint32_t data[2][1] = { { 0xff0000ff }, { 0xff00ff00 } };
`;
  const forward = convertCToSvg({
    source,
    format: "argb32",
    animateFrames: true,
    displayScale: 1,
  });
  assert.equal(forward.error, null);
  assert.equal(forward.animated, true);
  assert.match(forward.svg, /id="frame-1"[^>]*opacity="0"/);

  const back = convertSvgToC({ source: forward.svg, format: "argb32" });
  assert.equal(back.error, null);
  assert.match(back.source, /FRAME_COUNT 2/);
  assert.match(back.source, /0xff0000ff/i);
  assert.match(back.source, /0xff00ff00/i);
});

test("svg to indexed I1 emits palette and packed bytes", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 8 1"><rect x="0" y="0" width="1" height="1" fill="#FF0000"/><rect x="1" y="0" width="7" height="1" fill="#FFFFFF"/></svg>`;
  const result = convertSvgToC({ source: svg, format: "i1", arrayName: "x" });
  assert.equal(result.error, null);
  assert.equal(result.elementType, "uint8_t");
  assert.match(result.source, /X_COLOR_COUNT 2/);
  assert.match(result.source, /static const uint32_t x_color\[2\]/);
  assert.match(result.source, /static const uint8_t x_data/);
  assert.match(result.source, /0xff0000ff/i);
  assert.match(result.source, /0xffffffff/i);
});

test("svg to indexed I1 preview reflects quantised colours only", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 3 1">
    <rect x="0" y="0" width="1" height="1" fill="#FF0000"/>
    <rect x="1" y="0" width="1" height="1" fill="#00FF00"/>
    <rect x="2" y="0" width="1" height="1" fill="#0000FF"/>
  </svg>`;
  const result = convertSvgToC({ source: svg, format: "i1" });
  assert.equal(result.error, null);
  assert.ok(result.previewSvg);
  const fills = [...result.previewSvg.matchAll(/fill="(#[0-9A-Fa-f]+)"/g)].map(
    (m) => m[1].toUpperCase()
  );
  assert.deepEqual([...new Set(fills)].sort(), ["#00FF00", "#FF0000"]);
  assert.doesNotMatch(result.previewSvg, /fill="#0000FF"/i);
  assert.match(result.warnings.join(" "), /Indexed format keeps 2 colours/);
});

test("multi-frame svg to c preview is animated", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 1 1">
    <g id="frame-0" opacity="1"><rect x="0" y="0" width="1" height="1" fill="#FF0000"/></g>
    <g id="frame-1" opacity="0"><rect x="0" y="0" width="1" height="1" fill="#00FF00"/></g>
  </svg>`;
  const result = convertSvgToC({ source: svg, format: "argb32" });
  assert.equal(result.error, null);
  assert.equal(result.frameCount, 2);
  assert.equal(result.sourceFrameCount, 2);
  assert.equal(result.animated, true);
  assert.ok(result.previewSvg);
  assert.match(result.previewSvg, /id="frame-0"/);
  assert.match(result.previewSvg, /id="frame-1"/);
  assert.match(result.previewSvg, /<animate\b/);
  assert.match(result.previewSvg, /fill="#FF0000"/i);
  assert.match(result.previewSvg, /fill="#00FF00"/i);
});

test("countSvgFrames counts frame groups", async () => {
  const { countSvgFrames } = await import("../app/converter/svg-to-pixels.js");
  assert.equal(countSvgFrames(`<svg viewBox="0 0 1 1"><rect/></svg>`), 1);
  assert.equal(
    countSvgFrames(`<svg viewBox="0 0 1 1">
      <g id="frame-0"></g><g id="frame-1"></g><g id="frame-2"></g>
    </svg>`),
    3
  );
});

test("svg to c can export a single selected frame", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 1 1">
    <g id="frame-0" opacity="1"><rect x="0" y="0" width="1" height="1" fill="#FF0000"/></g>
    <g id="frame-1" opacity="0"><rect x="0" y="0" width="1" height="1" fill="#00FF00"/></g>
  </svg>`;
  const result = convertSvgToC({
    source: svg,
    format: "argb32",
    animateFrames: false,
    frameIndex: 1,
  });
  assert.equal(result.error, null);
  assert.equal(result.sourceFrameCount, 2);
  assert.equal(result.frameCount, 1);
  assert.equal(result.frameIndex, 1);
  assert.equal(result.animated, false);
  assert.match(result.source, /FRAME_COUNT 1/);
  assert.match(result.source, /0xff00ff00/i);
  assert.doesNotMatch(result.source, /0xff0000ff/i);
  assert.doesNotMatch(result.previewSvg, /<animate\b/);
});

test("svg to c preview respects frameDurationMs", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 1 1">
    <g id="frame-0"><rect x="0" y="0" width="1" height="1" fill="#FF0000"/></g>
    <g id="frame-1"><rect x="0" y="0" width="1" height="1" fill="#00FF00"/></g>
  </svg>`;
  const result = convertSvgToC({
    source: svg,
    format: "argb32",
    animateFrames: true,
    frameDurationMs: 50,
  });
  assert.equal(result.error, null);
  assert.match(result.previewSvg, /dur="0\.1s"/);
});

test("svg to c override fill replaces visible pixels", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 1 1"><rect width="1" height="1" fill="#FF0000"/></svg>`;
  const result = convertSvgToC({
    source: svg,
    format: "argb32",
    overrideFill: true,
    fillColor: "#112233",
  });
  assert.equal(result.error, null);
  assert.match(result.source, /0xff332211/i);
  assert.doesNotMatch(result.source, /0xffff0000/i);
});

test("formatPreservesAlpha distinguishes opaque formats", async () => {
  const { formatPreservesAlpha } = await import("../app/converter/formats.js");
  assert.equal(formatPreservesAlpha("argb32"), true);
  assert.equal(formatPreservesAlpha("xrgb8888"), false);
  assert.equal(formatPreservesAlpha("rgb565"), false);
  assert.equal(formatPreservesAlpha("1bit"), true);
  assert.equal(formatPreservesAlpha("i1"), true);
});

test("xrgb8888 flattens transparency onto background and warns", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 2 1">
    <g id="frame-0" opacity="1"><rect x="0" y="0" width="1" height="1" fill="#000000"/></g>
    <g id="frame-1" opacity="0"><rect x="1" y="0" width="1" height="1" fill="#000000"/></g>
  </svg>`;

  const blackMatte = convertSvgToC({
    source: svg,
    format: "xrgb8888",
    animateFrames: true,
    backgroundColor: "#000000",
  });
  assert.equal(blackMatte.error, null);
  assert.equal(blackMatte.hadTransparency, true);
  assert.equal(blackMatte.flattenedTransparency, true);
  assert.equal(blackMatte.frameCount, 2);
  assert.match(blackMatte.warnings.join(" "), /no alpha/i);
  assert.match(blackMatte.warnings.join(" "), /only 1 of 2 frames unique/i);
  assert.match(blackMatte.source, /0xff000000/);

  const whiteMatte = convertSvgToC({
    source: svg,
    format: "xrgb8888",
    animateFrames: true,
    backgroundColor: "#FFFFFF",
  });
  assert.equal(whiteMatte.error, null);
  assert.equal(whiteMatte.flattenedTransparency, true);
  assert.match(whiteMatte.source, /0xffffffff/i);
  assert.match(whiteMatte.source, /0xff000000/);
  assert.doesNotMatch(
    whiteMatte.warnings.join(" "),
    /frames unique after flatten/i
  );
  // Frame 0: black, white — frame 1: white, black
  assert.match(
    whiteMatte.source,
    /0xff000000,\s*0xffffffff[\s\S]*0xffffffff,\s*0xff000000/i
  );
});

test("argb32 keeps transparency without flattening", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 2 1"><rect x="0" y="0" width="1" height="1" fill="#FF0000"/></svg>`;
  const result = convertSvgToC({
    source: svg,
    format: "argb32",
    backgroundColor: "#FFFFFF",
  });
  assert.equal(result.error, null);
  assert.equal(result.hadTransparency, true);
  assert.equal(result.flattenedTransparency, false);
  assert.doesNotMatch(result.warnings.join(" "), /no alpha/i);
  assert.match(result.source, /0xff0000ff/i);
  assert.match(result.source, /0x00000000/i);
});

test("resizePixels nearest-neighbour doubles a row", async () => {
  const { resizePixels } = await import("../app/converter/resize-pixels.js");
  const red = { r: 255, g: 0, b: 0, a: 255 };
  const white = { r: 255, g: 255, b: 255, a: 255 };
  const out = resizePixels([red, white], 2, 1, 4, 1);
  assert.deepEqual(out, [red, red, white, white]);
});

test("elementTypeForFormat and formatLabelWithType", async () => {
  const {
    elementTypeForFormat,
    formatLabelWithType,
  } = await import("../app/converter/formats.js");
  assert.equal(elementTypeForFormat("argb32"), "uint32_t");
  assert.equal(elementTypeForFormat("rgb565"), "uint16_t");
  assert.equal(elementTypeForFormat("i1"), "uint8_t");
  assert.equal(formatLabelWithType("rgb565"), "RGB565 (TFT) · uint16_t");
  assert.equal(formatLabelWithType("1bit"), "1-bit (B/W) · uint8_t");
  assert.equal(formatLabelWithType("auto"), "Auto");
});

test("convertCToC converts uint32 ARGB32 to uint16 RGB565", async () => {
  const { convertCToC } = await import("../app/converter/convert-c-to-c.js");
  const source = `
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint32_t data[1][1] = { { 0xff0000ff } };
`;
  const result = convertCToC({
    source,
    inputFormat: "argb32",
    outputFormat: "rgb565",
    arrayName: "pix",
  });
  assert.equal(result.error, null);
  assert.equal(result.elementType, "uint16_t");
  assert.match(result.source, /static const uint16_t pix_data/);
  assert.match(result.source, /0xf800/i);
});

test("convertCToC override fill replaces visible pixels", async () => {
  const { convertCToC } = await import("../app/converter/convert-c-to-c.js");
  const source = `
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint32_t data[1][1] = { { 0xffff0000 } };
`;
  const result = convertCToC({
    source,
    inputFormat: "argb32",
    outputFormat: "argb32",
    overrideFill: true,
    fillColor: "#112233",
  });
  assert.equal(result.error, null);
  assert.match(result.source, /0xff332211/i);
  assert.doesNotMatch(result.source, /0xffff0000/i);
});

test("convertCToC can export a single selected frame", async () => {
  const { convertCToC } = await import("../app/converter/convert-c-to-c.js");
  const source = `
#define FRAME_COUNT 2
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint32_t data[2][1] = { { 0xff0000ff }, { 0xff00ff00 } };
`;
  const result = convertCToC({
    source,
    inputFormat: "argb32",
    outputFormat: "argb32",
    animateFrames: false,
    frameIndex: 1,
    arrayName: "pix",
  });
  assert.equal(result.error, null);
  assert.equal(result.sourceFrameCount, 2);
  assert.equal(result.frameCount, 1);
  assert.equal(result.animated, false);
  assert.match(result.source, /FRAME_COUNT 1/);
  assert.match(result.source, /0xff00ff00/i);
  assert.doesNotMatch(result.source, /0xff0000ff/i);
});

test("convertCToC keeps all frames when animateFrames is on", async () => {
  const { convertCToC } = await import("../app/converter/convert-c-to-c.js");
  const source = `
#define FRAME_COUNT 2
#define FRAME_WIDTH 1
#define FRAME_HEIGHT 1
static const uint32_t data[2][1] = { { 0xff0000ff }, { 0xff00ff00 } };
`;
  const result = convertCToC({
    source,
    inputFormat: "argb32",
    outputFormat: "argb32",
    animateFrames: true,
    frameDurationMs: 50,
    arrayName: "pix",
  });
  assert.equal(result.error, null);
  assert.equal(result.frameCount, 2);
  assert.equal(result.animated, true);
  assert.match(result.source, /FRAME_COUNT 2/);
  assert.match(result.previewSvg, /dur="0\.1s"/);
});

test("convertCToC packs ARGB32 to indexed I1", async () => {
  const { convertCToC } = await import("../app/converter/convert-c-to-c.js");
  const source = `
#define FRAME_WIDTH 8
#define FRAME_HEIGHT 1
static const uint32_t data[1][8] = {
  { 0xff0000ff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff }
};
`;
  const result = convertCToC({
    source,
    inputFormat: "argb32",
    outputFormat: "i1",
    arrayName: "x",
  });
  assert.equal(result.error, null);
  assert.equal(result.width, 8);
  assert.equal(result.height, 1);
  assert.equal(result.outputFormat, "i1");
  assert.equal(result.elementType, "uint8_t");
  assert.match(result.source, /X_COLOR_COUNT 2/);
  assert.match(result.source, /static const uint8_t x_data/);
  assert.match(result.source, /0x7f/i);
});

test("convertCToC scales output with nearest-neighbour", async () => {
  const { convertCToC } = await import("../app/converter/convert-c-to-c.js");
  const source = `
#define FRAME_WIDTH 2
#define FRAME_HEIGHT 1
static const uint32_t data[1][2] = { { 0xff0000ff, 0xffffffff } };
`;
  const result = convertCToC({
    source,
    inputFormat: "argb32",
    outputFormat: "argb32",
    scale: 2,
    arrayName: "scaled",
  });
  assert.equal(result.error, null);
  assert.equal(result.sourceWidth, 2);
  assert.equal(result.sourceHeight, 1);
  assert.equal(result.width, 4);
  assert.equal(result.height, 2);
  assert.equal(result.scale, 2);
  assert.match(result.source, /SCALED_FRAME_WIDTH 4/);
  assert.match(result.source, /SCALED_FRAME_HEIGHT 2/);
  const reds = result.source.match(/0xff0000ff/gi) ?? [];
  const whites = result.source.match(/0xffffffff/gi) ?? [];
  assert.equal(reds.length, 4);
  assert.equal(whites.length, 4);
});

test("convertSvgToC applies output scale", async () => {
  const { convertSvgToC } = await import("../app/converter/convert-svg-to-c.js");
  const svg = `<svg viewBox="0 0 2 1"><rect x="0" y="0" width="1" height="1" fill="#FF0000"/><rect x="1" y="0" width="1" height="1" fill="#FFFFFF"/></svg>`;
  const result = convertSvgToC({
    source: svg,
    format: "argb32",
    scale: 2,
    arrayName: "up",
  });
  assert.equal(result.error, null);
  assert.equal(result.sourceWidth, 2);
  assert.equal(result.width, 4);
  assert.equal(result.height, 2);
  assert.match(result.source, /UP_FRAME_WIDTH 4/);
  assert.match(result.source, /UP_FRAME_HEIGHT 2/);
});
