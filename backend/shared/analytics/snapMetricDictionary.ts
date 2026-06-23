// The Snap metric dictionary — the SINGLE SOURCE OF TRUTH for the monthly
// Snapchat report. Framework-agnostic (no React, Vite, or Deno imports) so the
// web app, the extract-snap-report edge function, and the future React Native
// app all read the exact same definitions. A metric label NEVER lives in two
// places: the extraction schema + prompt (edge) and the report UI (frontend)
// both derive from here.
//
// Snapchat's monthly Insights is three separate dashboards ("surfaces"), each
// with its own "28 Day Summary". The fixed-column model matched none of them;
// this dictionary describes every metric per surface, and the data model stores
// values in a `metrics` jsonb keyed by surface — so "Viewers" on Public Stories
// and "Viewers" on Spotlight live under different keys and never collide.
//
// "Profile Stories" is deliberately ABSENT — it is never offered.

export const SNAP_PLATFORM = {
  SNAPCHAT: "snapchat",
} as const;
export type SnapPlatform = (typeof SNAP_PLATFORM)[keyof typeof SNAP_PLATFORM];

export const SNAP_SCOPE = {
  MONTHLY: "monthly",
  // 24-hour campaign: the 1–3 story FRAMES that featured one brand, fused into
  // one honest card and linked to a deal (0024).
  CAMPAIGN_24H: "campaign_24h",
} as const;
export type SnapScope = (typeof SNAP_SCOPE)[keyof typeof SNAP_SCOPE];

// Snapchat surfaces. The three monthly dashboards + the single per-frame
// surface a campaign captures. PROFILE/PUBLIC_STORIES/SPOTLIGHT are the monthly
// model; STORY_FRAME is the campaign model.
export const SNAP_SURFACE = {
  PROFILE: "profile",
  PUBLIC_STORIES: "public_stories",
  SPOTLIGHT: "spotlight",
  STORY_FRAME: "story_frame",
} as const;
export type SnapSurface = (typeof SNAP_SURFACE)[keyof typeof SNAP_SURFACE];

// The monthly-only surfaces (excludes story_frame) — the monthly upload slots
// and detail sheet key their per-surface state by this narrower set, so adding
// the campaign surface to SnapSurface never forces a story_frame slot on them.
export type SnapMonthlySurface =
  | typeof SNAP_SURFACE.PROFILE
  | typeof SNAP_SURFACE.PUBLIC_STORIES
  | typeof SNAP_SURFACE.SPOTLIGHT;

// The three MONTHLY surfaces, in capture/render order. STORY_FRAME is
// deliberately ABSENT — it belongs to the campaign scope, not the monthly grid.
export const SNAP_SURFACE_ORDER: SnapMonthlySurface[] = [
  SNAP_SURFACE.PROFILE,
  SNAP_SURFACE.PUBLIC_STORIES,
  SNAP_SURFACE.SPOTLIGHT,
];

// A metric's unit drives both the extraction schema's numeric type (count →
// integer, everything else → number) and how the value renders. The native
// Snapchat value keeps its unit: "1.3 minutes" → 1.3 (minutes), "956 hours" →
// 956 (hours), "43%" → 43 (percent), counts → whole integers.
export const SNAP_METRIC_UNIT = {
  COUNT: "count",
  SECONDS: "seconds",
  MINUTES: "minutes",
  HOURS: "hours",
  PERCENT: "percent",
} as const;
export type SnapMetricUnit =
  (typeof SNAP_METRIC_UNIT)[keyof typeof SNAP_METRIC_UNIT];

export type SnapLabel = { en: string; ar: string };

export type SnapMetricDef = {
  // Canonical id, unique WITHIN its surface. The jsonb key for the value;
  // `${id}_change_pct` (when hasChangePct) holds the "vs Previous 28 Days" %.
  id: string;
  label: SnapLabel;
  unit: SnapMetricUnit;
  // Whether Snapchat shows a "vs Previous 28 Days" % change for this metric.
  hasChangePct: boolean;
  // The native on-screen labels (Arabic + English) the model should match to
  // this canonical id. Drives the per-surface extraction prompt.
  synonyms: { en: string[]; ar: string[] };
};

// Display names for each surface — co-located with the metric labels so all
// snap-domain labels live in ONE module (the upload slots + the detail sheet's
// per-surface groups both read these).
export const SNAP_SURFACE_LABELS: Record<SnapSurface, SnapLabel> = {
  [SNAP_SURFACE.PROFILE]: { en: "Profile", ar: "الملف الشخصي" },
  [SNAP_SURFACE.PUBLIC_STORIES]: { en: "Public Stories", ar: "القصص العامة" },
  [SNAP_SURFACE.SPOTLIGHT]: { en: "Spotlight", ar: "سبوت لايت" },
  [SNAP_SURFACE.STORY_FRAME]: { en: "Story frame", ar: "لقطة القصة" },
};

