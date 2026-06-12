import { useTranslation } from "react-i18next";

type Props = {
  // Pre-formatted by the caller via lib/currency.formatSar.
  amount: string;
};

// The "Total pending" strip — ui-rules' ONE sanctioned colored-surface card
// (a callout, not a content card): a thin amber-tinted bar above the Payments
// list. Every other card stays white.
export function TotalPendingStrip({ amount }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-warning-light px-4 py-3">
      <p className="text-sm font-semibold text-warning-foreground">
        {t("payments.totalPending")}
      </p>
      <p className="money text-sm font-semibold text-warning-foreground">{amount}</p>
    </div>
  );
}
