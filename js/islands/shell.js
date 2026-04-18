// Shell Island — App bootstrap.
// Critical path: hydrate all islands immediately.
// Everything else defers to idle time so it never blocks first paint.

import { hydrateIslands } from "weblisk/core/hydrate.js";
hydrateIslands();

// Deferred: security, a11y, perf, PWA, navigation.
// Loaded after first paint via requestIdleCallback (or setTimeout fallback).
const whenIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

whenIdle(async () => {
  // Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  const { effect } = await import("weblisk");
  const { theme } = await import("../state.js");

  // Security
  const { applyCSP } = await import("weblisk/security/csp.js");
  const { applyPermissionsPolicy } =
    await import("weblisk/security/permissions.js");
  applyCSP({
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.weblisk.dev", "https://static.cloudflareinsights.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://cdn.weblisk.dev"],
    "font-src": ["'self'", "https://cdn.weblisk.dev"],
    "connect-src": ["'self'", "https://cdn.weblisk.dev", "https://static.cloudflareinsights.com", "wss:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  });
  applyPermissionsPolicy();

  // Accessibility
  const { announce } = await import("weblisk/a11y/aria.js");
  const { skipLink } = await import("weblisk/a11y/focus.js");
  const { injectReducedMotionCSS } = await import("weblisk/a11y/motion.js");
  skipLink("main-content");
  injectReducedMotionCSS();
  announce(`Navigated to ${document.title}`);

  // Performance
  const { mark } = await import("weblisk/perf/marks.js");
  const { reporter } = await import("weblisk/perf/reporter.js");
  mark("shell:hydrate");
  reporter({ endpoint: "/api/perf", sampleRate: 1 });

  // PWA theme color sync
  const { setThemeColor } = await import("weblisk/pwa/manifest.js");

  // Navigation
  const { installScroll } = await import("weblisk/nav/scroll.js");
  installScroll({ offset: 60 });

  // Theme color sync
  effect(() => {
    setThemeColor(theme() === "dark" ? "#1a1a2e" : "#ffffff");
  });

  // Copy-to-clipboard for code blocks and install commands
  const { writeText } = await import("weblisk/ui/clipboard.js");
  document.addEventListener("click", (e) => {
    const copyBtn = e.target.closest("[data-copy], [data-copy-target]");
    if (!copyBtn) return;
    const text =
      copyBtn.dataset.copy ||
      document.getElementById(copyBtn.dataset.copyTarget)?.textContent;
    if (!text) return;
    writeText(text.trim()).then((ok) => {
      if (!ok) return;
      const icon = copyBtn.querySelector(".wl-icon");
      if (icon) {
        icon.classList.replace("wl-i-copy", "wl-i-check");
        setTimeout(
          () => icon.classList.replace("wl-i-check", "wl-i-copy"),
          1500,
        );
      }
    });
  });

  mark("shell:ready");
});

// Version badge: fetch latest from CDN.
// Updates .version-badge elements with the released version.
// Falls back to the hardcoded value in the HTML if the fetch fails.
whenIdle(async () => {
  try {
    const { app } = await import("../config.js");
    const res = await fetch(`${app.cdn}/version.json`);
    if (!res.ok) return;
    const { version } = await res.json();
    if (!version) return;
    app.version = version;
    document.querySelectorAll(".version-badge").forEach((el) => {
      el.textContent = `v${version}`;
    });
  } catch {}
});
