import { describe, expect, test } from "vitest";
import { pathsFromImageUrls } from "../../lib/loc/paths";

const imageUrls = [
  "https://tile.loc.gov/image-services/iiif/service:ndnp:lu:batch_lu_iceman_ver01:data:sn88064119:00280761837:1889112901:0223/full/pct:3.125/0/default.jpg#h=292&w=186",
  "https://tile.loc.gov/text-services/word-coordinates-service?segment=/service/ndnp/lu/batch_lu_iceman_ver01/data/sn88064119/00280761837/1889112901/0223.xml&format=alto_xml",
];

describe("pathsFromImageUrls", () => {
  test("derives ALTO storage URL and IIIF base", () => {
    expect(pathsFromImageUrls(imageUrls)).toEqual({
      altoUrl:
        "https://tile.loc.gov/storage-services/service/ndnp/lu/batch_lu_iceman_ver01/data/sn88064119/00280761837/1889112901/0223.xml",
      iiifBase:
        "https://tile.loc.gov/image-services/iiif/service:ndnp:lu:batch_lu_iceman_ver01:data:sn88064119:00280761837:1889112901:0223",
    });
  });

  test("throws without a word-coordinates URL", () => {
    expect(() => pathsFromImageUrls([imageUrls[0]])).toThrow(/word-coordinates/);
  });
});
