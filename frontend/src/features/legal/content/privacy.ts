import type { LegalDoc } from "@/features/legal/legalDoc";
import { SUPPORT_EMAIL } from "@/constants/support";

// ⚠️ DRAFT — plain-language starting point, not legal advice. Have a lawyer review
// before launch. Keep in sync with the actual sub-processors and data we collect.
export const PRIVACY_DOC: LegalDoc = {
  title: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
  updated: "2026-06-24",
  intro: {
    en: "This Privacy Policy explains what data Inflero collects, how we use it, and the choices you have. Inflero is a workspace that helps influencers manage brand deals, payments, meetings, expenses, and Snapchat analytics.",
    ar: "توضّح سياسة الخصوصية هذه البيانات التي يجمعها إنفليرو، وكيف نستخدمها، والخيارات المتاحة لك. إنفليرو مساحة عمل تساعد صنّاع المحتوى على إدارة صفقات العلامات التجارية والمدفوعات والاجتماعات والمصروفات وتحليلات سناب شات.",
  },
  sections: [
    {
      heading: { en: "Information we collect", ar: "المعلومات التي نجمعها" },
      paragraphs: [
        {
          en: "We collect the information you give us and a small amount of usage data:",
          ar: "نجمع المعلومات التي تزوّدنا بها بالإضافة إلى قدر محدود من بيانات الاستخدام:",
        },
      ],
      bullets: [
        {
          en: "Account details — your name, email address, and profile photo (from Google sign-in or email sign-up).",
          ar: "بيانات الحساب — اسمك وبريدك الإلكتروني وصورتك الشخصية (من تسجيل الدخول عبر Google أو التسجيل بالبريد الإلكتروني).",
        },
        {
          en: "Business data you enter — brands, deals, payments, expenses, meetings, and reminders.",
          ar: "بيانات العمل التي تُدخلها — العلامات التجارية والصفقات والمدفوعات والمصروفات والاجتماعات والتذكيرات.",
        },
        {
          en: "Content you upload — Snapchat Insights screenshots you submit for AI extraction.",
          ar: "المحتوى الذي ترفعه — لقطات شاشة إحصاءات سناب شات التي ترسلها للاستخراج بالذكاء الاصطناعي.",
        },
        {
          en: "Usage data — basic analytics and session activity that help us improve the product.",
          ar: "بيانات الاستخدام — تحليلات أساسية ونشاط الجلسة لمساعدتنا على تحسين المنتج.",
        },
      ],
    },
    {
      heading: { en: "How we use your information", ar: "كيف نستخدم معلوماتك" },
      paragraphs: [
        {
          en: "We use your information to provide and operate Inflero — to run your account, store and display your data, extract metrics from the screenshots you upload, process your subscription, and provide support.",
          ar: "نستخدم معلوماتك لتقديم وتشغيل إنفليرو — لإدارة حسابك وتخزين بياناتك وعرضها، واستخراج المقاييس من اللقطات التي ترفعها، ومعالجة اشتراكك، وتقديم الدعم.",
        },
      ],
    },
    {
      heading: { en: "Service providers we share data with", ar: "مزوّدو الخدمة الذين نشارك معهم البيانات" },
      paragraphs: [
        {
          en: "We rely on trusted providers to run the service. They process your data only to provide their part of Inflero:",
          ar: "نعتمد على مزوّدين موثوقين لتشغيل الخدمة. وهم يعالجون بياناتك فقط لتقديم الجزء الخاص بهم من إنفليرو:",
        },
      ],
      bullets: [
        {
          en: "Supabase — database, authentication, and file storage.",
          ar: "Supabase — قاعدة البيانات والمصادقة وتخزين الملفات.",
        },
        { en: "Vercel — application hosting.", ar: "Vercel — استضافة التطبيق." },
        {
          en: "OpenAI — the Snapchat screenshots you upload are sent to OpenAI to automatically extract performance metrics.",
          ar: "OpenAI — تُرسَل لقطات سناب شات التي ترفعها إلى OpenAI لاستخراج مقاييس الأداء تلقائيًا.",
        },
        {
          en: "LemonSqueezy — our payment provider and Merchant of Record for Pro subscriptions; it processes payments, invoicing, and applicable taxes.",
          ar: "LemonSqueezy — مزوّد الدفع لدينا والبائع المسجّل لاشتراكات Pro؛ يتولّى معالجة المدفوعات والفوترة والضرائب المطبّقة.",
        },
        {
          en: "Microsoft Clarity — product analytics and session insights.",
          ar: "Microsoft Clarity — تحليلات المنتج ورؤى الجلسات.",
        },
      ],
    },
    {
      heading: { en: "Data retention", ar: "الاحتفاظ بالبيانات" },
      paragraphs: [
        {
          en: "We keep your data for as long as your account is active. When you delete your account, your data is permanently erased (see below).",
          ar: "نحتفظ ببياناتك طوال فترة نشاط حسابك. وعند حذف حسابك، تُمحى بياناتك نهائيًا (انظر أدناه).",
        },
      ],
    },
    {
      heading: { en: "Your data and deleting your account", ar: "بياناتك وحذف حسابك" },
      paragraphs: [
        {
          en: "You can view and correct your data anytime inside the app. To permanently delete your account and all associated data, go to Settings → Delete account; this also cancels any active subscription.",
          ar: "يمكنك عرض بياناتك وتصحيحها في أي وقت داخل التطبيق. ولحذف حسابك وجميع البيانات المرتبطة به نهائيًا، انتقل إلى الإعدادات ← حذف الحساب؛ ويؤدي ذلك أيضًا إلى إلغاء أي اشتراك نشط.",
        },
        {
          en: `To request a copy of your data, email us at ${SUPPORT_EMAIL} and we'll help you export it.`,
          ar: `لطلب نسخة من بياناتك، راسلنا على ${SUPPORT_EMAIL} وسنساعدك في تصديرها.`,
        },
      ],
    },
    {
      heading: { en: "Cookies and analytics", ar: "ملفات تعريف الارتباط والتحليلات" },
      paragraphs: [
        {
          en: "We use Microsoft Clarity, which may set cookies and record session activity (such as clicks and page views) to help us understand how Inflero is used and improve it.",
          ar: "نستخدم Microsoft Clarity، الذي قد يضع ملفات تعريف ارتباط ويسجّل نشاط الجلسة (مثل النقرات ومشاهدات الصفحات) لمساعدتنا على فهم كيفية استخدام إنفليرو وتحسينه.",
        },
      ],
    },
    {
      heading: { en: "Children", ar: "الأطفال" },
      paragraphs: [
        {
          en: "Inflero is not intended for anyone under 18, and we do not knowingly collect data from children.",
          ar: "إنفليرو غير موجّه لمن هم دون 18 عامًا، ولا نجمع عن قصد بيانات من الأطفال.",
        },
      ],
    },
    {
      heading: { en: "Changes and contact", ar: "التغييرات والتواصل" },
      paragraphs: [
        {
          en: `We may update this policy from time to time; the "last updated" date above reflects the current version. Questions about your privacy? Email ${SUPPORT_EMAIL}.`,
          ar: `قد نُحدّث هذه السياسة من وقت لآخر؛ ويعكس تاريخ "آخر تحديث" أعلاه النسخة الحالية. لأي أسئلة حول خصوصيتك، راسلنا على ${SUPPORT_EMAIL}.`,
        },
      ],
    },
  ],
};
