// deno test backend/shared/analytics/snapCampaignHeadline.test.ts
//
// node:assert is a Deno built-in (no network fetch), so this runs offline and
// adds no dependency. The file is excluded from the frontend tsconfig so its
// Deno globals never enter the Vite build.

import assert from "node:assert/strict";

import { computeCampaignHeadline } from "./snapCampaignHeadline.ts";
import type { SnapFrameValues } from "./snapMetricDictionary.ts";

Deno.test("two frames: MAX for reach/views, SUM for actions", () => {
  const frames: SnapFrameValues[] = [
    { views: 4641, viewers: 4370, screenshots: 0, replies: 2, clicks: 27 },
    { views: 4773, viewers: 4420, screenshots: 0, replies: 1, clicks: 67 },
  ];
  assert.deepStrictEqual(computeCampaignHeadline(frames), {
    reach: 4420, // max(4370, 4420) — never summed
    views_peak: 4773, // max(4641, 4773) — never summed
    frame_count: 2,
    screenshots: 0, // 0 + 0
    replies: 3, // 2 + 1
    clicks: 94, // 27 + 67
  });
});

Deno.test("single frame: MAX and SUM both equal that frame", () => {
  const frames: SnapFrameValues[] = [
    { views: 4641, viewers: 4370, screenshots: 5, replies: 2, clicks: 27 },
  ];
  assert.deepStrictEqual(computeCampaignHeadline(frames), {
    reach: 4370,
    views_peak: 4641,
    frame_count: 1,
    screenshots: 5,
    replies: 2,
    clicks: 27,
  });
});

Deno.test("empty frames: every metric null, frame_count 0", () => {
  assert.deepStrictEqual(computeCampaignHeadline([]), {
    reach: null,
    views_peak: null,
    frame_count: 0,
    screenshots: null,
    replies: null,
    clicks: null,
  });
});

Deno.test("all-null frame: values null but frame_count counts it", () => {
  const frames: SnapFrameValues[] = [
    { views: null, viewers: null, screenshots: null, replies: null, clicks: null },
  ];
  assert.deepStrictEqual(computeCampaignHeadline(frames), {
    reach: null,
    views_peak: null,
    frame_count: 1,
    screenshots: null,
    replies: null,
    clicks: null,
  });
});

Deno.test("missing metric on some frames: fuse over present values only", () => {
  const frames: SnapFrameValues[] = [
    // frame 1 has clicks, no screenshots key at all
    { views: 1000, viewers: 900, replies: 4, clicks: 10 },
    // frame 2 has screenshots, clicks null (reported as 'not visible')
    { views: 1200, viewers: 1100, screenshots: 3, replies: 1, clicks: null },
  ];
  assert.deepStrictEqual(computeCampaignHeadline(frames), {
    reach: 1100, // max(900, 1100)
    views_peak: 1200, // max(1000, 1200)
    frame_count: 2,
    screenshots: 3, // only frame 2 reported it
    replies: 5, // 4 + 1
    clicks: 10, // only frame 1's value (frame 2 null → ignored)
  });
});
