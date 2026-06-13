import {
  DEAL_STATUS,
  type Deal,
  type DealStatus,
} from "@shared/types/deal.types";

// The deal status machine — the ONE place deal status is derived. Pure
// (React-free, Supabase-free): the toggle hooks compute the next stamp state
// and write its derived status; status is never set ad-hoc anywhere else.
//
// The deal is a pipeline To-do → Shot → Posted → Paid (+ Cancelled), driven by
// two completion stamps:
//   posted_at set → 'posted'
//   shot_at set   → 'shot'
//   neither       → 'pending'
//
// 'paid' (Feature 11's RPC once all payments land) and 'cancelled' (manual) are
// terminal — the machine returns them untouched so a checkmark write can never
// silently regress money state or revive a cancelled deal. The UI enforces the
// same rule by locking the two checkmarks.

const TERMINAL_STATUSES: readonly DealStatus[] = [
  DEAL_STATUS.PAID,
  DEAL_STATUS.CANCELLED,
];

// The mutable slice of a deal the two checkmarks own.
export type DealStageState = {
  shot_at: string | null;
  posted_at: string | null;
  status: DealStatus;
};

export function isLifecycleLocked(status: DealStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isShot(deal: Pick<Deal, "shot_at">): boolean {
  return deal.shot_at != null;
}

export function isPosted(deal: Pick<Deal, "posted_at">): boolean {
  return deal.posted_at != null;
}

// Posting implies shooting, so the Shot box can't be unticked while a deal is
// posted (that would strand it 'posted' with no shot stamp). The UI disables
// the box; the hook guards the write.
export function canToggleShot(
  deal: Pick<Deal, "posted_at" | "status">,
): boolean {
  return !isLifecycleLocked(deal.status) && deal.posted_at == null;
}

export function deriveDealStatus(
  input: Pick<Deal, "shot_at" | "posted_at" | "status">,
): DealStatus {
  if (isLifecycleLocked(input.status)) return input.status;
  if (input.posted_at != null) return DEAL_STATUS.POSTED;
  if (input.shot_at != null) return DEAL_STATUS.SHOT;
  return DEAL_STATUS.PENDING;
}

// Tick/untick Shot. Marking stamps shot_at; unmarking clears it (only valid
// when not posted — see canToggleShot). Returns the next stamp+status slice;
// the caller diffs against the deal to decide what to log.
export function toggleShot(
  deal: Pick<Deal, "shot_at" | "posted_at" | "status">,
  nowIso: string,
): DealStageState {
  const next: DealStageState = {
    shot_at: isShot(deal) ? null : nowIso,
    posted_at: deal.posted_at,
    status: deal.status,
  };
  return { ...next, status: deriveDealStatus(next) };
}

// Tick/untick Posted. Marking stamps posted_at and back-stamps shot_at if unset
// (you can't post unshot content); unmarking clears posted_at but LEAVES shot_at
// (the content stays shot). Returns the next stamp+status slice.
export function togglePosted(
  deal: Pick<Deal, "shot_at" | "posted_at" | "status">,
  nowIso: string,
): DealStageState {
  const marking = !isPosted(deal);
  const next: DealStageState = marking
    ? { shot_at: deal.shot_at ?? nowIso, posted_at: nowIso, status: deal.status }
    : { shot_at: deal.shot_at, posted_at: null, status: deal.status };
  return { ...next, status: deriveDealStatus(next) };
}

// Forward-transition detectors keyed on the STAMPS (not the status string), so
// "posting back-stamped shot" still counts as becoming shot. Drives the
// deal_shot / deal_posted activity logs and the +24h Snap reminder (on posted).
export function becameShot(
  previous: Pick<Deal, "shot_at">,
  next: Pick<DealStageState, "shot_at">,
): boolean {
  return previous.shot_at == null && next.shot_at != null;
}

export function becamePosted(
  previous: Pick<Deal, "posted_at">,
  next: Pick<DealStageState, "posted_at">,
): boolean {
  return previous.posted_at == null && next.posted_at != null;
}

// Sort helper: post_date ascending with null post_dates last (PostgREST orders
// nulls first on ascending by default, so the hook asks for nullsFirst: false —
// this mirrors that contract for client-side use).
export function compareByPostDate(a: Deal, b: Deal): number {
  if (a.post_date === null && b.post_date === null) return 0;
  if (a.post_date === null) return 1;
  if (b.post_date === null) return -1;
  return a.post_date.localeCompare(b.post_date);
}
