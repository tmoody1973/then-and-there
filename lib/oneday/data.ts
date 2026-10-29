// The built days (scripts/oneday/build.ts), bundled with the app: nothing here is secret.
import type { DayData } from "../../components/oneday/OneDayView";
import d1906 from "../../data/oneday/1906-04-18.json";
import d1918 from "../../data/oneday/1918-11-11.json";
import d1920 from "../../data/oneday/1920-08-26.json";

export const DAY_DATA: Record<string, DayData> = {
  "1920-08-26": d1920 as DayData,
  "1906-04-18": d1906 as DayData,
  "1918-11-11": d1918 as DayData,
};
export const FIRST_DAY = "1920-08-26";
