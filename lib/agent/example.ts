// The one sample find shown while a reader has none of their own (Tarik, 2026-11-01): every judge
// arrives with an empty agent. It is a real clipping the Editor passed, always labelled an example.
import caseFile from "../../data/detective/case01.json";
import type { Note } from "./useAgent";

const clue = (caseFile as { stops: Array<{ clue: Note["clip"] & { clippingId: string } }> }).stops[0].clue;

export const EXAMPLE_NOTE: Note = { clippingId: clue.clippingId, clip: clue, matched: "Bly", replay: false, createdAt: 0 };
