import type { LegalDoc } from "@/features/legal/legalDoc";
import { SUPPORT_EMAIL } from "@/constants/support";

// ⚠️ DRAFT — plain-language starting point, not legal advice. Have a lawyer review
// before launch (consumer / e-commerce law + the LemonSqueezy Merchant-of-Record terms).
export const TERMS_DOC: LegalDoc = {
  title: { en: "Terms of Service", ar: "شروط الخدمة" },
  updated: "2026-06-24",
  intro: {
    en: "These Terms govern your use of Influero. By creating an account or using the service, you agree to them.",
    ar: "تحكم هذه الشروط استخدامك لإنفليرو. وبإنشاء حساب أو استخدام الخدمة، فإنك توافق عليها.",
  },
  sections: [
    {
      heading: { en: "The service", ar: "الخدمة" },
      paragraphs: [
        {
          en: "Influero is a workspace for influencers to manage brand deals, deliverables, payments, meetings, reminders, expenses, and Snapchat analytics.",
          ar: "إنفليرو مساحة عمل لصنّاع المحتوى لإدارة صفقات العلامات التجارية والمُخرجات والمدفوعات والاجتماعات والتذكيرات والمصروفات وتحليلات سناب شات.",
        },
      ],
    },
    {
      heading: { en: "Your account", ar: "حسابك" },
      paragraphs: [
        {
          en: "You are responsible for your account and for providing accurate information. Keep your login credentials secure; you are responsible for activity under your account.",
          ar: "أنت مسؤول عن حسابك وعن تقديم معلومات دقيقة. حافظ على سرّية بيانات تسجيل دخولك؛ وأنت مسؤول عن النشاط الذي يتم عبر حسابك.",
        },
      ],
    },
    {
      heading: { en: "Acceptable use", ar: "الاستخدام المقبول" },
      paragraphs: [
        {
          en: "Don't use Influero for any unlawful purpose, and don't attempt to disrupt, abuse, or gain unauthorized access to the service or other users' data.",
          ar: "لا تستخدم إنفليرو لأي غرض غير قانوني، ولا تحاول تعطيل الخدمة أو إساءة استخدامها أو الوصول غير المصرّح به إليها أو إلى بيانات المستخدمين الآخرين.",
        },
      ],
    },
    {
      heading: { en: "Subscriptions and billing", ar: "الاشتراكات والفوترة" },
      paragraphs: [
        {
          en: "Influero Pro costs USD $14 per month. Payments are processed by LemonSqueezy, our Merchant of Record, which handles billing, invoicing, and applicable taxes (including Saudi VAT). Your subscription renews monthly until you cancel it. See our Refund & Cancellation Policy for details.",
          ar: "تبلغ تكلفة إنفليرو Pro ١٤ دولارًا أمريكيًا شهريًا. تُعالَج المدفوعات عبر LemonSqueezy، البائع المسجّل لدينا، الذي يتولّى الفوترة وإصدار الفواتير والضرائب المطبّقة (بما في ذلك ضريبة القيمة المضافة السعودية). يتجدّد اشتراكك شهريًا حتى تقوم بإلغائه. راجع سياسة الاسترداد والإلغاء لمزيد من التفاصيل.",
        },
      ],
    },
    {
      heading: { en: "Your content", ar: "المحتوى الخاص بك" },
      paragraphs: [
        {
          en: "You own the data you enter and the screenshots you upload. You grant us permission to process them solely to provide the service — including sending uploaded screenshots to our AI provider to extract metrics. AI-extracted figures may be imperfect; you can always review and edit them.",
          ar: "أنت تملك البيانات التي تُدخلها واللقطات التي ترفعها. وتمنحنا الإذن بمعالجتها فقط لتقديم الخدمة — بما في ذلك إرسال اللقطات المرفوعة إلى مزوّد الذكاء الاصطناعي لاستخراج المقاييس. وقد تكون الأرقام المستخرَجة بالذكاء الاصطناعي غير دقيقة تمامًا؛ ويمكنك دائمًا مراجعتها وتعديلها.",
        },
      ],
    },
    {
      heading: { en: "Availability and disclaimer", ar: "التوفّر وإخلاء المسؤولية" },
      paragraphs: [
        {
          en: 'The service is provided "as is" and "as available," without warranties of any kind. We don\'t guarantee that it will be uninterrupted, error-free, or that AI extraction will be accurate.',
          ar: "تُقدَّم الخدمة «كما هي» و«حسب توفّرها» دون أي ضمانات من أي نوع. ولا نضمن أن تكون متواصلة دون انقطاع أو خالية من الأخطاء، ولا أن يكون الاستخراج بالذكاء الاصطناعي دقيقًا.",
        },
      ],
    },
    {
      heading: { en: "Limitation of liability", ar: "تحديد المسؤولية" },
      paragraphs: [
        {
          en: "To the maximum extent permitted by law, Influero is not liable for any indirect, incidental, or consequential damages arising from your use of the service.",
          ar: "إلى أقصى حد يسمح به القانون، لا يتحمّل إنفليرو المسؤولية عن أي أضرار غير مباشرة أو عرَضية أو تبعية تنشأ عن استخدامك للخدمة.",
        },
      ],
    },
    {
      heading: { en: "Termination", ar: "إنهاء الخدمة" },
      paragraphs: [
        {
          en: "You can delete your account at any time from Settings → Delete account. We may suspend or terminate accounts that violate these Terms.",
          ar: "يمكنك حذف حسابك في أي وقت من الإعدادات ← حذف الحساب. ويجوز لنا تعليق أو إنهاء الحسابات التي تخالف هذه الشروط.",
        },
      ],
    },
    {
      heading: { en: "Governing law", ar: "القانون الحاكم" },
      paragraphs: [
        {
          en: "These Terms are governed by the laws of the Kingdom of Saudi Arabia.",
          ar: "تخضع هذه الشروط لأنظمة المملكة العربية السعودية.",
        },
      ],
    },
    {
      heading: { en: "Changes and contact", ar: "التغييرات والتواصل" },
      paragraphs: [
        {
          en: `We may update these Terms from time to time; continued use of Influero means you accept the updated Terms. Questions? Email ${SUPPORT_EMAIL}.`,
          ar: `قد نُحدّث هذه الشروط من وقت لآخر؛ ويعني استمرارك في استخدام إنفليرو قبولك للشروط المُحدّثة. لأي أسئلة، راسلنا على ${SUPPORT_EMAIL}.`,
        },
      ],
    },
  ],
};
