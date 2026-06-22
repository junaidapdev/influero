import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { STORAGE } from "@/constants/storage";
import { SNAP_EDGE_FUNCTION, type SnapMime } from "@/constants/snap";
import { snapMonthlyObjectPath, snapObjectPath } from "@/features/snap/upload";
import type { SnapReportFormInput } from "@/features/snap/snap.schema";
import {
  SNAP_EXTRACTION_STATUS,
  SNAP_REPORT_TYPE,
  type SnapReport,
  type SnapReportType,
} from "@shared/types/snapReport.types";
import {
  SNAP_PLATFORM,
  SNAP_SCOPE,
  type SnapMonthlyMetrics,
  type SnapReportImage,
  type SnapSurface,
} from "@shared/analytics/snapMetricDictionary";

// Signed URLs outlive their consumer comfortably but stay short-lived — the
// bucket is private and the URL is the only thing that ever leaves it.
const SIGNED_URL_TTL_SECONDS = 60 * 60;
// Refresh the cached URL well before it expires.
const SIGNED_URL_STALE_MS = 45 * 60 * 1000;

// Maps the all-string form input to snap_reports columns: empty string → null,
// validated count strings → numbers. extraction_status is set by the caller
// (manual for field edits) — linking a deal alone never changes status.
function toSnapColumns(input: SnapReportFormInput): {
  views: number | null;
  reach: number | null;
  story_views: number | null;
  screenshot_count: number | null;
  swipe_ups: number | null;
  profile_views: number | null;
  new_followers: number | null;
  watch_time_minutes: number | null;
  report_date: string | null;
} {
  const toCount = (value: string): number | null =>
    value.trim() === "" ? null : Number(value.trim());
  const reportDate = input.reportDate.trim();
  return {
    views: toCount(input.views),
    reach: toCount(input.reach),
    story_views: toCount(input.storyViews),
    screenshot_count: toCount(input.screenshotCount),
    swipe_ups: toCount(input.swipeUps),
    profile_views: toCount(input.profileViews),
    new_followers: toCount(input.newFollowers),
    watch_time_minutes: toCount(input.watchTimeMinutes),
    report_date: reportDate === "" ? null : reportDate,
  };
}

// The full history, newest first — the /analytics/snap list. RLS scopes the
// read; the user_id filter is convenience.
export function useSnapReports() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.SNAP_REPORTS, "list"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<SnapReport[]> => {
      if (!userId) throw new Error("[useSnapReports] No authenticated user");

      const { data, error } = await supabase
        .from("snap_reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []) as SnapReport[];
    },
  });
}

// A deal's linked reports — the deal expanded row's snap line. Only mounted by
// an EXPANDED row (the usePaymentsForDeal no-N+1 pattern).
export function useSnapReportsForDeal(dealId: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.SNAP_REPORTS, "deal", dealId],
    enabled: Boolean(userId && dealId),
    queryFn: async (): Promise<SnapReport[]> => {
      if (!userId || !dealId) {
        throw new Error("[useSnapReportsForDeal] Missing user or deal id");
      }

      const { data, error } = await supabase
        .from("snap_reports")
        .select("*")
        .eq("user_id", userId)
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []) as SnapReport[];
    },
  });
}

type CreateSnapReportInput = {
  // Always an IMAGE by the time it reaches the hook — the route validates
  // (MIME + magic bytes + size) and converts a PDF's first page to PNG first.
  blob: Blob;
  mime: SnapMime;
  // 'post' (one piece of content's 24h Insights) or 'monthly' (the account's
  // monthly Insights page) — picked by the upload card's type chips (16B).
  // The edge function reads it back from the ROW, never from the client.
  reportType: SnapReportType;
};

// Best-effort failure write — flips a still-pending row to failed so the
// manual-entry path appears. Guarded on 'pending' so it can never overwrite a
// result that landed concurrently.
async function markReportFailed(reportId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("snap_reports")
    .update({ extraction_status: SNAP_EXTRACTION_STATUS.FAILED })
    .eq("id", reportId)
    .eq("user_id", userId)
    .eq("extraction_status", SNAP_EXTRACTION_STATUS.PENDING);
  if (error) logger.error("[useCreateSnapReport] markReportFailed", error);
}

