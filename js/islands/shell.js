// Shell Island — App bootstrap.
// Critical path: hydrate islands immediately.
// Everything else defers to idle time so it never blocks first paint.

// ─── Critical: hydrate all islands on the page ───
import { hydrateIslands } from "weblisk/core/hydrate.js";
hydrateIslands();

// ─── Service Worker: register early so it's active for all features ───
// Registration is non-blocking (fire-and-forget). The SW installs/activates
// in the background while the page continues rendering.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// ─── Deferred: security, a11y, perf, PWA, navigation ───
// Loaded after first paint via requestIdleCallback (or setTimeout fallback).
const whenIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

whenIdle(async () => {
  const { effect } = await import("weblisk");
  const { theme } = await import("../state.js");

  // Security
  const { applyCSP } = await import("weblisk/security/csp.js");
  const { applyPermissionsPolicy } =
    await import("weblisk/security/permissions.js");
  applyCSP({
    "script-src": ["'self'", "'unsafe-inline'", "https://cdn.weblisk.dev"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "connect-src": ["'self'", "https:", "ws:", "wss:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'", "blob:"],
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

  // PWA
  const { manifest, injectManifest, setThemeColor } =
    await import("weblisk/pwa/manifest.js");
  injectManifest(
    manifest({
      name: "Weblisk Demo",
      short_name: "Weblisk",
      start_url: location.origin + "/",
      display: "standalone",
      theme_color: "#3B4F7C",
      background_color: "#ffffff",
    }),
  );

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

// ─── Version badge: fetch latest from CDN ───
// Runs after everything else. Updates .version-badge elements
// with the latest released version. Falls back to the hardcoded
// value baked into the HTML if the fetch fails.
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
