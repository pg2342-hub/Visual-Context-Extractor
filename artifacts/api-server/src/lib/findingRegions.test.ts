import assert from "node:assert/strict";
import test from "node:test";
import { parseFindingRegions } from "./findingRegions";
import { modelViewSize, readImageSize } from "./imageSize";

const cited = new Set(["IMG-1", "IMG-2"]);
const sizes = new Map([["IMG-1", { width: 1000, height: 500 }], ["IMG-2", null]]);

test("converts a pixel box to fractions of the image", () => {
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-1", box: [100, 50, 300, 100] }], cited, sizes), [
    { imageRef: "IMG-1", x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
  ]);
});

test("keeps a fractional box, including when the image size is unknown", () => {
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-2", box: [0.1, 0.2, 0.3, 0.25] }], cited, sizes), [
    { imageRef: "IMG-2", x: 0.1, y: 0.2, width: 0.3, height: 0.25 },
  ]);
});

test("drops a pixel box when the image size is unknown", () => {
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-2", box: [100, 50, 300, 100] }], cited, sizes), []);
});

test("drops boxes on images the finding does not cite, and non-image sources", () => {
  assert.deepEqual(parseFindingRegions([
    { source_id: "IMG-3", box: [0.1, 0.1, 0.2, 0.2] },
    { source_id: "DOC-1", box: [0.1, 0.1, 0.2, 0.2] },
    { source_id: "PROJECT_KNOWLEDGE", box: [0.1, 0.1, 0.2, 0.2] },
  ], cited, sizes), []);
});

test("clamps pixel boxes into the image and drops ones that collapse", () => {
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-1", box: [900, -40, 400, 200] }], cited, sizes), [
    { imageRef: "IMG-1", x: 0.9, y: 0, width: 0.09999999999999998, height: 0.4 },
  ]);
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-1", box: [1000, 500, 40, 40] }], cited, sizes), []);
});

test("ignores malformed input instead of guessing", () => {
  assert.deepEqual(parseFindingRegions("IMG-1", cited, sizes), []);
  assert.deepEqual(parseFindingRegions([
    null, [], { source_id: "IMG-1" }, { source_id: "IMG-1", box: [10, 10, "wide", 20] },
    { source_id: "IMG-1", box: [10, 10, 20] }, { source_id: "IMG-1", box: [NaN, 10, 20, 20] },
  ], cited, sizes), []);
});

test("keeps at most four regions per finding", () => {
  const many = Array.from({ length: 6 }, () => ({ source_id: "IMG-1", box: [100, 100, 200, 200] }));
  assert.equal(parseFindingRegions(many, cited, sizes).length, 4);
});

test("reads PNG, GIF and JPEG sizes from their headers", () => {
  const png = Buffer.alloc(33);
  png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(1200, 16); png.writeUInt32BE(760, 20);
  assert.deepEqual(readImageSize(png.toString("base64")), { width: 1200, height: 760 });

  const gif = Buffer.from("GIF89a\x40\x01\xf0\x00\x00\x00", "latin1");
  assert.deepEqual(readImageSize(gif.toString("base64")), { width: 320, height: 240 });

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20, 0x03, 0, 0, 0, 0]);
  assert.deepEqual(readImageSize(jpeg.toString("base64")), { width: 800, height: 600 });

  assert.equal(readImageSize(Buffer.from("not an image").toString("base64")), null);
});

test("matches Anthropic's published resize examples for both resolution tiers", () => {
  assert.deepEqual(modelViewSize({ width: 1075, height: 1520 }), { width: 924, height: 1307 });
  assert.deepEqual(modelViewSize({ width: 1920, height: 1080 }), { width: 1456, height: 819 });
  assert.deepEqual(modelViewSize({ width: 1920, height: 1080 }, "high"), { width: 1920, height: 1080 });
  assert.deepEqual(modelViewSize({ width: 3840, height: 2160 }, "high"), { width: 2576, height: 1449 });
  assert.deepEqual(modelViewSize({ width: 1200, height: 760 }), { width: 1200, height: 760 });
});

test("reads corner-point boxes [x1, y1, x2, y2] in pixels", () => {
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-1", box_2d: [100, 50, 400, 150] }], cited, sizes), [
    { imageRef: "IMG-1", x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
  ]);
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-1", box_2d: [400, 150, 100, 50] }], cited, sizes), [
    { imageRef: "IMG-1", x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
  ]);
});
