import type { PixelSize } from "./imageSize";

export interface FindingImageRegion {
  imageRef: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SIDE = 0.01;
const MAX_REGIONS = 4;

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Validate the model's "regions" for one finding and convert them to fractions of the image.
 * A region must point at an image the finding cites. Its box is [left, top, width, height]
 * in pixels of the image as the model saw it (sizes come from `imageSizes`). When an image's
 * size is unknown, only boxes already given as fractions (every value 0 to 1) are kept.
 * Anything malformed is dropped rather than guessed at.
 */
export function parseFindingRegions(
  value: unknown,
  citedImageRefs: ReadonlySet<string>,
  imageSizes: ReadonlyMap<string, PixelSize | null> = new Map(),
): FindingImageRegion[] {
  if (!Array.isArray(value)) return [];
  const regions: FindingImageRegion[] = [];
  for (const item of value) {
    if (regions.length >= MAX_REGIONS) break;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const imageRef = raw.source_id ?? raw.imageRef;
    if (typeof imageRef !== "string" || !citedImageRefs.has(imageRef)) continue;
    // Preferred: corner points [x1, y1, x2, y2] in pixels. Also accepted: [x, y, width, height].
    const corners = Array.isArray(raw.box_2d) ? raw.box_2d : Array.isArray(raw.bbox) ? raw.bbox : null;
    const box = corners ?? (Array.isArray(raw.box) ? raw.box : [raw.x, raw.y, raw.width, raw.height]);
    if (box.length !== 4) continue;
    const nums = box.map(finite);
    if (nums.some((n) => n === null)) continue;
    let [x, y, w, h] = nums as number[];
    if (corners) {
      const [x1, y1, x2, y2] = [x, y, w, h];
      x = Math.min(x1, x2);
      y = Math.min(y1, y2);
      w = Math.abs(x2 - x1);
      h = Math.abs(y2 - y1);
    }

    const size = imageSizes.get(imageRef) ?? null;
    const looksFractional = [x, y, w, h].every((n) => n >= 0 && n <= 1);
    if (size && !looksFractional) {
      x /= size.width;
      w /= size.width;
      y /= size.height;
      h /= size.height;
    } else if (!looksFractional) {
      continue;
    }

    const left = Math.min(1, Math.max(0, x));
    const top = Math.min(1, Math.max(0, y));
    const width = Math.min(Math.max(0, w), 1 - left);
    const height = Math.min(Math.max(0, h), 1 - top);
    if (width < MIN_SIDE || height < MIN_SIDE) continue;
    regions.push({ imageRef, x: left, y: top, width, height });
  }
  return regions;
}
