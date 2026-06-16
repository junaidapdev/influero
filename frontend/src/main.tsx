import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

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
