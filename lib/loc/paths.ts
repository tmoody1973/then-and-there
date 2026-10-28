// Derives a page's ALTO file URL and IIIF image base from the image_url list
// that every loc.gov page search result carries.
const WORD_COORDS = "word-coordinates-service";

export function pathsFromImageUrls(imageUrls: string[]): { altoUrl: string; iiifBase: string } {
  const wc = imageUrls.find((u) => u.includes(WORD_COORDS));
  if (!wc) throw new Error(`no ${WORD_COORDS} URL in image_url list`);
  const segment = new URL(wc).searchParams.get("segment");
  if (!segment) throw new Error(`${WORD_COORDS} URL has no segment parameter`);
  const path = segment.replace(/^\//, "").replace(/\.xml$/, "");
  return {
    altoUrl: `https://tile.loc.gov/storage-services/${path}.xml`,
    iiifBase: `https://tile.loc.gov/image-services/iiif/${path.replace(/\//g, ":")}`,
  };
}