// The dictionary. Nested platform → scope → surface → metrics[]. Partial at the
// scope + surface levels because each scope defines only the surfaces it uses
// (monthly: profile/public_stories/spotlight; campaign: story_frame).
export const SNAP_METRIC_DICTIONARY: Record<
  SnapPlatform,
  Partial<Record<SnapScope, Partial<Record<SnapSurface, SnapMetricDef[]>>>>
> = {
  [SNAP_PLATFORM.SNAPCHAT]: {
    [SNAP_SCOPE.MONTHLY]: {
      [SNAP_SURFACE.PROFILE]: [
        {
          id: "followers",
          label: { en: "Total followers", ar: "إجمالي المتابعين" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Total followers", "Followers", "Subscribers"],
            ar: ["إجمالي المتابعين", "المتابعون", "المشتركون", "إجمالي المشتركين"],
          },
        },
        {
          id: "profile_views",
          label: { en: "Profile views", ar: "مشاهدات الملف الشخصي" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Profile views", "Profile visits"],
            ar: ["مشاهدات الملف الشخصي", "زيارات الملف الشخصي"],
          },
        },
      ],
      [SNAP_SURFACE.PUBLIC_STORIES]: [
        {
          id: "snap_views",
          label: { en: "Snap views", ar: "مشاهدات السناب" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Snap Views", "Story Views", "Views"],
            ar: ["مشاهدات السناب", "مشاهدات القصة", "المشاهدات"],
          },
        },
        {
          id: "viewers",
          label: { en: "Viewers", ar: "المشاهدون" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Viewers", "Unique viewers"],
            ar: ["المشاهدون", "عدد المشاهدين", "المشاهدون الفريدون"],
          },
        },
        {
          id: "avg_view_time",
          label: { en: "Average view time", ar: "متوسط وقت المشاهدة" },
          unit: SNAP_METRIC_UNIT.MINUTES,
          hasChangePct: false,
          synonyms: {
            en: ["Average view time", "Avg. view time"],
            ar: ["متوسط وقت المشاهدة"],
          },
        },
        {
          id: "total_view_time",
          label: { en: "Total view time", ar: "إجمالي وقت المشاهدة" },
          unit: SNAP_METRIC_UNIT.HOURS,
          hasChangePct: false,
          synonyms: {
            en: ["Total view time"],
            ar: ["إجمالي وقت المشاهدة"],
          },
        },
      ],
      [SNAP_SURFACE.SPOTLIGHT]: [
        {
          id: "views",
          label: { en: "Views", ar: "المشاهدات" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Views", "Spotlight views"],
            ar: ["المشاهدات", "مشاهدات سبوت لايت"],
          },
        },
        {
          id: "viewers",
          label: { en: "Viewers", ar: "المشاهدون" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Viewers", "Unique viewers"],
            ar: ["المشاهدون", "عدد المشاهدين"],
          },
        },
        {
          id: "avg_view_time",
          label: { en: "Average view time", ar: "متوسط وقت المشاهدة" },
          unit: SNAP_METRIC_UNIT.MINUTES,
          hasChangePct: false,
          synonyms: {
            en: ["Average view time", "Avg. view time"],
            ar: ["متوسط وقت المشاهدة"],
          },
        },
        {
          id: "avg_view_rate",
          label: { en: "Average view rate", ar: "متوسط معدل المشاهدة" },
          unit: SNAP_METRIC_UNIT.PERCENT,
          hasChangePct: false,
          synonyms: {
            en: ["Average view rate", "Avg. view rate"],
            ar: ["متوسط معدل المشاهدة"],
          },
        },
        {
          id: "total_view_time",
          label: { en: "Total view time", ar: "إجمالي وقت المشاهدة" },
          unit: SNAP_METRIC_UNIT.HOURS,
          hasChangePct: false,
          synonyms: {
            en: ["Total view time"],
            ar: ["إجمالي وقت المشاهدة"],
          },
        },
        {
          id: "favourites",
          label: { en: "Favourites", ar: "المفضلة" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Favourites", "Favorites"],
            ar: ["المفضلة", "الإعجابات"],
          },
        },
        {
          id: "shares",
          label: { en: "Shares", ar: "المشاركات" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Shares"],
            ar: ["المشاركات", "إعادة المشاركة"],
          },
        },
        {
          id: "followers_gained",
          label: { en: "Followers gained", ar: "المتابعون المكتسبون" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: true,
          synonyms: {
            en: ["Followers", "Followers gained", "New followers"],
            ar: ["المتابعون", "المتابعون المكتسبون", "المشتركون الجدد"],
          },
        },
      ],
    },
    // 24-hour campaign: ONE surface (a single story frame's Insights screen).
    // Each captured frame is extracted against these metrics, then fused by
    // computeCampaignHeadline. Counts only; Snapchat shows no "vs previous" %
    // on a frame, so hasChangePct is false throughout.
    [SNAP_SCOPE.CAMPAIGN_24H]: {
      [SNAP_SURFACE.STORY_FRAME]: [
        {
          id: "views",
          label: { en: "Views", ar: "المشاهدات" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Views"],
            ar: ["المشاهدات", "مرات المشاهدة", "عدد المشاهدات"],
          },
        },
        {
          id: "viewers",
          label: { en: "Viewers", ar: "المشاهدون" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Viewers", "Unique viewers"],
            ar: ["المشاهدون", "عدد المشاهدين", "المشاهدون الفريدون"],
          },
        },
        {
          id: "screenshots",
          label: { en: "Screenshots", ar: "لقطات الشاشة" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Screenshots"],
            ar: ["لقطات الشاشة", "لقطات الشاشه", "عدد لقطات الشاشة"],
          },
        },
        {
          id: "replies",
          label: { en: "Replies", ar: "الردود" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Replies"],
            ar: ["الردود", "ردود", "عدد الردود"],
          },
        },
        {
          id: "clicks",
          label: { en: "Clicks", ar: "النقرات" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Clicks", "Link taps", "Link clicks"],
            ar: ["النقرات", "نقرات الرابط", "النقر", "عدد النقرات"],
          },
        },
        {
          id: "tap_forwards",
          label: { en: "Tap forwards", ar: "التمرير للأمام" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Tap forwards", "Tap forward", "Taps forward"],
            ar: ["التمرير للأمام", "النقر للأمام", "التقديم"],
          },
        },
        {
          id: "tap_backwards",
          label: { en: "Tap backwards", ar: "التمرير للخلف" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Tap backwards", "Tap back", "Taps back"],
            ar: ["التمرير للخلف", "النقر للخلف", "الرجوع"],
          },
        },
        {
          id: "swipe_aways",
          label: { en: "Swipe-aways", ar: "التمرير بعيدًا" },
          unit: SNAP_METRIC_UNIT.COUNT,
          hasChangePct: false,
          synonyms: {
            en: ["Swipe aways", "Swipe away", "Swipe-aways"],
            ar: ["التمرير بعيدًا", "السحب بعيدًا", "التمرير بعيداً"],
          },
        },
      ],
    },
  },
};

// The image manifest stored on the row (jsonb). Each uploaded screenshot is
// tagged with the surface it was dropped into — the surface comes from the
// SLOT, never from guessing.
export type SnapReportImage = { surface: SnapSurface; path: string };

// Per-surface extracted values: each metric id → number|null, plus
// `${id}_change_pct` keys for metrics with hasChangePct.
export type SnapMetricValues = Record<string, number | null>;

// The `metrics` jsonb column shape — values nested by surface. A surface key is
// absent until at least one of its images is extracted.
export type SnapMonthlyMetrics = Partial<Record<SnapSurface, SnapMetricValues>>;

// ─── Campaign (24h) value types ─────────────────────────────────────────────

// One captured frame's extracted metrics — story_frame metric id → number|null
// (same shape as a surface's values; aliased for intent at the call sites).
export type SnapFrameValues = SnapMetricValues;

// The fused headline. reach/views_peak are MAX over frames (unique people /
// peak impressions — never summed); screenshots/replies/clicks are SUM (action
// counts). Each is null when no captured frame reported that metric.
export type SnapCampaignComputed = {
  reach: number | null;
  views_peak: number | null;
  frame_count: number;
  screenshots: number | null;
  replies: number | null;
  clicks: number | null;
};

// The campaign `metrics` jsonb: the per-frame raw extractions AND the fused
// headline. computeCampaignHeadline is the only writer of `computed`.
export type SnapCampaignMetrics = {
  frames: SnapFrameValues[];
  computed: SnapCampaignComputed;
};

// The `metrics` column shape across BOTH new-model scopes. Monthly fills the
// surface-keyed buckets; campaign fills frames + computed. Kept as ONE combined
// type (not a discriminated union) so monthly read-sites keep indexing by
// surface key with no change, while campaign adds its own optional keys. Narrow
// the intent by `report.scope` at the call site.
export type SnapReportMetrics = SnapMonthlyMetrics & {
  frames?: SnapFrameValues[];
  computed?: SnapCampaignComputed;
};

// The change-% companion key for a metric id.
export function changePctKey(metricId: string): string {
  return `${metricId}_change_pct`;
}

// Every metric definition for a platform/scope/surface. Returns [] for a
// scope/surface pair the dictionary doesn't define (the nesting is Partial),
// so callers can iterate without a presence check.
export function getSurfaceMetrics(
  platform: SnapPlatform,
  scope: SnapScope,
  surface: SnapSurface,
): SnapMetricDef[] {
  return SNAP_METRIC_DICTIONARY[platform]?.[scope]?.[surface] ?? [];
}

// One metric definition by surface + id (monthly Snapchat — the only scope).
export function getMonthlyMetricDef(
  surface: SnapSurface,
  metricId: string,
): SnapMetricDef | undefined {
  return getSurfaceMetrics(
    SNAP_PLATFORM.SNAPCHAT,
    SNAP_SCOPE.MONTHLY,
    surface,
  ).find((metric) => metric.id === metricId);
}

// The CURATED headline set shown on the exported report card — a hand-picked
// subset (NOT every raw metric), each with its own display label. The full set
// stays in `metrics`. A headline is either one metric or a sum of metrics in a
// surface (Engagement = Favourites + Shares).
export type SnapHeadline =
  | {
      kind: "metric";
      surface: SnapSurface;
      metricId: string;
      label: SnapLabel;
    }
  | {
      kind: "sum";
      surface: SnapSurface;
      metricIds: string[];
      label: SnapLabel;
    };

export const SNAP_MONTHLY_HEADLINES: SnapHeadline[] = [
  {
    kind: "metric",
    surface: SNAP_SURFACE.PROFILE,
    metricId: "followers",
    label: { en: "Followers", ar: "المتابعون" },
  },
  {
    kind: "metric",
    surface: SNAP_SURFACE.PROFILE,
    metricId: "profile_views",
    label: { en: "Profile views", ar: "مشاهدات الملف" },
  },
  {
    kind: "metric",
    surface: SNAP_SURFACE.PUBLIC_STORIES,
    metricId: "snap_views",
    label: { en: "Story views", ar: "مشاهدات القصة" },
  },
  {
    kind: "metric",
    surface: SNAP_SURFACE.PUBLIC_STORIES,
    metricId: "viewers",
    label: { en: "Story viewers", ar: "مشاهدو القصة" },
  },
  {
    kind: "metric",
    surface: SNAP_SURFACE.SPOTLIGHT,
    metricId: "views",
    label: { en: "Spotlight views", ar: "مشاهدات سبوت لايت" },
  },
  {
    kind: "metric",
    surface: SNAP_SURFACE.SPOTLIGHT,
    metricId: "viewers",
    label: { en: "Spotlight viewers", ar: "مشاهدو سبوت لايت" },
  },
  {
    kind: "sum",
    surface: SNAP_SURFACE.SPOTLIGHT,
    metricIds: ["favourites", "shares"],
    label: { en: "Engagement", ar: "التفاعل" },
  },
];

// The campaign card's headline tiles, read from `computed` (NOT raw frames).
// Reach is the hero (unique people); Clicks ≈ conversions; Screenshots is an
// honest action count. Views is the PEAK frame, never a summed total. Labels
// live here, not in the card — the single-source-of-truth rule.
export type SnapCampaignHeadline = {
  computedKey: keyof SnapCampaignComputed;
  label: SnapLabel;
  tier: "primary" | "secondary";
  // views_peak is a single-frame MAX, never a total — the card labels it the
  // "highest frame" and notes "across N frames" when frame_count > 1.
  isPeak?: boolean;
};

export const SNAP_CAMPAIGN_HEADLINES: SnapCampaignHeadline[] = [
  { computedKey: "reach", label: { en: "Reach", ar: "الوصول" }, tier: "primary" },
  { computedKey: "clicks", label: { en: "Clicks", ar: "النقرات" }, tier: "primary" },
  {
    computedKey: "screenshots",
    label: { en: "Screenshots", ar: "لقطات الشاشة" },
    tier: "primary",
  },
  {
    computedKey: "views_peak",
    label: { en: "Views", ar: "المشاهدات" },
    tier: "secondary",
    isPeak: true,
  },
  { computedKey: "replies", label: { en: "Replies", ar: "الردود" }, tier: "secondary" },
];
