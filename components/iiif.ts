// Scans load straight from the Library's IIIF server. Crops are never enlarged.
export type Box = { x: number; y: number; w: number; h: number };

export function iiifCropUrl(iiifBase: string, box: Box, width: number): string {
  const [x, y, w, h] = [box.x, box.y, box.w, box.h].map(Math.round);
  return `${iiifBase}/${x},${y},${w},${h}/${Math.min(w, width)},/0/default.jpg`;
}

export const pageUrl = (pageId: string) => pageId.replace(/^http:/, "https:");
