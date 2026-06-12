import { useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";

type Props = {
  email: string;
  onBack: () => void;
};

// Shown after sign-up when Supabase requires email confirmation (no session yet).
export function VerifyNotice({ email, onBack }: Props) {
  const { t } = useTranslation();

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-accent-light">
        <MailCheck className="size-6 text-accent" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">
        {t("auth.verify.title")}
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        {t("auth.verify.body", { email })}
      </p>
      <Button variant="ghost" className="mt-5 w-full" onClick={onBack}>
        {t("auth.verify.backToSignIn")}
      </Button>
    </div>
  );
}
