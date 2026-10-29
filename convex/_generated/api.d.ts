/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as auth from "../auth.js";
import type * as clippings from "../clippings.js";
import type * as editorRuns from "../editorRuns.js";
import type * as explore from "../explore.js";
import type * as frontPages from "../frontPages.js";
import type * as gameDays from "../gameDays.js";
import type * as meanwhile from "../meanwhile.js";
import type * as packs from "../packs.js";
import type * as pages from "../pages.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  auth: typeof auth;
  clippings: typeof clippings;
  editorRuns: typeof editorRuns;
  explore: typeof explore;
  frontPages: typeof frontPages;
  gameDays: typeof gameDays;
  meanwhile: typeof meanwhile;
  packs: typeof packs;
  pages: typeof pages;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
