import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { type Infer, v } from "convex/values";
import { requireSecret } from "./auth";
import { editorRunFields } from "./schema";

const runValidator = v.object(editorRunFields);
export type EditorRun = Infer<typeof runValidator>;

export const log = mutation({
  args: { secret: v.string(), run: runValidator },
  handler: (ctx, { secret, run }) => {
    requireSecret(secret);
    return ctx.db.insert("editorRuns", run);
  },
});

// ponytail: full scan; fine for a hackathon-sized log, add a counter doc if it grows past ~10k rows.
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("editorRuns").collect();
    const passed = runs.filter((r) => r.pass).length;
    return { total: runs.length, passed, failed: runs.length - passed };
  },
});
