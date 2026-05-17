// Workers Island — Interactive demo for Web Workers.
import { enhance } from "weblisk";
import { offload } from "weblisk/core/worker.js";

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
    output.textContent = "Computing on Web Worker (main thread free)...";
    const start = performance.now();
    const result = await fib(40);
    const elapsed = (performance.now() - start).toFixed(1);
    output.textContent = `fib(40) = ${result}\nTime: ${elapsed}ms (on worker, not main thread)`;
  });
});
