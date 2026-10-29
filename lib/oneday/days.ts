// The days One Day, Many Papers offers. Each names its story and how to spot it on a page;
// "dates" covers evening papers that day and morning papers the next.
export type OneDay = { slug: string; event: string; dek: string; dates: [string, string]; topic: RegExp; prefer: string[] };

export const DAYS: OneDay[] = [
  {
    slug: "1920-08-26",
    event: "the 19th Amendment is certified",
    dek: "The 19th Amendment is certified. Same news, three newsrooms. How did each one tell it?",
    dates: ["1920-08-26", "1920-08-27"],
    // Suffrage words only: "ratify", "amendment" and Secretary Colby (who also signed the Poland note) catch other news.
    topic: /suffrag|woman'?s? vote|women voters|nineteenth amendment|19th amendment|anthony amendment|amendment ratification|equal franchise/i,
    prefer: ["evening star", "new-york tribune", "bisbee daily review"],
  },
  {
    slug: "1906-04-18",
    event: "an earthquake and fire wreck San Francisco",
    dek: "An earthquake and fire wreck San Francisco. Same news, three newsrooms. How did each one tell it?",
    dates: ["1906-04-18", "1906-04-19"],
    topic: /earthquake|quake|temblor|san francisco/i,
    prefer: [],
  },
  {
    slug: "1918-11-11",
    event: "the Armistice ends the fighting in Europe",
    dek: "The Armistice ends the fighting in Europe. Same news, three newsrooms. How did each one tell it?",
    dates: ["1918-11-11", "1918-11-12"],
    topic: /armistice|hostilities|kaiser|war is (over|ended)|peace terms|foch/i,
    prefer: [],
  },
];

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...o });
export const dayLabel = (slug: string) => fmt(slug, { month: "long", day: "numeric", year: "numeric" });
export const weekday = (slug: string) => fmt(slug, { weekday: "long" });
