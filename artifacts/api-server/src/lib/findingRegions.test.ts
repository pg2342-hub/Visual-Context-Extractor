import assert from "node:assert/strict";
import test from "node:test";
import { parseFindingRegions } from "./findingRegions";

const cited = new Set(["IMG-1", "IMG-2"]);

test("keeps a well-formed box on a cited image", () => {
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-1", box: [0.1, 0.2, 0.3, 0.25] }], cited), [
    { imageRef: "IMG-1", x: 0.1, y: 0.2, width: 0.3, height: 0.25 },
  ]);
});

test("drops boxes on images the finding does not cite, and non-image sources", () => {
  assert.deepEqual(parseFindingRegions([
    { source_id: "IMG-3", box: [0.1, 0.1, 0.2, 0.2] },
    { source_id: "DOC-1", box: [0.1, 0.1, 0.2, 0.2] },
    { source_id: "PROJECT_KNOWLEDGE", box: [0.1, 0.1, 0.2, 0.2] },
  ], cited), []);
});

test("clamps boxes into the image and drops ones that collapse", () => {
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-2", box: [0.9, -0.2, 0.5, 0.4] }], cited), [
    { imageRef: "IMG-2", x: 0.9, y: 0, width: 0.09999999999999998, height: 0.4 },
  ]);
  assert.deepEqual(parseFindingRegions([{ source_id: "IMG-1", box: [1, 1, 0.2, 0.2] }], cited), []);
});

test("ignores malformed input instead of guessing", () => {
  assert.deepEqual(parseFindingRegions("IMG-1", cited), []);
  assert.deepEqual(parseFindingRegions([
    null, [], { source_id: "IMG-1" }, { source_id: "IMG-1", box: [0.1, 0.1, "wide", 0.2] },
    { source_id: "IMG-1", box: [0.1, 0.1, 0.2] }, { source_id: "IMG-1", box: [NaN, 0.1, 0.2, 0.2] },
  ], cited), []);
});

test("keeps at most four regions per finding", () => {
  const many = Array.from({ length: 6 }, () => ({ source_id: "IMG-1", box: [0.1, 0.1, 0.2, 0.2] }));
  assert.equal(parseFindingRegions(many, cited).length, 4);
});
