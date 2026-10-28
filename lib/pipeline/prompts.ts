// Prompt text lives here so its version travels into every cache key.
// Bump PROMPT_VERSION whenever any prompt below changes.
export const PROMPT_VERSION = "2026-10-28.1";

// Grounding format documented by Meta for Muse Spark; coordinates are 0-1000.
export const LAYOUT_PROMPT =
  'You are an object grounding expert. This is a scanned historic newspaper page. Provide the bounding box coordinates of every "article", "advertisement", "headline", and "photograph" (photographs or illustrations) on the page. Ensure the objects accurately match the request and do not miss any objects. For each object, answer in the format {"object_name": "<name>", "bbox": [{"x_min": <int>, "y_min": <int>, "x_max": <int>, "y_max": <int>}]}. The coordinates should be in the 0-1000 range. Return a JSON array of results. If you cannot find an object, omit it from the results.';
