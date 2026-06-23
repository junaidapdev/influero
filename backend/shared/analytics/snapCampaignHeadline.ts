// computeCampaignHeadline — THE fusion rule for the 24-hour campaign report.
//
// A Snapchat story is many frames, and each frame has its OWN counts. There is
// no single honest "total story views": summing frames double-counts the same
// people (reach) and the same impressions (views). So the fusion is split:
//
//   reach       = MAX of frames' `viewers`  ← unique accounts; never summed
//   views_peak  = MAX of frames' `views`    ← peak impressions; never summed
//   frame_count = how many frames were captured
//   screenshots = SUM of frames' `screenshots`  ← actions; summing is correct
//   replies     = SUM of frames' `replies`
//   clicks      = SUM of frames' `clicks`
//
// For a single frame (the common case) MAX and SUM both equal that frame's
// value. A metric absent from every frame yields null (unknown), not 0.
//
// PURE: no DOM, no Supabase, no dictionary/label imports — only the value
// types. The edge function calls it after extraction and the web app calls it
// after a manual edit, so the headline is computed in exactly one place and the
// future mobile app reuses it untouched. Unit-tested in snapCampaignHeadline.test.ts.

import type {
  SnapCampaignComputed,
  SnapFrameValues,
} from "./snapMetricDictionary.ts";

// The finite numeric values a given metric has across the captured frames —
// null / undefined / non-finite entries are treated as "not reported".
function present(frames: SnapFrameValues[], metricId: string): number[] {
  const values: number[] = [];
  for (const frame of frames) {
    const value = frame[metricId];
    if (typeof value === "number" && Number.isFinite(value)) values.push(value);
  }
  return values;
}

function maxAcross(frames: SnapFrameValues[], metricId: string): number | null {
  const values = present(frames, metricId);
  return values.length === 0 ? null : Math.max(...values);
}

function sumAcross(frames: SnapFrameValues[], metricId: string): number | null {
  const values = present(frames, metricId);
  return values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0);
}

export function computeCampaignHeadline(
  frames: SnapFrameValues[],
): SnapCampaignComputed {
  return {
    reach: maxAcross(frames, "viewers"),
    views_peak: maxAcross(frames, "views"),
    frame_count: frames.length,
    screenshots: sumAcross(frames, "screenshots"),
    replies: sumAcross(frames, "replies"),
    clicks: sumAcross(frames, "clicks"),
  };
}
