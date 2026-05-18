// Shell — Accessibility: screen-reader announce, skip-link, reduced motion.

export async function initA11y() {
  const { announce } = await import("weblisk/a11y/aria.js");
  const { skipLink } = await import("weblisk/a11y/focus.js");
  const { injectReducedMotionCSS } = await import("weblisk/a11y/motion.js");
  skipLink("main-content");
  injectReducedMotionCSS();
  announce(`Navigated to ${document.title}`);
}
