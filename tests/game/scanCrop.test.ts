import { describe, expect, test } from "vitest";
import { iiifCropUrl } from "../../components/iiif";

describe("iiifCropUrl", () => {
  test("never enlarges a small clipping", () => {
    expect(iiifCropUrl("https://iiif/x", { x: 1, y: 2, w: 551, h: 277 }, 1600)).toBe("https://iiif/x/1,2,551,277/551,/0/default.jpg");
  });
  test("caps wide clippings at the requested width", () => {
    expect(iiifCropUrl("https://iiif/x", { x: 0, y: 0, w: 3000, h: 400 }, 1600)).toBe("https://iiif/x/0,0,3000,400/1600,/0/default.jpg");
  });
  test("rounds fractional boxes", () => {
    expect(iiifCropUrl("https://iiif/x", { x: 1.4, y: 2.6, w: 10.5, h: 3 }, 1600)).toBe("https://iiif/x/1,3,11,3/11,/0/default.jpg");
  });
});
