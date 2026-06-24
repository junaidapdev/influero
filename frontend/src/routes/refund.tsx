import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { REFUND_DOC } from "@/features/legal/content/refund";

export function RefundRoute() {
  return <LegalPageLayout doc={REFUND_DOC} />;
}
