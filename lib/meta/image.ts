// Reads a JPEG's true pixel size from its header. SAM rejects box prompts whose
// declared w/h don't match the image's aspect ratio, so we never compute the size.
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function jpegSize(bytes: Uint8Array): { w: number; h: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("not a JPEG (missing SOI marker)");
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) throw new Error("not a JPEG (bad segment marker)");
    const marker = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (SOF_MARKERS.has(marker)) {
      return { h: (bytes[i + 5] << 8) | bytes[i + 6], w: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + len;
  }
  throw new Error("not a JPEG (no frame header found)");
}

export function toDataUrl(bytes: Uint8Array): string {
  return `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
}
