import { useTranslation } from "react-i18next";

import {
  SNAP_EXTRACTION_STATUS,
  type SnapExtractionStatus,
} from "@shared/types/snapReport.types";

type Props = {
  status: SnapExtractionStatus;
};

// The snap extraction-status pill. Colors map 1:1 from ui-tokens "Status
// Pills — Snap" (added with Feature 15: pending=warning, extracted=success,
// failed=error, manual=info — existing families, no new hex). Label-only like
// the payments pill (the snap table defines no dot). At most one pill per row.
const PILL_CLASSES: Record<SnapExtractionStatus, string> = {
  [SNAP_EXTRACTION_STATUS.PENDING]: "bg-warning-light text-warning-foreground",
  [SNAP_EXTRACTION_STATUS.EXTRACTED]: "bg-success-light text-success-foreground",
  [SNAP_EXTRACTION_STATUS.FAILED]: "bg-error-light text-error-foreground",
  [SNAP_EXTRACTION_STATUS.MANUAL]: "bg-info-light text-info-foreground",
};

export function SnapStatusPill({ status }: Props) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PILL_CLASSES[status]}`}
    >
      {t(`snap.status.${status}`)}
    </span>
  );
}
