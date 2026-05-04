// Shell — Performance: marks + reporter.

export async function initPerf() {
  const { mark } = await import("weblisk/perf/marks.js");
  const { reporter } = await import("weblisk/perf/reporter.js");
  mark("shell:hydrate");
  reporter({ endpoint: "/api/perf", sampleRate: 1 });
  return mark;
}
