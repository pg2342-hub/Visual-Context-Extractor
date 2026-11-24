export interface FindingImageRegion {
  imageRef: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SIDE = 0.01;
const MAX_REGIONS = 4;

function fraction(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

/**
 * Validate the model's "regions" for one finding. A region must point at an image the
 * finding cites, and its box must be [x, y, width, height] in fractions of the image.
 * Anything malformed is dropped rather than guessed at; a finding with no valid region
 * simply has none.
 */
export function parseFindingRegions(value: unknown, citedImageRefs: ReadonlySet<string>): FindingImageRegion[] {
  if (!Array.isArray(value)) return [];
  const regions: FindingImageRegion[] = [];
  for (const item of value) {
    if (regions.length >= MAX_REGIONS) break;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const imageRef = raw.source_id ?? raw.imageRef;
    if (typeof imageRef !== "string" || !citedImageRefs.has(imageRef)) continue;
    const box = Array.isArray(raw.box) ? raw.box : [raw.x, raw.y, raw.width, raw.height];
    if (box.length !== 4) continue;
    const [x, y, w, h] = box.map(fraction);
    if (x === null || y === null || w === null || h === null) continue;
    const width = Math.min(w, 1 - x);
    const height = Math.min(h, 1 - y);
    if (width < MIN_SIDE || height < MIN_SIDE) continue;
    regions.push({ imageRef, x, y, width, height });
  }
  return regions;
}