// Fire-and-forget extraction. Kicked off AFTER the pending row is visible, so
// the row shows its pending state immediately and the result streams in via
// realtime (architecture's realtime pattern) — the invoke is not awaited by the
// mutation. An invoke failure flips the row to failed (the manual-entry path);
// either way the prefix is invalidated on completion so the list settles even
// if the realtime event was missed (e.g. the subscription armed a beat late).
async function runExtraction(
  reportId: string,
  userId: string,
  queryClient: QueryClient,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke(SNAP_EDGE_FUNCTION, {
      body: { snapReportId: reportId },
    });
    if (error) {
      logger.error("[useCreateSnapReport] invoke", error);
      await markReportFailed(reportId, userId);
    }
    // On a non-2xx envelope the function already marked the row failed.
  } catch (err) {
    logger.error("[useCreateSnapReport] invoke", err);
    await markReportFailed(reportId, userId);
  } finally {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SNAP_REPORTS });
  }
}

// Upload → pending row. The mutation resolves once the report EXISTS (upload +
// insert succeeded) and the list is invalidated so the pending row appears at
// once; extraction is then fired in the background and its result arrives via
// realtime. The edge function owns extracted/failed and logs snap_extracted.
export function useCreateSnapReport() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({
      blob,
      mime,
      reportType,
    }: CreateSnapReportInput): Promise<SnapReport> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCreateSnapReport] No authenticated user");

      const path = snapObjectPath(userId, crypto.randomUUID(), mime);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE.SNAP_UPLOADS_BUCKET)
        .upload(path, blob, { contentType: mime });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("snap_reports")
        .insert({
          user_id: userId,
          source_file_url: path,
          report_type: reportType,
          extraction_status: SNAP_EXTRACTION_STATUS.PENDING,
        })
        .select("*")
        .single();
      if (insertError) throw insertError;

      return data as SnapReport;
    },
    onSuccess: (report) => {
      // Show the pending row now, then extract in the background.
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SNAP_REPORTS });
      void runExtraction(report.id, report.user_id, queryClient);
    },
  });
}

type UpdateSnapFieldsInput = {
  reportId: string;
  input: SnapReportFormInput;
};

// The manual override: writes the edited fields and stamps the row 'manual' —
// the user always has the final word, and a manual row never reverts to
// 'extracted'. A direct RLS-gated single-row write (no edge function needed).
export function useUpdateSnapFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, input }: UpdateSnapFieldsInput): Promise<SnapReport> => {
      const { data, error } = await supabase
        .from("snap_reports")
        .update({
          ...toSnapColumns(input),
          extraction_status: SNAP_EXTRACTION_STATUS.MANUAL,
        })
        .eq("id", reportId)
        .select("*")
        .single();
      if (error) throw error;

      return data as SnapReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SNAP_REPORTS });
    },
  });
}

type LinkSnapToDealInput = {
  reportId: string;
  dealId: string | null;
};

// Linking is metadata, not a data override — it deliberately does NOT touch
// extraction_status (agreed in the Feature 15 plan).
export function useLinkSnapToDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, dealId }: LinkSnapToDealInput): Promise<SnapReport> => {
      const { data, error } = await supabase
        .from("snap_reports")
        .update({ deal_id: dealId })
        .eq("id", reportId)
        .select("*")
        .single();
      if (error) throw error;

      return data as SnapReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SNAP_REPORTS });
    },
  });
}

// Short-lived signed URL for the private source image (the detail sheet's
// preview). Keyed by path; refreshed before the TTL runs out.
export function useSnapSignedUrl(path: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SNAP_REPORTS, "signed-url", path],
    enabled: Boolean(path),
    staleTime: SIGNED_URL_STALE_MS,
    queryFn: async (): Promise<string> => {
      if (!path) throw new Error("[useSnapSignedUrl] Missing path");

      const { data, error } = await supabase.storage
        .from(STORAGE.SNAP_UPLOADS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;

      return data.signedUrl;
    },
  });
}

