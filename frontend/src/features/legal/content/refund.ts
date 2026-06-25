import type { LegalDoc } from "@/features/legal/legalDoc";
import { SUPPORT_EMAIL } from "@/constants/support";

// ⚠️ DRAFT — plain-language starting point, not legal advice. Have a lawyer review,
// and make sure it matches what LemonSqueezy (Merchant of Record) actually enforces.
export const REFUND_DOC: LegalDoc = {
  title: { en: "Refund & Cancellation Policy", ar: "سياسة الاسترداد والإلغاء" },
  updated: "2026-06-24",
  intro: {
    en: "How cancellations and refunds work for Inflero Pro.",
    ar: "كيف يعمل الإلغاء والاسترداد لاشتراك إنفليرو Pro.",
  },
  sections: [
    {
      heading: { en: "Cancelling your subscription", ar: "إلغاء اشتراكك" },
      paragraphs: [
        {
          en: "You can cancel anytime from Settings → Manage billing, which opens the LemonSqueezy customer portal. Your Pro access continues until the end of the current billing period, and you won't be charged again.",
          ar: "يمكنك الإلغاء في أي وقت من الإعدادات ← إدارة الفوترة، وهو ما يفتح بوابة العملاء الخاصة بـ LemonSqueezy. ويستمر وصولك إلى Pro حتى نهاية فترة الفوترة الحالية، ولن تُحصَّل منك أي رسوم بعد ذلك.",
        },
      ],
    },
    {
      heading: { en: "Refunds", ar: "المبالغ المستردّة" },
      paragraphs: [
        {
          en: "Payments are processed by LemonSqueezy as our Merchant of Record. We don't automatically refund partial or unused periods after a renewal.",
          ar: "تُعالَج المدفوعات عبر LemonSqueezy بصفته البائع المسجّل لدينا. ولا نقوم تلقائيًا باسترداد قيمة الفترات الجزئية أو غير المستخدَمة بعد التجديد.",
        },
        {
          en: `If you were charged in error or have a special circumstance, email us at ${SUPPORT_EMAIL} within 14 days of the charge and we'll review your request.`,
          ar: `إذا حُصِّلت منك رسوم عن طريق الخطأ أو كان لديك ظرف خاص، فراسلنا على ${SUPPORT_EMAIL} خلال 14 يومًا من تاريخ الخصم وسنراجع طلبك.`,
        },
      ],
    },
    {
      heading: { en: "After cancellation", ar: "بعد الإلغاء" },
      paragraphs: [
        {
          en: "When your Pro access ends you return to the Free plan and keep your data. You can also delete your account entirely from Settings → Delete account.",
          ar: "عند انتهاء وصولك إلى Pro تعود إلى الخطة المجانية وتحتفظ ببياناتك. ويمكنك أيضًا حذف حسابك بالكامل من الإعدادات ← حذف الحساب.",
        },
      ],
    },
    {
      heading: { en: "Contact", ar: "التواصل" },
      paragraphs: [
        {
          en: `Questions about billing or refunds? Email ${SUPPORT_EMAIL}.`,
          ar: `لأي أسئلة حول الفوترة أو الاسترداد، راسلنا على ${SUPPORT_EMAIL}.`,
        },
      ],
    },
  ],
};
