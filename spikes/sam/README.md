# Segmentation spike: API shapes and test pages

Throwaway. Decides how Task 7 (`lib/segment/segmentPage.ts`) cuts pages into clippings.
Sources read 2026-10-28: https://dev.meta.ai/docs/sam/overview, https://dev.meta.ai/docs/sam/segmenting, https://dev.meta.ai/docs/image-understanding

## SAM 3.1

- Endpoint: `POST https://api.meta.ai/v1/responses` (OpenAI SDK: `client.responses.create`), Bearer key.
- Request:
  ```json
  {
    "model": "sam-3.1",
    "input": [{ "type": "message", "role": "user", "content": [
      { "type": "input_text", "text": "advertisement" },
      { "type": "input_image", "image_url": "<public URL or data:image/jpeg;base64,...>" }
    ]}],
    "metadata": { "include_confidence": "true" }
  }
  ```
  One noun phrase per request. `stream` is optional for images (non-streaming returns the full result).
- Response: the output text is a tagged string, not JSON. One entry per match, comma-separated:
  `<0f>0<|box;x1=444;y1=625;x2=679;y2=850;w=1800;h=1200;c=0.96|><|mask;x=0;y=0;c=0.96;data=...|>,1<|box;...|>`
  - `x1,y1,x2,y2` are in pixels of the image as sent; `w,h` give that image's size; `c` is confidence (only with `include_confidence`).
  - Masks are run-length encoded; we only need boxes.
- Max image size: **not stated in the docs.** The spike sends IIIF `/full/2000,/0/default.jpg` (2000 px wide).
- Images by URL: IIIF links from tile.loc.gov are public, so they can be passed directly (verify in the run).

## Muse Spark (image understanding, for grounding boxes)

- Chat Completions or Responses; image as `image_url` (URL or base64 data URL); up to 50 images per request.
- Grounding format documented by Meta. **Coordinates are normalized 0–1000**, not pixels:
  `{"object_name": "<name>", "bbox": [{"x_min": <int>, "y_min": <int>, "x_max": <int>, "y_max": <int>}]}`. Return a JSON array; omit objects not found.
- Convert: `px = norm / 1000 * imageWidthOrHeight`.

## The 5 test pages (IIIF bases)

| # | Page | IIIF base |
|---|---|---|
| 1 | The Evening World, 1889-11-29 p1 (contest front page) | `https://tile.loc.gov/image-services/iiif/service:ndnp:nn:batch_nn_hanyu_ver01:data:sn83030193:00206539525:1889112902:0708` |
| 2 | Homer Guardian (La.), 1889-11-29 p1 | `https://tile.loc.gov/image-services/iiif/service:ndnp:lu:batch_lu_iceman_ver01:data:sn88064119:00280761837:1889112901:0223` |
| 3 | Wisconsin Weekly Advocate, 1898-12-09 p4 (Ellmore) | `https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_ifill_ver01:data:sn84025861:00211664770:1898120901:0236` |
| 4 | Der Sonntagsbote (Milwaukee, German), 1909-07-11 p1 | `https://tile.loc.gov/image-services/iiif/service:ndnp:whi:batch_whi_erkling_ver02:data:sn87082455:00414215233:1909071101:0217` |
| 5 | Telegraph-Courier (Kenosha), 1889-12-05 p1 | `https://tile.loc.gov/image-services/iiif/service:ndnp:whi:batch_whi_engledinger_ver02:data:sn85040310:00514152123:1889120501:0075` |

## Differences from the spec

- Spec section 8 says SAM returns "boxes + masks"; true, but as a tagged text format that needs a parser (Task 7).
- Spark's boxes are 0–1000 normalized; Task 7 must convert them with the sent image's size.
