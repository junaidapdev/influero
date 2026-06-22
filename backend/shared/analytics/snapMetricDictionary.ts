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
} as const;
export type SnapScope = (typeof SNAP_SCOPE)[keyof typeof SNAP_SCOPE];

// The three monthly surfaces, in capture/render order.
export const SNAP_SURFACE = {
  PROFILE: "profile",
  PUBLIC_STORIES: "public_stories",
  SPOTLIGHT: "spotlight",
} as const;
export type SnapSurface = (typeof SNAP_SURFACE)[keyof typeof SNAP_SURFACE];

export const SNAP_SURFACE_ORDER: SnapSurface[] = [
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
};

// The dictionary. Nested platform → scope → surface → metrics[].
export const SNAP_METRIC_DICTIONARY: Record<
  SnapPlatform,
  Record<SnapScope, Record<SnapSurface, SnapMetricDef[]>>
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

// The change-% companion key for a metric id.
export function changePctKey(metricId: string): string {
  return `${metricId}_change_pct`;
}

// Every metric definition for a platform/scope/surface.
export function getSurfaceMetrics(
  platform: SnapPlatform,
  scope: SnapScope,
  surface: SnapSurface,
): SnapMetricDef[] {
  return SNAP_METRIC_DICTIONARY[platform][scope][surface];
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
