import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { PRIVACY_DOC } from "@/features/legal/content/privacy";

export function PrivacyRoute() {
  return <LegalPageLayout doc={PRIVACY_DOC} />;
}
