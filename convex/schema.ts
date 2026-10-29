import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const box = v.object({ x: v.number(), y: v.number(), w: v.number(), h: v.number() });

export const pageFields = {
  pageId: v.string(),
  lccn: v.string(),
  title: v.string(),
  city: v.string(),
  state: v.string(),
  date: v.string(),
  sequence: v.number(),
  language: v.array(v.string()),
  iiifBase: v.string(),
  altoUrl: v.string(),
  imageWidth: v.number(),
  imageHeight: v.number(),
  altoScale: v.number(),
  citeThis: v.object({ apa: v.string(), chicago: v.string(), mla: v.string() }),
  status: v.union(v.literal("fetched"), v.literal("processed"), v.literal("failed")),
  error: v.optional(v.string()),
};

export const clippingFields = {
  pageId: v.string(),
  box,
  segLabel: v.string(),
  segSource: v.union(v.literal("sam"), v.literal("spark"), v.literal("alto")),
  rawText: v.string(),
  meanWc: v.number(),
  nonDictRate: v.number(),
  cleanedText: v.optional(v.string()),
  translation: v.optional(v.string()),
  language: v.optional(v.string()),
  type: v.optional(
    v.union(
      v.literal("person"),
      v.literal("event"),
      v.literal("business"),
      v.literal("ad"),
      v.literal("notice"),
      v.literal("other"),
    ),
  ),
  people: v.optional(v.array(v.string())),
  places: v.optional(v.array(v.string())),
  humanStoryScore: v.optional(v.number()),
  hardHistory: v.optional(v.boolean()),
  hardHistoryReason: v.optional(v.string()),
  status: v.union(v.literal("raw"), v.literal("cleaned"), v.literal("classified"), v.literal("failed")),
  editorStatus: v.union(v.literal("unchecked"), v.literal("pass"), v.literal("fail")),
  promptVersion: v.string(),
};

export const editorRunFields = {
  subjectKind: v.union(
    v.literal("clipping"),
    v.literal("clue"),
    v.literal("hint"),
    v.literal("context"),
    v.literal("find"),
    v.literal("question"),
  ),
  subjectId: v.string(),
  claim: v.string(),
  pass: v.boolean(),
  reason: v.string(),
  model: v.string(),
  createdAt: v.number(),
};

export const clipRef = v.object({
  clippingId: v.string(),
  pageId: v.string(),
  iiifBase: v.string(),
  box,
  paper: v.string(),
  date: v.string(),
  citationMla: v.string(),
  excerpt: v.string(),
  focus: v.optional(box),
  translatedFrom: v.optional(v.string()),
});

export const question = v.union(
  v.object({ kind: v.literal("choice"), prompt: v.string(), options: v.array(v.string()), answerIndex: v.number() }),
  v.object({ kind: v.literal("days"), prompt: v.string(), answerDays: v.number(), tolerance: v.number() }),
);

export const gameDayFields = {
  day: v.number(),
  date1889: v.string(),
  title: v.string(),
  clue: clipRef,
  question,
  hints: v.array(v.string()),
  reveal: v.object({ ...clipRef.fields, explanation: v.string() }),
  finaleSeconds: v.optional(v.number()),
  morgue: v.optional(v.array(clipRef)),
  status: v.union(v.literal("draft"), v.literal("published"), v.literal("rejected")),
  rejectReasons: v.array(v.string()),
};

export const meanwhileFields = {
  date1889: v.string(),
  scope: v.string(),
  clip: clipRef,
  humanStoryScore: v.number(),
};

// A story as Explore shows it (search results and shelves share this shape).
export const exploreCardFields = {
  clippingId: v.string(),
  pageId: v.string(),
  iiifBase: v.string(),
  box,
  paper: v.string(),
  city: v.string(),
  state: v.string(),
  date: v.string(),
  sequence: v.number(),
  language: v.array(v.string()),
  type: v.optional(v.string()),
  people: v.array(v.string()),
  textKind: v.union(v.literal("repaired"), v.literal("archive")),
  text: v.string(),
  archiveText: v.optional(v.string()), // the archive's OCR, when the text shown is a repair
  editorStatus: v.string(),
  hardHistory: v.boolean(),
  citeThis: v.object({ apa: v.string(), chicago: v.string(), mla: v.string() }),
};

export const shelfFields = { slug: v.string(), title: v.string(), blurb: v.string(), order: v.number(), cards: v.array(v.object(exploreCardFields)) };

export const followFields = {
  owner: v.string(),
  kind: v.union(v.literal("name"), v.literal("place")),
  value: v.string(),
  createdAt: v.number(),
};

export const noteFields = {
  owner: v.string(),
  clippingId: v.string(),
  clip: clipRef,
  matched: v.string(),
  replay: v.boolean(),
  createdAt: v.number(),
  readAt: v.optional(v.number()),
};

// owner absent = a shared nightly line every reader sees.
export const activityFields = {
  owner: v.optional(v.string()),
  runId: v.string(),
  line: v.string(),
  replay: v.boolean(),
  createdAt: v.number(),
};

export default defineSchema({
  pages: defineTable(pageFields).index("by_pageId", ["pageId"]).index("by_state_date", ["state", "date"]),
  clippings: defineTable(clippingFields)
    .index("by_pageId", ["pageId"])
    .index("by_type_score", ["type", "humanStoryScore"])
    .searchIndex("search_text", { searchField: "cleanedText", filterFields: ["pageId", "type"] })
    .searchIndex("search_raw", { searchField: "rawText", filterFields: ["type"] }),
  editorRuns: defineTable(editorRunFields),
  gameDays: defineTable(gameDayFields).index("by_day", ["day"]),
  meanwhile: defineTable(meanwhileFields).index("by_date_scope", ["date1889", "scope"]),
  follows: defineTable(followFields).index("by_owner", ["owner"]),
  notes: defineTable(noteFields).index("by_owner", ["owner"]),
  activity: defineTable(activityFields).index("by_owner", ["owner"]),
  shelves: defineTable(shelfFields),
  agentState: defineTable({ key: v.string(), value: v.string() }).index("by_key", ["key"]),
});
