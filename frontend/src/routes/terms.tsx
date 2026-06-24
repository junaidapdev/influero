import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { TERMS_DOC } from "@/features/legal/content/terms";

export function TermsRoute() {
  return <LegalPageLayout doc={TERMS_DOC} />;
}