// Realtime delivery of extraction results — no polling (architecture's
// realtime pattern). ONE channel per page covering all of the user's rows
// (postgres_changes respects RLS, so only own-row events ever arrive). On an
// UPDATE the prefix is invalidated: the list, any open deal line, and the
// detail all refetch the settled row. Subscribe only while something is
// actually pending — `enabled` comes from the mounted list.
export function useSnapReportsRealtime(enabled: boolean) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase
      .channel(`snap_reports:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "snap_reports",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.SNAP_REPORTS,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, userId, queryClient]);
}

// ─── Monthly (metric-dictionary) model ──────────────────────────────────────

type MonthlyImageInput = { surface: SnapSurface; blob: Blob; mime: SnapMime };

type CreateMonthlySnapInput = {
  // 1+ surface-tagged images (the surface comes from the slot the user dropped
  // each into). The route validates + converts each to an image before here.
  images: MonthlyImageInput[];
  // The displayed reporting period — defaults to the current month-year; the
  // edge function overwrites it only if it cleanly reads a range, and the user
  // can edit it afterwards.
  periodLabel: string;
};

// Upload every slotted image under one per-report folder, insert ONE pending
// monthly row carrying the image manifest, then fire the same background
// extraction the post flow uses (the edge function reads the manifest from the
// row and merges a per-surface metrics jsonb). source_file_url (NOT NULL since
// 0010) is set to the first image as a representative — monthly reads `images`.
export function useCreateMonthlySnapReport() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({
      images,
      periodLabel,
    }: CreateMonthlySnapInput): Promise<SnapReport> => {
      const userId = session?.user.id;
      if (!userId) {
        throw new Error("[useCreateMonthlySnapReport] No authenticated user");
      }
      if (images.length === 0) {
        throw new Error("[useCreateMonthlySnapReport] No images");
      }

      const groupId = crypto.randomUUID();
      const manifest: SnapReportImage[] = [];
      await Promise.all(
        images.map(async (image, index) => {
          const path = snapMonthlyObjectPath(
            userId,
            groupId,
            image.surface,
            index,
            image.mime,
          );
          const { error } = await supabase.storage
            .from(STORAGE.SNAP_UPLOADS_BUCKET)
            .upload(path, image.blob, { contentType: image.mime });
          if (error) throw error;
          manifest[index] = { surface: image.surface, path };
        }),
      );

      const { data, error: insertError } = await supabase
        .from("snap_reports")
        .insert({
          user_id: userId,
          source_file_url: manifest[0].path,
          report_type: SNAP_REPORT_TYPE.MONTHLY,
          platform: SNAP_PLATFORM.SNAPCHAT,
          scope: SNAP_SCOPE.MONTHLY,
          period_label: periodLabel,
          images: manifest,
          extraction_status: SNAP_EXTRACTION_STATUS.PENDING,
        })
        .select("*")
        .single();
      if (insertError) throw insertError;

      return data as SnapReport;
    },
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SNAP_REPORTS });
      void runExtraction(report.id, report.user_id, queryClient);
    },
  });
}

type UpdateMonthlySnapInput = {
  reportId: string;
  metrics: SnapMonthlyMetrics;
  periodLabel: string;
};

// The monthly manual override: writes the edited metrics jsonb + period and
// stamps the row 'manual' (the user always has the final word). A direct
// RLS-gated single-row write — no edge function.
export function useUpdateMonthlySnap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      metrics,
      periodLabel,
    }: UpdateMonthlySnapInput): Promise<SnapReport> => {
      const { data, error } = await supabase
        .from("snap_reports")
        .update({
          metrics,
          period_label: periodLabel.trim() === "" ? null : periodLabel.trim(),
          extraction_status: SNAP_EXTRACTION_STATUS.MANUAL,
        })
        .eq("id", reportId)
        .select("*")
        .single();
      if (error) throw error;

      return data as SnapReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SNAP_REPORTS });
    },
  });
}

// Batch signed URLs for a monthly report's per-surface previews — one query for
// all paths (createSignedUrls), keyed by path → URL. Same private-bucket TTL as
// the single-image preview.
export function useSnapSignedUrls(paths: string[]) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SNAP_REPORTS, "signed-urls", paths],
    enabled: paths.length > 0,
    staleTime: SIGNED_URL_STALE_MS,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage
        .from(STORAGE.SNAP_UPLOADS_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;

      const byPath: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) byPath[item.path] = item.signedUrl;
      }
      return byPath;
    },
  });
}
