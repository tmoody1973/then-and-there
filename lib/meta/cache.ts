// Disk cache for model calls. Every result is keyed by model + prompt version +
// subject + input, so unchanged work is never paid for twice.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type CacheKey = { model: string; promptVersion: string; subjectId: string; input: unknown };

export async function cachedCall<T>(key: CacheKey, fn: () => Promise<T>, dir = "cache/model"): Promise<T> {
  const file = join(dir, `${createHash("sha256").update(JSON.stringify(key)).digest("hex")}.json`);
  if (existsSync(file)) return (JSON.parse(readFileSync(file, "utf8")) as { value: T }).value;
  const value = await fn();
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify({ key, value }));
  return value;
}
