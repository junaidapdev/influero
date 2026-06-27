import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { App } from "@/App";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { UpgradeModalProvider } from "@/components/providers/UpgradeModalProvider";
import { logger } from "@/lib/logger";
import "@/lib/i18n"; // bootstraps i18next + sets initial <html lang/dir> before render
import "@/index.css";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("[main] Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SessionProvider>
            <ToastProvider>
              <UpgradeModalProvider>
                <App />
                <Analytics />
                <SpeedInsights />
              </UpgradeModalProvider>
            </ToastProvider>
          </SessionProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Recover from stale lazy-chunk loads. When a new deploy rotates the hashed
// asset filenames, a tab opened before that deploy 404s on the old chunk the
// next time it imports a lazy route; the SPA rewrite then serves index.html in
// its place, so the dynamic import fails and the route renders blank. Vite fires
// `vite:preloadError` for exactly this — reload once to pull the fresh assets.
// The timestamp guard stops a reload loop if the chunk is genuinely gone (two
// failures within 10s means reloading isn't helping, so stand down).
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const RELOAD_KEY = "vite-preload-reload-at";
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - lastReload < 10_000) {
    logger.error("main.preloadError", "stale chunk still missing after reload");
    return;
  }
  logger.warn("main.preloadError", "lazy chunk failed; reloading for fresh assets");
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

// Register the web-push service worker once the page has loaded. It enables PWA
// install eligibility and lets an already-subscribed device receive pushes; the
// worker caches nothing, so there is no stale-shell risk. The opt-in subscribe
// flow re-registers it on demand too — this is just the up-front pass.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      logger.error("main.serviceWorker", error);
    });
  });
}
