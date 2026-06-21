// Landing page markup — ported from the imported Claude Design project
// (landing.html body), injected via dangerouslySetInnerHTML in LandingPage.tsx so
// the design renders pixel-exact without a lossy hand JSX conversion. This is our
// own trusted static content (no user input), so there is no XSS surface.
//
// Edits vs. the design source:
//   • brand name "Influency" → "Influero"
//   • every CTA href "influency.html" → the app's auth routes (see below)
//   • removed the <template id="__bundler_thumbnail"> design-tool artifact
//   • removed the trailing <script> — that logic is ported into LandingPage.tsx
//   • FULL ARABIC: every translatable text node carries data-ar (the Arabic
//     string); English stays inline as the baseline and is cached into data-en
//     on first toggle. Mixed-content nodes (text + an icon/dot/svg/<br>) wrap
//     their text in a <span data-ar> so the toggle swaps text without destroying
//     the icon. Two-part headlines split lead/highlight spans that concatenate
//     into one RTL sentence. Values use Arabic-Indic numerals + ر.س (after the
//     number) + Arabic month names. Brand name "Influero" and plan names
//     (Starter/Pro/Studio) stay Latin in both languages, so they carry no data-ar.
//
// CTA href map: Get started / Start free / trial → /login?mode=signup ;
// Sign in / Live demo / Watch the demo → /login. Hash links
// (#features…) are native in-page anchors.

