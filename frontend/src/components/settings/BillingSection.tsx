import { useTranslation } from "react-i18next";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { PromoCodeForm } from "@/components/settings/PromoCodeForm";
import { Button } from "@/components/ui/Button";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useCheckout } from "@/hooks/useCheckout";
import { useCustomerPortal } from "@/hooks/useCustomerPortal";
import { useToast } from "@/hooks/useToast";
import { isPro } from "@/features/billing/entitlement";
import { formatDualTimestampDate } from "@/lib/date";
import { LOCALES } from "@/constants/locale";
import { logger } from "@/lib/logger";
import { SUBSCRIPTION_STATUS } from "@shared/types/subscription.types";

// The Settings "Billing" group: shows the current plan and the single action that
// fits it — "Upgrade to Pro" (free) → LS checkout, or "Manage billing" (pro) → the
// LS customer portal. Entitlement comes from useEntitlement (+realtime), so the
// card flips to Pro within seconds of a successful checkout.
export function BillingSection() {
  const { t, i18n } = useTranslation();
  const showToast = useToast();
  const entitlementQuery = useEntitlement();
  const checkout = useCheckout();
  const portal = useCustomerPortal();

  const locale = i18n.language === LOCALES.AR ? LOCALES.AR : LOCALES.EN;
  const entitlement = entitlementQuery.data;
  const pro = isPro(entitlement);
  // Pro sourced from a complimentary grant (promo code etc.) rather than a paid LS
  // subscription — there's no billing to manage, and we show its free-access window.
  const isGrant = entitlement?.via === "grant";

  function handleUpgrade(): void {
    checkout.mutate(undefined, {
      onError: (error) => {
        logger.error("BillingSection.upgrade", error);
        showToast("billing.toast.checkoutError", "error");
      },
    });
  }

  function handleManage(): void {
    portal.mutate(undefined, {
      onError: (error) => {
        logger.error("BillingSection.portal", error);
        showToast("billing.toast.portalError", "error");
      },
    });
  }

  function renderBody() {
    if (entitlementQuery.isLoading) {
      return <p className="text-body text-text-secondary">{t("billing.loading")}</p>;
    }
    if (entitlementQuery.isError) {
      return (
        <p className="text-body text-error-foreground">{t("billing.loadError")}</p>
      );
    }

    const activeUntil = entitlement?.active_until
      ? formatDualTimestampDate(entitlement.active_until, locale).primary
      : null;
    const subscriptionDateKey =
      entitlement?.status === SUBSCRIPTION_STATUS.CANCELLED
        ? "billing.endsOn"
        : "billing.renewsOn";

    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-text-primary">
            {pro ? t("billing.plan.pro") : t("billing.plan.free")}
          </p>
          {pro && isGrant ? (
            <p className="text-body text-text-secondary">
              {activeUntil
                ? t("billing.grantUntil", { date: activeUntil })
                : t("billing.grantForever")}
            </p>
          ) : pro && activeUntil ? (
            <p className="text-body text-text-secondary">
              {t(subscriptionDateKey, { date: activeUntil })}
            </p>
          ) : null}
        </div>

        {pro ? (
          // Grant-only Pro has no LemonSqueezy subscription, so there is nothing to
          // manage (the customer portal would 404) — show the plan state only.
          isGrant ? null : (
            <Button
              variant="secondary"
              isLoading={portal.isPending}
              onClick={handleManage}
            >
              {t("billing.manage")}
            </Button>
          )
        ) : (
          <>
            <Button
              className="w-full"
              isLoading={checkout.isPending}
              onClick={handleUpgrade}
            >
              {t("billing.upgrade")}
            </Button>
            <PromoCodeForm />
          </>
        )}
      </div>
    );
  }

  return (
    <SettingsSection title={t("billing.title")} description={t("billing.help")}>
      {renderBody()}
    </SettingsSection>
  );
}
