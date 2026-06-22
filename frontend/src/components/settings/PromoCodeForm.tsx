import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { useRedeemPromo } from "@/hooks/useRedeemPromo";
import { useToast } from "@/hooks/useToast";
import { promoRedeemErrorKey } from "@/features/billing/entitlement";
import { logger } from "@/lib/logger";

// "Have a promo code?" — redeems a code for free Pro (grant engine, migration
// 0022). Rendered inside BillingSection only while the user is on the Free plan; a
// successful redeem invalidates entitlement, so this whole section re-renders into
// the Pro state and the form unmounts. Outcomes are surfaced as toasts (the
// convention BillingSection already uses for billing actions).
export function PromoCodeForm() {
  const { t } = useTranslation();
  const showToast = useToast();
  const redeem = useRedeemPromo();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (redeem.isPending) return;
    const trimmed = code.trim();
    if (trimmed === "") return;

    redeem.mutate(trimmed, {
      onSuccess: () => {
        setCode("");
        showToast("billing.promo.toast.success", "success");
      },
      onError: (error) => {
        logger.error("PromoCodeForm.redeem", error);
        showToast(promoRedeemErrorKey(error), "error");
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
      noValidate
    >
      <Label htmlFor="promoCode">{t("billing.promo.label")}</Label>
      <div className="flex items-center gap-2">
        <Input
          id="promoCode"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={t("billing.promo.placeholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={redeem.isPending}
        />
        <Button
          type="submit"
          variant="secondary"
          isLoading={redeem.isPending}
          disabled={code.trim() === ""}
        >
          {t("billing.promo.redeem")}
        </Button>
      </div>
    </form>
  );
}
