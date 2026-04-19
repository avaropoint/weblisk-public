// Shell Island — App bootstrap.
// Critical path: hydrate all islands immediately.
// Everything else defers to idle time so it never blocks first paint.

import { hydrateIslands } from "weblisk/core/hydrate.js";
hydrateIslands();

// Deferred: security, a11y, perf, PWA, navigation, clipboard.
// Loaded after first paint via requestIdleCallback (or setTimeout fallback).
const whenIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

whenIdle(async () => {
  // Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  const { effect } = await import("weblisk");
  const { theme } = await import("../state.js");

  // Separated concerns — each loads its own framework modules
  const { initSecurity } = await import("./shell-security.js");
  const { initA11y } = await import("./shell-a11y.js");
  const { initPerf } = await import("./shell-perf.js");
  const { initClipboard } = await import("./shell-clipboard.js");

  initSecurity();
  initA11y();
  const mark = await initPerf();
  initClipboard();

  // PWA theme color sync
  const { setThemeColor } = await import("weblisk/pwa/manifest.js");

  // Navigation
  const { installScroll } = await import("weblisk/nav/scroll.js");
  installScroll({ offset: 60 });

  // Theme color sync
  effect(() => {
    setThemeColor(theme() === "dark" ? "#1a1a2e" : "#ffffff");
  });

  mark("shell:ready");
});

// Version badge (separate idle callback — low priority)
whenIdle(async () => {
  const { initVersion } = await import("./shell-version.js");
  initVersion();
});
