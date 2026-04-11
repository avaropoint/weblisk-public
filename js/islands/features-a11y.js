// Accessibility Island — Interactive demos for a11y modules.
import { signal, effect, enhance } from "weblisk";
import { announce } from "weblisk/a11y/aria.js";
import { focusTrap } from "weblisk/a11y/focus.js";
import { motionReduced } from "weblisk/a11y/motion.js";

// ─── Announce demo ───
enhance("#demo-announce", (el, { $ }) => {
  const output = $("#output-announce");
  const btn = $("#btn-announce");
  let count = 0;

  btn.addEventListener("click", () => {
    count++;
    const msg = `Announcement #${count}: Hello from Weblisk!`;
    announce(msg);
    output.textContent = `📢 Announced: "${msg}"\n(Check ARIA live region in Accessibility tree)`;
  });
});

// ─── Focus Trap demo ───
enhance("#demo-focus", (el, { $ }) => {
  const btn = $("#btn-focus-trap");
  const target = $("#focus-trap-target");
  const releaseBtn = $("#btn-focus-release");

  const trap = focusTrap(target);

  btn.addEventListener("click", () => {
    target.hidden = false;
    target.style.display = "flex";
    trap.activate();
  });

  releaseBtn.addEventListener("click", () => {
    trap.deactivate();
    target.style.display = "";
    target.hidden = true;
  });
});

// ─── Motion demo ───
enhance("#demo-motion", (el, { $ }) => {
  const output = $("#output-motion");

  effect(() => {
    const reduced = motionReduced();
    output.textContent = `prefers-reduced-motion: ${reduced ? "✅ REDUCE" : "❌ no-preference"}\n`;
    output.textContent += reduced
      ? "Animations are disabled/minimized"
      : "Animations running normally";
    output.textContent +=
      "\n\n(Toggle in System Preferences → Accessibility → Display)";
  });
});