export const LANDING_HTML = `
<!-- ===================== NAV ===================== -->
<header class="nav">
  <div class="nav-in">
    <a class="brand" href="#top">
      <span class="mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></span>
      Influero
    </a>
    <nav class="nav-links">
      <a href="#features" data-ar="المزايا">Features</a>
      <a href="#how" data-ar="كيف يعمل">How it works</a>
      <a href="#pricing" data-ar="الأسعار">Pricing</a>
      <a href="/login" data-ar="تجربة حية">Live demo</a>
    </nav>
    <div class="nav-cta">
      <div class="lang-pill" role="group" aria-label="Language">
        <button class="on" data-lang="en">EN</button>
        <button data-lang="ar">عربي</button>
      </div>
      <a class="signin" href="/login" data-ar="تسجيل الدخول">Sign in</a>
      <a class="btn btn-primary btn-sm" href="/login?mode=signup" data-ar="ابدأ الآن">Get started</a>
    </div>
    <button class="burger" aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#211E30" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </div>
</header>

<!-- mobile drawer -->
<div class="drawer">
  <div class="drawer-panel">
    <a href="#features" data-ar="المزايا">Features</a>
    <a href="#how" data-ar="كيف يعمل">How it works</a>
    <a href="#pricing" data-ar="الأسعار">Pricing</a>
    <a href="/login" data-ar="تجربة حية">Live demo</a>
    <a class="btn btn-primary" href="/login?mode=signup" data-ar="ابدأ مجاناً">Get started free</a>
  </div>
</div>

<span id="top"></span>

<!-- ===================== HERO ===================== -->
<section class="hero">
  <div class="glow a"></div>
  <div class="glow b"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="eyebrow rv"><span class="dot"></span><span data-ar="لصنّاع المحتوى والمؤثرين"> For creators &amp; influencers</span></span>
      <h1 class="h-display rv"><span data-ar="أدِر تأثيرك مثل ">Run your influence like a </span><span class="grad-text" data-ar="مشروع تجاري.">business.</span></h1>
      <p class="lead rv" data-ar="مساحة عمل واحدة هادئة لكل صفقة علامة تجارية — تابِع المُخرجات، واحصل على مستحقاتك في وقتها، وحوّل لقطات سناب شات إلى تقارير أنيقة بالذكاء الاصطناعي. مصمّمة للعربية والإنجليزية.">One calm workspace for every brand deal — track deliverables, get paid on time, and turn your Snapchat screenshots into clean reports with AI. Built for Arabic and English.</p>
      <div class="hero-cta rv">
        <a class="btn btn-primary" href="/login?mode=signup"><span data-ar="ابدأ مجاناً">Start free</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>
    </div>

    <!-- hero phone + floating cards -->
    <div class="hero-stage rv">
      <div class="float float-1">
        <div class="u-row">
          <div class="av mint" style="width:34px;height:34px;border-radius:10px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></div>
          <div>
            <div style="font-size:11px;color:var(--ink-3);font-weight:700" data-ar="تم استلام الدفعة">Payment received</div>
            <div style="font-weight:800;font-size:14px;letter-spacing:-.02em" data-ar="٢٧٬٠٠٠ ر.س">SAR 27,000</div>
          </div>
        </div>
      </div>

      <div class="float float-2">
        <div class="ai-badge" style="margin:0 0 8px"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg><span data-ar="مُستخرَج بالذكاء الاصطناعي">AI extracted</span></div>
        <div style="font-weight:800;font-size:20px;letter-spacing:-.03em;color:var(--accent)" data-ar="١٨٤ ألف">184K</div>
        <div style="font-size:11px;color:var(--ink-3);font-weight:700" data-ar="مشاهدات سناب">Snap views</div>
      </div>

      <div class="float float-3">
        <div style="font-size:11px;color:var(--ink-3);font-weight:700;margin-bottom:7px" data-ar="مجموعة العيد · نمشي">Eid collection · Namshi</div>
        <div class="bar" style="width:130px"><i style="width:66%"></i></div>
        <div style="font-size:11px;color:var(--ink-2);font-weight:700;margin-top:6px" data-ar="٢ من ٣ مُخرجات">2 of 3 deliverables</div>
      </div>

      <div class="phone">
        <div class="notch"></div>
        <div class="screen">
          <div class="screen-pad">
            <!-- mini header -->
            <div class="mini-head">
              <div class="av violet" style="background:var(--grad);color:#fff;border-radius:13px;width:40px;height:40px">AA</div>
              <div style="flex:1">
                <div style="font-size:11px;color:var(--ink-3);font-weight:700" data-ar="مرحباً،">Hi,</div>
                <div style="font-size:16px;font-weight:800;letter-spacing:-.02em" data-ar="عمّار">Ammar</div>
              </div>
              <div class="av" style="background:var(--surface);box-shadow:0 0 0 1px var(--hair);color:var(--ink-2);width:34px;height:34px;border-radius:11px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            </div>
            <!-- gradient hero card -->
            <div class="mini-hero">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <span style="font-size:11px;font-weight:600;opacity:.9" data-ar="هذا الشهر">This Month</span>
                <span style="font-size:9.5px;font-weight:700;background:rgba(255,255,255,.18);padding:4px 9px;border-radius:99px" data-ar="يونيو ٢٠٢٦">June 2026</span>
              </div>
              <div style="display:flex;align-items:center;gap:13px">
                <svg class="ring" viewBox="0 0 62 62" style="transform:rotate(-90deg)">
                  <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="7"/>
                  <circle class="ring-fg" cx="31" cy="31" r="26" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="163" stroke-dashoffset="64"/>
                </svg>
                <div style="position:absolute;width:62px;height:62px;display:grid;place-items:center;pointer-events:none">
                  <div style="text-align:center"><div class="ring-txt" data-ar="٦١٪">61%</div><div style="font-size:7px;opacity:.85;font-weight:600" data-ar="محصّلة">collected</div></div>
                </div>
                <div style="flex:1;margin-inline-start:4px">
                  <div style="font-size:10.5px;opacity:.85;font-weight:600" data-ar="المفوتر">Invoiced</div>
                  <div style="font-size:22px;font-weight:800;letter-spacing:-.03em" data-ar="٢٢٠٬٥٠٠ ر.س">SAR 220,500</div>
                  <svg width="120" height="30" viewBox="0 0 120 30" style="margin-top:2px"><path d="M0 24 L20 18 L40 21 L60 9 L80 14 L100 6 L120 11" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="120" cy="11" r="3" fill="#fff"/></svg>
                </div>
              </div>
            </div>
            <!-- stat triplet -->
            <div class="stat3">
              <div class="card"><div class="cap" style="background:var(--paid)"></div><div class="v" data-ar="٨٩ ألف ر.س">SAR 89K</div><div class="l" data-ar="محصّلة">Collected</div></div>
              <div class="card"><div class="cap" style="background:var(--pending)"></div><div class="v" data-ar="٥٦ ألف ر.س">SAR 56K</div><div class="l" data-ar="مستحقّة">Outstanding</div></div>
              <div class="card"><div class="cap" style="background:var(--progress)"></div><div class="v" data-ar="٤">4</div><div class="l" data-ar="منشورة">Posted</div></div>
            </div>
            <!-- deal card -->
            <div style="font-size:13px;font-weight:800;margin:2px 2px 9px" data-ar="كل الصفقات">All Deals</div>
            <div class="card" style="margin-bottom:9px">
              <div class="u-row" style="margin-bottom:8px">
                <div class="av peach">ج</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-ar="إطلاق قائمة الصيف">Summer menu launch</div>
                </div>
              </div>
              <div class="u-row" style="margin-bottom:10px;gap:8px">
                <div style="flex:1;min-width:0;font-size:10.5px;color:var(--ink-3);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-ar="جاهز · قصتان · ريل واحد">Jahez · 2 stories · 1 reel</div>
                <span class="pill prog" style="flex:none"><span class="pdot"></span><span data-ar="قيد التنفيذ">In progress</span></span>
              </div>
              <div class="u-row" style="gap:9px">
                <div class="bar" style="flex:1"><i style="width:50%"></i></div>
                <span style="font-size:11px;font-weight:700;color:var(--ink-3)" data-ar="٢/٤">2/4</span>
                <span style="font-size:13px;font-weight:800;letter-spacing:-.02em" data-ar="٣٨ ألف ر.س">SAR 38K</span>
              </div>
            </div>
            <div class="card">
              <div class="u-row">
                <div class="av sky">ت</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:13px" data-ar="شرح الدفع بالتقسيط">Split-payment explainer</div>
                  <div style="font-size:11px;color:var(--ink-3);font-weight:600" data-ar="تمارا · ريل واحد">Tamara · 1 reel</div>
                </div>
                <span class="pill paid"><span class="pdot"></span><span data-ar="مدفوعة">Paid</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== FEATURES ===================== -->
<div id="features"></div>

<!-- Feature 1 — deals -->
<section class="feature">
  <div class="wrap feat-grid">
    <div class="feat-copy rv">
      <span class="eyebrow"><span class="dot"></span><span data-ar="الصفقات والمُخرجات"> Deals &amp; deliverables</span></span>
      <h2 class="h-sec" data-ar="لا تفقد أثر أي صفقة بعد اليوم.">Never lose track of a deal again.</h2>
      <p class="lead" data-ar="كل حملة في مكان واحد — المبلغ المتفق عليه، الموعد النهائي، وقائمة مهام قابلة للتأشير من قصص ومنشورات وريلز. تتحدّث الحالة تلقائياً كلما أنجزت مهمة.">Every campaign in one place — agreed amount, deadline, and a tappable checklist of stories, posts and reels. Status updates itself as you tick things off.</p>
      <ul class="feat-list">
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="حالة تلقائية: قيد الانتظار ← قيد التنفيذ ← منشورة ← مدفوعة">Auto status: pending → in progress → posted → paid</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تقدّم ومواعيد لكل مُخرَج على حدة">Per-deliverable progress and deadlines</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="ملاحظات وأكواد خصم وموجزات العلامة مرفقة">Notes, promo codes and brand briefs attached</span></li>
      </ul>
    </div>
    <div class="feat-art rv">
      <div class="art-panel">
        <div class="art-glow" style="background:#A98FFF;top:-40px;right:-40px"></div>
        <div style="position:relative;z-index:1">
          <div class="u-row" style="margin-bottom:16px">
            <div class="av peach" style="width:46px;height:46px;border-radius:14px;font-size:18px">ج</div>
            <div style="flex:1">
              <div style="font-weight:800;font-size:16px" data-ar="إطلاق قائمة الصيف">Summer menu launch</div>
              <div style="font-size:12.5px;color:var(--ink-3);font-weight:600" data-ar="جاهز · الموعد ١٢ يونيو">Jahez · deadline Jun 12</div>
            </div>
            <span class="pill prog"><span class="pdot"></span><span data-ar="قيد التنفيذ">In progress</span></span>
          </div>
          <div class="chk done"><span class="box on"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span class="ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg></span><span class="nm" data-ar="قصة">Story</span></div>
          <div class="chk done"><span class="box on"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span class="ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg></span><span class="nm" data-ar="قصة">Story</span></div>
          <div class="chk"><span class="box off"></span><span class="ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4l3 5 3-5"/></svg></span><span class="nm" data-ar="ريل">Reel</span><span style="margin-inline-start:auto;font-size:12px;font-weight:800;color:var(--accent)" data-ar="تحديد كمنشورة">Mark posted</span></div>
          <div class="chk" style="margin-bottom:0"><span class="box off"></span><span class="ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg></span><span class="nm" data-ar="قصة">Story</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Feature 2 — payments -->
<section class="feature rev">
  <div class="wrap feat-grid">
    <div class="feat-copy rv">
      <span class="eyebrow"><span class="dot"></span><span data-ar="المدفوعات"> Payments</span></span>
      <h2 class="h-sec" data-ar="احصل على مستحقاتك في وقتها، دائماً.">Get paid on time, every time.</h2>
      <p class="lead" data-ar="اعرف بالضبط ما المعلّق، وما المتأخّر، وما الذي وصل. نقرة واحدة لتأكيد الاستلام — أو أرسل تذكيراً لطيفاً قبل أن يفوت موعد الاستحقاق.">See exactly what's pending, what's overdue and what's landed. One tap to mark received — or send a polite reminder before the due date slips.</p>
      <ul class="feat-list">
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تتبّع الدُّفعات المقدّمة والأرصدة المتبقّية والأقساط">Advances, balances and installments tracked</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تنبيهات التأخّر تظهر على لوحة تحكّمك">Overdue alerts surface on your dashboard</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تذكيرات تلقائية وفق مهلة التذكير التي تحدّدها">Automated reminders with your reminder lead time</span></li>
      </ul>
    </div>
    <div class="feat-art rv">
      <div class="art-panel tint">
        <div style="position:relative;z-index:1">
          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--pending-soft);border-radius:14px;padding:13px 16px;margin-bottom:14px">
            <span style="font-size:13px;font-weight:700;color:var(--pending)" data-ar="إجمالي المعلّق">Total pending</span>
            <span style="font-size:18px;font-weight:800;letter-spacing:-.02em;color:var(--pending)" data-ar="٥٦٬٧٥٠ ر.س">SAR 56,750</span>
          </div>
          <div class="pay">
            <div class="av peach" style="width:38px;height:38px">ج</div>
            <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px" data-ar="دفعة مقدمة · جاهز">Advance · Jahez</div><div style="font-size:11px;color:var(--overdue);font-weight:700" data-ar="متأخّرة · متوقّعة ٧ يونيو">Overdue · expected Jun 7</div></div>
            <span class="amt" style="color:var(--overdue)" data-ar="١٩٬٠٠٠ ر.س">SAR 19,000</span>
          </div>
          <div class="pay">
            <div class="av mint" style="width:38px;height:38px">ن</div>
            <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px" data-ar="الرصيد · نعناع">Balance · Nana</div><div style="font-size:11px;color:var(--ink-3);font-weight:600" data-ar="متوقّعة ١١ يونيو">Expected Jun 11</div></div>
            <span class="amt" data-ar="٨٬٢٥٠ ر.س">SAR 8,250</span>
          </div>
          <div class="pay" style="margin-bottom:16px">
            <div class="av pink" style="width:38px;height:38px">ف</div>
            <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px" data-ar="دفعة مقدمة · فلاورد">Advance · Floward</div><div style="font-size:11px;color:var(--ink-3);font-weight:600" data-ar="متوقّعة ١٠ يونيو">Expected Jun 10</div></div>
            <span class="amt" data-ar="١٠٬٥٠٠ ر.س">SAR 10,500</span>
          </div>
          <div style="display:flex;justify-content:center"><span class="toast"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--paid)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg><span data-ar="تم إرسال تذكير إلى جاهز">Reminder sent to Jahez</span></span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Feature 3 — Snap analytics (hero feature) -->
<section class="feature">
  <div class="wrap feat-grid">
    <div class="feat-copy rv">
      <span class="eyebrow"><span class="dot"></span><span data-ar="تحليلات سناب شات"> Snapchat analytics</span></span>
      <h2 class="h-sec"><span data-ar="لقطات شاشة تدخل. ">Screenshots in. </span><span class="grad-text" data-ar="تقارير أنيقة تخرج.">Clean reports out.</span></h2>
      <p class="lead" data-ar="سناب شات لا يصدّر أرقامك — لذا نقرؤها بدلاً عنك. أضِف لقطة شاشة أو ملف PDF، ويستخرج الذكاء الاصطناعي المشاهدات والوصول وعدد لقطات الشاشة والتمريرات في تقرير قابل للتعديل، جاهز لمشاركته مع العلامة.">Snapchat won't export your numbers — so we read them for you. Drop in a screenshot or PDF and AI pulls views, reach, screenshots and swipe-ups into an editable report, ready to share with the brand.</p>
      <ul class="feat-list">
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="يقرأ شاشات الإحصاءات بالعربية والإنجليزية">Reads Arabic and English Insights screens</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="كل رقم قابل للتعديل قبل أن تؤكّده">Every number editable before you confirm</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="مرتبط مباشرةً بالصفقة التي يخصّها">Linked straight back to the deal it belongs to</span></li>
      </ul>
    </div>
    <div class="feat-art rv">
      <div class="art-panel">
        <div class="art-glow" style="background:#9F8BFA;bottom:-40px;left:-30px"></div>
        <div style="position:relative;z-index:1">
          <div class="upload-strip">
            <div class="u-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg></div>
            <div style="min-width:0;flex:1"><div style="font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Snap_Insights.png</div><div style="font-size:11.5px;color:var(--ink-3);font-weight:600" data-ar="تم الرفع · جارٍ قراءة الأرقام…">Uploaded · reading numbers…</div></div>
          </div>
          <div class="ai-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg><span data-ar="مُستخرَج بالذكاء الاصطناعي · أكّد الأرقام">AI extracted · confirm numbers</span></div>
          <div class="snap-stat">
            <div class="t full"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></span><span class="k" data-ar="المشاهدات">Views</span></div><div class="v" data-ar="١٨٤٬٢٠٠">184,200</div></div>
            <div class="t"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></svg></span><span class="k" data-ar="الوصول">Reach</span></div><div class="v" data-ar="١٤٢٬٨٠٠">142,800</div></div>
            <div class="t"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg></span><span class="k" data-ar="التمريرات">Swipe-ups</span></div><div class="v" data-ar="٩٬١٢٠">9,120</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Feature 4 — bilingual -->
<section class="feature rev">
  <div class="wrap feat-grid">
    <div class="feat-copy rv">
      <span class="eyebrow"><span class="dot"></span><span data-ar="العربية والإنجليزية"> Arabic &amp; English</span></span>
      <h2 class="h-sec" data-ar="ثنائي اللغة بالكامل، وبدعم عربي أصيل.">Fully bilingual, properly RTL.</h2>
      <p class="lead" data-ar="ليست ترجمة مُضافة على عجل — كل شاشة تنعكس للعربية، بأرقام عربية وتنسيق للريال وتواريخ متوافقة مع التقويم الهجري. بدّل اللغة وقتما شئت.">Not a translation bolted on — every screen mirrors for Arabic, with native numerals, SAR formatting and Hijri-friendly dates. Switch anytime.</p>
      <div style="display:flex;gap:10px;margin-top:24px">
        <div class="lang-pill" style="box-shadow:0 0 0 1px var(--hair);font-size:14px">
          <button class="on" data-lang="en">English</button>
          <button data-lang="ar">العربية</button>
        </div>
      </div>
    </div>
    <div class="feat-art rv">
      <div class="art-panel tint" id="bi-demo" dir="ltr">
        <div class="bi-cards" style="grid-template-columns:1fr;gap:12px">
          <div class="bi-card" style="box-shadow:var(--sh-sm)">
            <div class="u-row" style="margin-bottom:12px">
              <div class="av lav" style="width:44px;height:44px;border-radius:14px;font-size:17px" data-en="N" data-ar="ن">N</div>
              <div style="flex:1">
                <div style="font-weight:800;font-size:15px" data-en="Eid collection haul" data-ar="هول مجموعة العيد">Eid collection haul</div>
                <div style="font-size:12px;color:var(--ink-3);font-weight:600" data-en="Namshi · deadline Jun 19" data-ar="نمشي · الموعد ١٩ يونيو">Namshi · deadline Jun 19</div>
              </div>
              <span class="pill pending"><span class="pdot"></span><span data-en="Pending" data-ar="معلّق">Pending</span></span>
            </div>
            <div class="u-row" style="gap:10px;border-top:1px solid var(--hair-2);padding-top:12px">
              <div style="flex:1">
                <div style="font-size:11px;color:var(--ink-3);font-weight:700" data-en="Agreed amount" data-ar="المبلغ المتفق">Agreed amount</div>
                <div style="font-weight:800;font-size:17px;letter-spacing:-.02em" data-en="SAR 52,000" data-ar="٥٢٬٠٠٠ ر.س">SAR 52,000</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--ink-3);font-weight:700" data-en="Deliverables" data-ar="المُخرجات">Deliverables</div>
                <div style="font-weight:800;font-size:17px" data-en="3 items" data-ar="٣ عناصر">3 items</div>
              </div>
            </div>
          </div>
          <div class="bi-card" style="box-shadow:var(--sh-sm);display:flex;align-items:center;gap:12px">
            <div class="av mint" style="width:40px;height:40px"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13.5px" data-en="Payment received" data-ar="تم استلام الدفعة">Payment received</div>
              <div style="font-size:11.5px;color:var(--ink-3);font-weight:600" data-en="Tamara · 2 days ago" data-ar="تمارا · قبل يومين">Tamara · 2 days ago</div>
            </div>
            <span style="font-weight:800;font-size:15px;color:var(--paid)" data-en="SAR 27,000" data-ar="٢٧٬٠٠٠ ر.س">SAR 27,000</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Feature 5 — expenses & profit -->
<section class="feature">
  <div class="wrap feat-grid">
    <div class="feat-copy rv">
      <span class="eyebrow"><span class="dot"></span><span data-ar="المصروفات والأرباح"> Expenses &amp; profit</span></span>
      <h2 class="h-sec"><span data-ar="تابِع كل مصروف. ">Track every cost. </span><span class="grad-text" data-ar="واعرف ربحك الحقيقي.">Know your real profit.</span></h2>
      <p class="lead" data-ar="أن تتقاضى مستحقاتك نصف الصورة فقط. سجّل تكلفة كل حملة — إنتاج، تنقّل، معدّات، برامج — ويحوّل Influero الإيراد إلى الرقم الذي يهم فعلاً: صافي ربحك.">Getting paid is only half the picture. Log what each campaign costs you — production, travel, gear, software — and Influero turns revenue into the number that actually matters: your net profit.</p>
      <ul class="feat-list">
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="صنّف كل تكلفة — إنتاج، تنقّل، معدّات، برامج">Categorize every cost — production, travel, gear, software</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="اربط أي مصروف بالصفقة التي يخصّه">Link any expense to the deal it belongs to</span></li>
        <li><span class="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="صافي ربحك على لوحتك — الإيراد ناقص التكاليف">True net profit on your dashboard — revenue minus costs</span></li>
      </ul>
    </div>
    <div class="feat-art rv">
      <div class="art-panel">
        <div class="art-glow" style="background:#7FC9F5;top:-40px;right:-30px"></div>
        <div style="position:relative;z-index:1">
          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--paid-soft);border-radius:14px;padding:13px 16px;margin-bottom:14px">
            <span style="font-size:13px;font-weight:700;color:var(--paid)" data-ar="صافي الربح · يونيو">Net profit · June</span>
            <span style="font-size:18px;font-weight:800;letter-spacing:-.02em;color:var(--paid)" data-ar="٧٣٬٥٠٠ ر.س">SAR 73,500</span>
          </div>
          <div class="pay">
            <div class="av peach" style="width:38px;height:38px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div>
            <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px" data-ar="إنتاج فيديو">Video production</div><div style="font-size:11px;color:var(--ink-3);font-weight:600" data-ar="إطلاق الصيف · جاهز">Summer launch · Jahez</div></div>
            <span class="amt" data-ar="−١٢٬٠٠٠ ر.س">− SAR 12,000</span>
          </div>
          <div class="pay">
            <div class="av sky" style="width:38px;height:38px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></div>
            <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px" data-ar="تنقّل">Travel</div><div style="font-size:11px;color:var(--ink-3);font-weight:600" data-ar="تصوير الرياض">Riyadh shoot</div></div>
            <span class="amt" data-ar="−٣٬٢٠٠ ر.س">− SAR 3,200</span>
          </div>
          <div class="pay" style="margin-bottom:14px">
            <div class="av lav" style="width:38px;height:38px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
            <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px" data-ar="برامج المونتاج">Editing software</div><div style="font-size:11px;color:var(--ink-3);font-weight:600" data-ar="اشتراك شهري">Monthly subscription</div></div>
            <span class="amt" data-ar="−٣٠٠ ر.س">− SAR 300</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:11.5px;color:var(--ink-3);font-weight:600">
            <span data-ar="محصّلة ٨٩٬٠٠٠ ر.س">Collected SAR 89,000</span>
            <span>−</span>
            <span data-ar="مصروفات ١٥٬٥٠٠ ر.س">Expenses SAR 15,500</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== HOW IT WORKS ===================== -->
<section class="how" id="how">
  <div class="wrap">
    <div class="how-head rv">
      <span class="eyebrow"><span class="dot"></span><span data-ar="كيف يعمل"> How it works</span></span>
      <h2 class="h-sec" style="margin-top:18px" data-ar="من فوضى الرسائل إلى مساحة عمل واحدة منظّمة.">From inbox chaos to one clean workspace.</h2>
      <p class="lead" data-ar="جهّز كل شيء في دقائق. لا جداول، ولا رسائل ضائعة.">Set up in minutes. No spreadsheets, no lost DMs.</p>
    </div>
    <div class="steps">
      <div class="step rv">
        <div class="num" data-ar="١">1</div>
        <h3 data-ar="أضِف صفقاتك">Add your deals</h3>
        <p data-ar="سجّل كل تعاون مع علامة تجارية بمبلغه وموعده النهائي والمُخرجات المتفق عليها. أو ابدأ من علامة في دليلك.">Log each brand collaboration with its amount, deadline and the deliverables you agreed to. Or start from a brand in your directory.</p>
      </div>
      <div class="step rv">
        <div class="num" data-ar="٢">2</div>
        <h3 data-ar="تابِع واحصل على مستحقاتك">Track &amp; get paid</h3>
        <p data-ar="أشّر على القصص والريلز فور نشرها. أكّد استلام المدفوعات ودَع Influero يتابع المتأخّرة منها.">Tick off stories and reels as you post. Mark payments received and let Influero chase the ones that are running late.</p>
      </div>
      <div class="step rv">
        <div class="num" data-ar="٣">3</div>
        <h3 data-ar="شارِك النتائج">Share the results</h3>
        <p data-ar="أضِف لقطات سناب، ودَع الذكاء الاصطناعي يبني التقرير، وأرسل للعلامات أرقاماً أنيقة تكسبك الحملة التالية.">Drop in your Snap screenshots, let AI build the report, and send brands clean numbers that win you the next campaign.</p>
      </div>
    </div>
  </div>
</section>

<!-- ===================== PRICING ===================== -->
<section class="pricing" id="pricing">
  <div class="wrap">
    <div class="price-head rv">
      <span class="eyebrow"><span class="dot"></span><span data-ar="الأسعار"> Pricing</span></span>
      <h2 class="h-sec" style="margin-top:18px" data-ar="ابدأ مجاناً. وارتقِ حين يغطّي التطبيق تكلفته بنفسه.">Start free. Upgrade when it pays for itself.</h2>
      <p class="lead" data-ar="فاتورة واحدة تحصّلها تكفي لتغطية اشتراك سنة كاملة من Pro.">One chased invoice covers a year of Pro.</p>
    </div>
    <div class="plans">
      <div class="plan rv">
        <div class="pn">Starter</div>
        <div class="pd" data-ar="لصنّاع المحتوى الذين بدؤوا للتوّ في التنظيم.">For creators just getting organized.</div>
        <div class="pr"><span class="amt" data-ar="مجاني">Free</span></div>
        <ul>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="حتى ٥ صفقات نشطة">Up to 5 active deals</span></li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تتبّع المُخرجات والمدفوعات">Deliverables &amp; payment tracking</span></li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="العربية والإنجليزية">Arabic &amp; English</span></li>
        </ul>
        <a class="btn btn-ghost" href="/login?mode=signup" data-ar="ابدأ الآن">Get started</a>
      </div>
      <div class="plan feat rv">
        <span class="badge-top" data-ar="الأكثر شيوعاً">Most popular</span>
        <div class="pn">Pro</div>
        <div class="pd" data-ar="لصنّاع المحتوى المتفرّغين الذين يعتمدون على صفقات العلامات.">For full-time creators running on brand deals.</div>
        <div class="pr"><span class="amt" data-ar="٨٩ ر.س">SAR 89</span><span class="per" data-ar="/ شهرياً">/ month</span></div>
        <ul>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="صفقات وعلامات بلا حدود">Unlimited deals &amp; brands</span></li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="استخراج تقارير سناب بالذكاء الاصطناعي">AI Snap report extraction</span></li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تذكيرات مدفوعات تلقائية">Automated payment reminders</span></li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تقارير شهرية وحسب كل علامة">Monthly &amp; per-brand reports</span></li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span data-ar="تتبّع المصروفات وصافي الربح">Expense tracking &amp; net profit</span></li>
        </ul>
        <a class="btn btn-white" href="/login?mode=signup" data-ar="ابدأ الآن">Get started</a>
      </div>
    </div>
  </div>
</section>

<!-- ===================== FINAL CTA ===================== -->
<section class="cta">
  <div class="wrap rv">
    <div class="cta-card">
      <div class="cta-glow x"></div>
      <div class="cta-glow y"></div>
      <div style="position:relative;z-index:1">
        <h2><span data-ar="تأثيرك مشروع تجاري.">Your influence is a business.</span><br><span data-ar="أدِرْه كأي مشروع.">Run it like one.</span></h2>
        <p class="lead" data-ar="انضمّ إلى آلاف صنّاع المحتوى الذين توقّفوا عن التخمين وبدؤوا يتقاضون مستحقاتهم في وقتها.">Join thousands of creators who stopped guessing and started getting paid on time.</p>
        <div class="row">
          <a class="btn btn-white" href="/login?mode=signup"><span data-ar="ابدأ مجاناً">Start free</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          <a class="btn btn-light" href="/login" data-ar="استكشف العرض">Explore the demo</a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== FOOTER ===================== -->
<footer class="foot">
  <div class="wrap">
    <a class="brand" href="#top">
      <span class="mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></span>
      Influero
    </a>
    <p data-ar="مساحة العمل المتكاملة لصنّاع المحتوى والمؤثرين. تابِع الصفقات، واحصل على مستحقاتك، وأثبِت أثرك.">The all-in-one workspace for creators and influencers. Track deals, get paid, prove your impact.</p>
    <div class="foot-bot">
      <span data-ar="© ٢٠٢٦ Influero. جميع الحقوق محفوظة.">© 2026 Influero. All rights reserved.</span>
    </div>
  </div>
</footer>
`;
