// Bilingual push copy for the daily digest. Lives here, not in the frontend i18n
// catalog, because the Deno edge runtime can't import the React catalog — kept
// short and parallel to the catalog's tone. Western digits on purpose: a relay
// notification doesn't need the app's Arabic-Indic numerals.
//
// The body NAMES the most urgent item per category (from 0026's
// get_users_with_outstanding detail), with "+N more" when a category has
// extras: "Shoot: Nike summer campaign +2 more · Pay: Adidas · SAR 5,000".
// User-authored titles/brand names render verbatim regardless of locale (the
// custom-reminder precedent); only the label words and "+N more" are bilingual.

type Outstanding = {
  meeting_count: number;
  shoot_count: number;
  post_count: number;
  payment_count: number;
  meeting_first_title: string | null;
  shoot_first_title: string | null;
  post_first_title: string | null;
  payment_first_brand_en: string | null;
  payment_first_brand_ar: string | null;
  // numeric over PostgREST can arrive as a string — coerce before formatting.
  payment_first_amount: number | string | null;
};

export type DigestMessage = {
  title: string;
  body: string;
  url: string;
  lang: string;
};

const TARGET_URL = "/dashboard";

// Cap a free-text title so up to four categories stay inside the ~2-line mobile
// truncation; the full text is one tap away on the dashboard.
const TITLE_MAX = 30;

function truncate(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= TITLE_MAX) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

// "+N more" for the items beyond the named first one (count - 1). Empty when the
// category has a single item.
function andMore(count: number, isAr: boolean): string {
  const extra = count - 1;
  if (extra <= 0) return "";
  return isAr ? ` +${extra} أخرى` : ` +${extra} more`;
}

// Grouped Western-digit integer (no decimals): 5000 -> "5,000".
function formatAmount(amount: number | string | null): string {
  const n = Math.round(Number(amount ?? 0));
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

export function buildDigestMessage(
  locale: string,
  data: Outstanding,
): DigestMessage {
  const isAr = locale === "ar";
  const parts: string[] = [];

  if (data.meeting_count > 0 && data.meeting_first_title) {
    const label = isAr ? "اجتماع" : "Meeting";
    parts.push(
      `${label}: ${truncate(data.meeting_first_title)}${
        andMore(data.meeting_count, isAr)
      }`,
    );
  }
  if (data.shoot_count > 0 && data.shoot_first_title) {
    const label = isAr ? "تصوير" : "Shoot";
    parts.push(
      `${label}: ${truncate(data.shoot_first_title)}${
        andMore(data.shoot_count, isAr)
      }`,
    );
  }
  if (data.post_count > 0 && data.post_first_title) {
    const label = isAr ? "نشر" : "Post";
    parts.push(
      `${label}: ${truncate(data.post_first_title)}${
        andMore(data.post_count, isAr)
      }`,
    );
  }
  if (data.payment_count > 0) {
    const label = isAr ? "دفعة" : "Pay";
    const brand = isAr
      ? (data.payment_first_brand_ar ?? data.payment_first_brand_en)
      : (data.payment_first_brand_en ?? data.payment_first_brand_ar);
    const amount = `SAR ${formatAmount(data.payment_first_amount)}`;
    const detail = brand ? `${truncate(brand)} · ${amount}` : amount;
    parts.push(`${label}: ${detail}${andMore(data.payment_count, isAr)}`);
  }

  return {
    title: isAr ? "مهام اليوم" : "Today's tasks",
    body: parts.join(" · "),
    url: TARGET_URL,
    lang: isAr ? "ar" : "en",
  };
}
