// Islands Island — Interactive demos for lazy islands and error boundaries.
import { signal, effect, enhance } from "weblisk";
import { lazyEnhance } from "weblisk/core/lazy-island.js";
import { boundary } from "weblisk/core/error.js";

// ─── Lazy Islands demo ───
lazyEnhance(
  "#lazy-target",
  () => {
    const el = document.getElementById("lazy-target");
    el.style.borderColor = "var(--success, green)";
    el.style.borderStyle = "solid";
    el.innerHTML =
      "<strong>Lazy island loaded!</strong> (IntersectionObserver triggered)";
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
          '<div style="color:var(--danger)"><strong>Error caught by boundary!</strong> The app keeps running.</div>',
        retry: false,
        onError: (err) => console.log("[error.js] Caught:", err.message),
      },
    );
  });
});
