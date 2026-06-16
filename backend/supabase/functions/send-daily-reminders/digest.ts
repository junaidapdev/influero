// Bilingual push copy for the daily digest. Lives here, not in the frontend i18n
// catalog, because the Deno edge runtime can't import the React catalog — kept
// short and parallel to the catalog's tone. Western digits on purpose: a relay
// notification doesn't need the app's Arabic-Indic numerals.

type Counts = {
  meeting_count: number;
  shoot_count: number;
  post_count: number;
  payment_count: number;
};

export type DigestMessage = {
  title: string;
  body: string;
  url: string;
  lang: string;
};

const TARGET_URL = "/dashboard";

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

export function buildDigestMessage(locale: string, counts: Counts): DigestMessage {
  const isAr = locale === "ar";
  const parts: string[] = [];

  if (counts.meeting_count > 0) {
    parts.push(
      isAr
        ? `${counts.meeting_count} اجتماع`
        : `${counts.meeting_count} meeting${plural(counts.meeting_count)}`,
    );
  }
  if (counts.shoot_count > 0) {
    parts.push(
      isAr ? `${counts.shoot_count} للتصوير` : `${counts.shoot_count} to shoot`,
    );
  }
  if (counts.post_count > 0) {
    parts.push(
      isAr ? `${counts.post_count} للنشر` : `${counts.post_count} to post`,
    );
  }
  if (counts.payment_count > 0) {
    parts.push(
      isAr
        ? `${counts.payment_count} دفعة للمتابعة`
        : `${counts.payment_count} payment${plural(counts.payment_count)} to follow up`,
    );
  }

  return {
    title: isAr ? "مهام اليوم" : "Today's tasks",
    body: parts.join(" · "),
    url: TARGET_URL,
    lang: isAr ? "ar" : "en",
  };
}
