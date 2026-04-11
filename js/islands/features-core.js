// Core Extension Island — Interactive demos for core extension modules.
import { signal, effect, enhance } from "weblisk";
import { lazyEnhance } from "weblisk/core/lazy-island.js";
import { boundary } from "weblisk/core/error.js";
import { offload } from "weblisk/core/worker.js";
import { scheduleTask, batchUpdates } from "weblisk/core/scheduler.js";

// ─── Lazy Islands demo ───
lazyEnhance(
  "#lazy-target",
  () => {
    const el = document.getElementById("lazy-target");
    el.style.borderColor = "var(--success, green)";
    el.style.borderStyle = "solid";
    el.innerHTML =
      "✅ &nbsp;<strong>Lazy island loaded!</strong> (IntersectionObserver triggered)";
    console.log(
      "[lazy-island.js] lazyEnhance fired — element entered viewport",
    );
    return Promise.resolve();
  },
  { rootMargin: "50px" },
);

// ─── Error Boundary demo ───
enhance("#demo-error", (el, { $ }) => {
  const btn = $("#btn-error");
  const target = $("#error-target");

  btn.addEventListener("click", () => {
    target.innerHTML = "";
    const throwingEl = document.createElement("div");
    throwingEl.id = "temp-error-demo";
    target.appendChild(throwingEl);

    boundary(
      "#temp-error-demo",
      () => {
        throw new Error("Intentional demo error!");
      },
      {
        fallback:
          '<div style="color:var(--danger)">🛡️ <strong>Error caught by boundary!</strong> The app keeps running.</div>',
        retry: false,
        onError: (err) => console.log("[error.js] Caught:", err.message),
      },
    );
  });
});

// ─── Web Worker demo ───
enhance("#demo-worker", (el, { $ }) => {
  const output = $("#output-worker");
  const btn = $("#btn-worker");

  const fib = offload(function (n) {
    function f(n) {
      return n <= 1 ? n : f(n - 1) + f(n - 2);
    }
    return f(n);
  });

  btn.addEventListener("click", async () => {
    output.textContent = "⏳ Computing on Web Worker (main thread free)...";
    const start = performance.now();
    const result = await fib(40);
    const elapsed = (performance.now() - start).toFixed(1);
    output.textContent = `✅ fib(40) = ${result}\nTime: ${elapsed}ms (on worker, not main thread)`;
  });
});

// ─── Scheduler demo ───
enhance("#demo-scheduler", (el, { $ }) => {
  const output = $("#output-scheduler");
  const btn = $("#btn-scheduler");

  btn.addEventListener("click", async () => {
    output.textContent = "Scheduling 3 tasks at different priorities...\n";
    const log = [];

    await Promise.all([
      scheduleTask(() => {
        log.push("🔴 background");
      }, "background"),
      scheduleTask(() => {
        log.push("🟡 user-visible");
      }, "user-visible"),
      scheduleTask(() => {
        log.push("🟢 user-blocking");
      }, "user-blocking"),
    ]);

    output.textContent += log.join("\n") + "\n\n✅ Tasks executed by priority";
  });
});
