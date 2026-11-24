export interface PixelSize {
  width: number;
  height: number;
}

/** Read width and height from the header of a base64 PNG, JPEG, GIF or WebP, without decoding it. */
export function readImageSize(base64: string): PixelSize | null {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64.slice(0, 120_000), "base64");
  } catch {
    return null;
  }
  const ok = (width: number, height: number) =>
    width > 0 && height > 0 && width < 100_000 && height < 100_000 ? { width, height } : null;

  // PNG: IHDR width/height at bytes 16-23
  if (bytes.length >= 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return ok(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
  }
  // GIF: logical screen size, little endian
  if (bytes.length >= 10 && bytes.toString("ascii", 0, 3) === "GIF") {
    return ok(bytes.readUInt16LE(6), bytes.readUInt16LE(8));
  }
  // WebP: RIFF....WEBP then VP8 / VP8L / VP8X chunk
  if (bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const chunk = bytes.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return ok(bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff);
    if (chunk === "VP8L") {
      const b = bytes.readUInt32LE(21);
      return ok((b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1);
    }
    if (chunk === "VP8X") return ok(bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1);
    return null;
  }
  // JPEG: walk segments to the first start-of-frame marker
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1]!;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const length = bytes.readUInt16BE(i + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return ok(bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5));
      i += 2 + length;
    }
  }
  return null;
}

export type ResolutionTier = "standard" | "high";

const TIER_LIMITS: Record<ResolutionTier, { maxEdge: number; maxTokens: number }> = {
  standard: { maxEdge: 1568, maxTokens: 1568 },
  high: { maxEdge: 2576, maxTokens: 4784 },
};

function roundTiesToEven(value: number): number {
  const floor = Math.floor(value);
  if (value - floor !== 0.5) return Math.round(value);
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * The size the model processes an image at, which is the frame its pixel coordinates are in.
 * Follows Anthropic's published reference implementation: the largest aspect-preserving size
 * whose 28 px patch grid fits both the tier's edge limit and its visual-token budget.
 * https://platform.claude.com/docs/en/build-with-claude/vision-coordinates
 */
export function modelViewSize({ width, height }: PixelSize, tier: ResolutionTier = "standard"): PixelSize {
  const { maxEdge, maxTokens } = TIER_LIMITS[tier];
  const fits = (w: number, h: number) =>
    Math.ceil(w / 28) * 28 <= maxEdge &&
    Math.ceil(h / 28) * 28 <= maxEdge &&
    Math.ceil(w / 28) * Math.ceil(h / 28) <= maxTokens;

  if (fits(width, height)) return { width, height };
  if (height > width) {
    const rotated = modelViewSize({ width: height, height: width }, tier);
    return { width: rotated.height, height: rotated.width };
  }
  const aspect = width / height;
  let lo = 1;
  let hi = width;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid, Math.max(roundTiesToEven(mid / aspect), 1))) lo = mid;
    else hi = mid;
  }
  return { width: lo, height: Math.max(roundTiesToEven(lo / aspect), 1) };
}
