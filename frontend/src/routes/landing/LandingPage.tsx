import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { LANDING_HTML } from "./markup";
import "./landing.css";
// The new Saudi Riyal symbol font (the Pro price renders ﷼ via `.icon-saudi_riyal`).
// Imported here so it ships in the lazy landing chunk, not the main app bundle.
import "@abdulrysr/saudi-riyal-new-symbol-font/style.css";

// Public marketing landing page. The design is a self-contained visual system
// (its own palette/type/animation) imported from Claude Design — so it is
// rendered verbatim from markup.ts and styled by the .lp-scoped landing.css,
// kept isolated from the token-driven app. The interactions that shipped as
// landing/script.js are ported here into one effect, scoped to the container ref
// (querySelectors never touch the rest of the document) with full teardown.
//
// dir="ltr" lang="en" is forced on the wrapper because the app defaults to
// Arabic RTL on <html>; the design is LTR English (its in-page EN/AR control
// flips the page text via data-en/data-ar).

const FONT_LINK_ID = "lp-fonts";
const LANG_KEY = "inflero.lp.lang";

// The two Google Fonts the design uses, injected on mount so they don't load on
// every in-app page (only the landing needs them). Idempotent via the id guard.
function ensureFonts(): void {
  if (document.getElementById(FONT_LINK_ID)) return;
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "anonymous";
  const sheet = document.createElement("link");
  sheet.id = FONT_LINK_ID;
  sheet.rel = "stylesheet";
  sheet.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;450;500;550;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";
  document.head.append(pre1, pre2, sheet);
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    ensureFonts();

    const root = rootRef.current;
    if (!root) return;

    // The injected CTAs are plain <a href="/login…"> anchors. Intercept clicks on
    // internal app paths and hand them to the router so it stays a client-side
    // hop (no full reload). Hash anchors (#features) and any external links fall
    // through to native behaviour.
    const onLinkClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
        e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement).closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      e.preventDefault();
      navigate(href);
    };
    root.addEventListener("click", onLinkClick);

    // Smooth in-page hash scrolling while the landing is mounted; restored after.
    const docEl = document.documentElement;
    const prevScrollBehavior = docEl.style.scrollBehavior;
    docEl.style.scrollBehavior = "smooth";

    const timeouts: number[] = [];

    // --- nav shadow on scroll ---
    const nav = root.querySelector(".nav");
    const onScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // --- mobile drawer ---
    const drawer = root.querySelector(".drawer");
    const burger = root.querySelector(".burger");
    const openDrawer = () => drawer?.classList.add("open");
    const onDrawerClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target === drawer || target.closest("a")) drawer?.classList.remove("open");
    };
    burger?.addEventListener("click", openDrawer);
    drawer?.addEventListener("click", onDrawerClick);

    // --- reveal on scroll: add .shown (permanent) + play .in once, then drop it ---
    const reveal = (el: Element, animate: boolean) => {
      if (el.classList.contains("shown")) return;
      el.classList.add("shown");
      if (animate) {
        el.classList.add("in");
        el.addEventListener("animationend", () => el.classList.remove("in"), {
          once: true,
        });
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target, true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    const revealEls = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    revealEls.forEach((el, i) => {
      el.style.animationDelay = Math.min(i % 4, 3) * 0.06 + "s";
      io.observe(el);
    });
    // Failsafe: reveal anything still hidden after load settles (no animation).
    timeouts.push(
      window.setTimeout(() => revealEls.forEach((el) => reveal(el, false)), 1200),
    );
    // Reveal whatever is already in view on first paint, with animation.
    const raf = requestAnimationFrame(() => {
      revealEls.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
          reveal(el, true);
        }
      });
    });

    // --- language toggle: flip the WHOLE page between English and Arabic ---
    // English is the inline baseline; every translatable node carries data-ar and
    // gets its English cached into data-en on first apply. Clicking the nav lang
    // pill switches the entire page + dir/lang/font,
    // and the choice persists across remounts (own key, independent of app i18n).
    const langBtns = Array.from(root.querySelectorAll<HTMLElement>("[data-lang]"));
    const applyLang = (lang: "en" | "ar") => {
      root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      root.setAttribute("lang", lang);
      langBtns.forEach((x) => x.classList.toggle("on", x.dataset.lang === lang));
      root.querySelectorAll<HTMLElement>("[data-ar]").forEach((el) => {
        if (el.dataset.en === undefined) el.dataset.en = el.textContent ?? "";
        const next = lang === "ar" ? el.dataset.ar : el.dataset.en;
        if (next !== undefined) el.textContent = next;
      });
    };
    const onLangClick = (e: Event) => {
      const lang = (e.currentTarget as HTMLElement).dataset.lang === "ar" ? "ar" : "en";
      applyLang(lang);
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch {
        // ignore storage failures (private mode etc.) — the toggle still works
      }
    };
    langBtns.forEach((b) => b.addEventListener("click", onLangClick));
    // Apply the persisted choice on mount — this first call also caches the
    // English baseline (data-en) for every translatable node.
    let storedLang: "en" | "ar" = "en";
    try {
      storedLang = localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en";
    } catch {
      // ignore — default to English
    }
    applyLang(storedLang);

    // --- animate the dashboard ring when the hero mounts ---
    const ring = root.querySelector<SVGGeometryElement>(".ring-fg");
    if (ring) {
      const len = ring.getTotalLength ? ring.getTotalLength() : 188;
      ring.style.strokeDasharray = String(len);
      ring.style.strokeDashoffset = String(len);
      timeouts.push(
        window.setTimeout(() => {
          ring.style.transition = "stroke-dashoffset 1.3s cubic-bezier(.22,1,.36,1)";
          ring.style.strokeDashoffset = String(len * (1 - 0.61));
        }, 400),
      );
    }

    return () => {
      root.removeEventListener("click", onLinkClick);
      window.removeEventListener("scroll", onScroll);
      burger?.removeEventListener("click", openDrawer);
      drawer?.removeEventListener("click", onDrawerClick);
      langBtns.forEach((b) => b.removeEventListener("click", onLangClick));
      io.disconnect();
      cancelAnimationFrame(raf);
      timeouts.forEach((t) => window.clearTimeout(t));
      docEl.style.scrollBehavior = prevScrollBehavior;
    };
  }, [navigate]);

  return (
    <div
      ref={rootRef}
      className="lp"
      dir="ltr"
      lang="en"
      dangerouslySetInnerHTML={{ __html: LANDING_HTML }}
    />
  );
}
