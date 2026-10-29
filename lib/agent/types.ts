// Shared by the nightly agent and the database.
export type Follow = { id: string; owner: string; kind: "name" | "place"; value: string };

// The fields we use from the Library's batch list (chroniclingamerica.loc.gov/data/ocr/ocr.json).
export type BatchEntry = { batch: string; ingested: string; page_count: number; sha256: string; size: number; url: string };
