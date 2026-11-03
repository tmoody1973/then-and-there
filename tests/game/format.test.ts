import { describe, expect, test } from "vitest";
import { runDate, titleCase } from "../../lib/game/format";

describe("runDate", () => {
  test("is the calendar day the earliest clipping was written", () => {
    expect(runDate([{ _creationTime: Date.UTC(2026, 9, 29, 3) }, { _creationTime: Date.UTC(2026, 9, 28, 22) }])).toBe("2026-10-28");
  });
  test("is null when there are no clippings", () => {
    expect(runDate([])).toBeNull();
  });
});

describe("titleCase", () => {
  test("capitalizes words, including after a hyphen", () => {
    expect(titleCase("New-York tribune")).toBe("New-York Tribune");
    expect(titleCase("South Bend news-times")).toBe("South Bend News-Times");
  });
  test("leaves accented letters inside a word alone", () => {
    expect(titleCase("Indiana Tribüne")).toBe("Indiana Tribüne");
  });
});
