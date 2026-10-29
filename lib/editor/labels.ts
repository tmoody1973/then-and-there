// Explore's "Verified" badge: the Editor checks a clipping's machine label against the clipping.
import { EDITOR_LABEL_PROMPT } from "../pipeline/prompts";
import { verifyClaim } from "./verify";

const KIND: Record<string, string> = {
  person: "A person story",
  event: "An event story",
  business: "A business story",
  ad: "An advertisement",
  notice: "A notice",
  other: "A clipping",
};
const MAX_NAMED = 3;

export function labelClaim(c: { type: string; people: string[] }): string {
  const names = c.people.slice(0, MAX_NAMED);
  const kind = KIND[c.type] ?? KIND.other;
  if (!names.length) return kind;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${kind} naming ${list}`;
}

export const verifyLabel = (
  input: { clippingId: string; type: string; people: string[]; text: string; cropUrl: string },
  deps: Parameters<typeof verifyClaim>[1],
) =>
  verifyClaim(
    {
      subjectKind: "clipping",
      subjectId: input.clippingId,
      claim: labelClaim(input),
      sourceText: input.text,
      cropUrl: input.cropUrl,
      prompt: EDITOR_LABEL_PROMPT,
    },
    deps,
  );
