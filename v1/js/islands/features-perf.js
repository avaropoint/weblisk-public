// Performance Island — Interactive demos for performance modules.
import { signal, effect, enhance } from "weblisk";
import { mark, measure, time, getEntries } from "weblisk/perf/marks.js";
import { vitals } from "weblisk/perf/vitals.js";

// ─── Marks demo ───
enhance("#demo-marks", (el, { $ }) => {
  const output = $("#output-marks");
  const btn = $("#btn-marks");

  btn.addEventListener("click", async () => {
    const [result, duration] = await time("demo-task", async () => {
      await new Promise((r) => setTimeout(r, Math.random() * 200 + 50));
      return 42;
    });

    const entries = getEntries();
    output.textContent = `time('demo-task') completed:\n`;
    output.textContent += `  Result: ${result}\n`;
    output.textContent += `  Duration: ${duration.toFixed(2)}ms\n\n`;
    output.textContent += `Total wl: marks: ${entries.marks.length}\n`;
    output.textContent += `Total wl: measures: ${entries.measures.length}`;
  });
});

// ─── Vitals demo ───
enhance("#demo-vitals", (el, { $ }) => {
  const output = $("#output-vitals");
  const v = vitals();

  effect(() => {
    output.textContent = [
      `LCP:  ${Math.round(v.lcp())}ms`,
      `CLS:  ${v.cls().toFixed(4)}`,
      `FID:  ${Math.round(v.fid())}ms`,
      `INP:  ${Math.round(v.inp())}ms`,
      `FCP:  ${Math.round(v.fcp())}ms`,
      `TTFB: ${Math.round(v.ttfb())}ms`,
    ].join("\n");
  });
});
