import {
  DEAL_STATUS,
  type Deal,
  type DealStatus,
  type Deliverable,
} from "@shared/types/deal.types";

// The deal status machine — the ONE place deal status is derived. Pure
// (React-free, Supabase-free): hooks call it on every deliverable change and
// write its output; status is never computed ad-hoc anywhere else.
//
// Derivation over the deliverables checklist:
//   no line posted   → pending
//   some lines posted → in_progress
//   all lines posted  → posted
//
// 'paid' (set by Feature 11's RPC once all payments land) and 'cancelled'
// (manual) are terminal here — the machine returns them untouched so a
// checklist write can never silently regress money state or revive a
// cancelled deal. The UI enforces the same rule by locking the checklist.

const TERMINAL_STATUSES: readonly DealStatus[] = [
  DEAL_STATUS.PAID,
  DEAL_STATUS.CANCELLED,
];

export function isDeliverablePosted(line: Deliverable): boolean {
  return line.posted_at != null;
}

export function getDeliverableProgress(deliverables: Deliverable[]): {
  posted: number;
  total: number;
} {
  return {
    posted: deliverables.filter(isDeliverablePosted).length,
    total: deliverables.length,
  };
}

export function isChecklistLocked(status: DealStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function deriveDealStatus(
  deliverables: Deliverable[],
  currentStatus: DealStatus,
): DealStatus {
  if (isChecklistLocked(currentStatus)) return currentStatus;

  const { posted, total } = getDeliverableProgress(deliverables);
  if (total === 0 || posted === 0) return DEAL_STATUS.PENDING;
  if (posted === total) return DEAL_STATUS.POSTED;
  return DEAL_STATUS.IN_PROGRESS;
}

// True when toggling moved the deal INTO 'posted' — the moment 'deal_posted'
// is logged (forward transitions only; unmarking logs nothing).
export function becamePosted(previous: DealStatus, next: DealStatus): boolean {
  return previous !== DEAL_STATUS.POSTED && next === DEAL_STATUS.POSTED;
}

// Toggle one checklist line by index, returning a NEW deliverables array
// (never mutates — the caller diffs previous vs next status). Marking stamps
// posted_at with the current time; unmarking clears it.
export function toggleDeliverable(
  deliverables: Deliverable[],
  index: number,
  postedAt: string,
): Deliverable[] {
  return deliverables.map((line, i) => {
    if (i !== index) return line;
    return isDeliverablePosted(line)
      ? { ...line, posted_at: null }
      : { ...line, posted_at: postedAt };
  });
}

// Sort helper for the /deals list: deadline ascending with null deadlines last
// (PostgREST orders nulls first on ascending by default, so the hook asks for
// nullsFirst: false — this mirrors that contract for client-side use).
export function compareByDeadline(a: Deal, b: Deal): number {
  if (a.deadline === null && b.deadline === null) return 0;
  if (a.deadline === null) return 1;
  if (b.deadline === null) return -1;
  return a.deadline.localeCompare(b.deadline);
}
