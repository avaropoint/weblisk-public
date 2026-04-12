// Transitions Island — Interactive demos for view transitions.
import { enhance } from "weblisk";

// ─── Navigate with transition ───
enhance("#demo-navigate", (el, { $ }) => {
  const btn = $("#btn-navigate");
  const output = $("#output-navigate");
  const panel = $("#navigate-panel");

  const pages = [
    { title: "Home", bg: "var(--wl-primary)", text: "Welcome to the homepage" },
    { title: "About", bg: "var(--wl-accent, #6b7bf7)", text: "Learn about our mission" },
    { title: "Blog", bg: "var(--success, #22c55e)", text: "Read the latest articles" },
  ];
  let current = 0;

  btn.addEventListener("click", async () => {
    current = (current + 1) % pages.length;
    const page = pages[current];

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        panel.style.background = page.bg;
        panel.querySelector("h4").textContent = page.title;
        panel.querySelector("p").textContent = page.text;
      });
      output.textContent = `✅ View Transition to "${page.title}" — native API used`;
      await transition.finished;
      output.textContent += "\n   Transition complete!";
    } else {
      panel.style.background = page.bg;
      panel.querySelector("h4").textContent = page.title;
      panel.querySelector("p").textContent = page.text;
      output.textContent = `⚠️ Navigated to "${page.title}" — fallback (no View Transitions API)`;
    }
  });
});

// ─── Shared element transition ───
enhance("#demo-shared", (el, { $ }) => {
  const output = $("#output-shared");
  const cards = el.querySelectorAll(".transition-card");
  const detail = $("#shared-detail");
  const detailTitle = detail.querySelector("h4");
  const detailDesc = detail.querySelector("p");
  const backBtn = $("#btn-back");

  const items = [
    { name: "Signals", desc: "Fine-grained reactivity — when a signal changes, only dependent code re-runs." },
    { name: "Islands", desc: "Hydrate only interactive parts of the page. The rest stays as static HTML." },
    { name: "Security", desc: "Built-in CSP, sanitisation, CSRF tokens, and Trusted Types support." },
  ];

  cards.forEach((card, i) => {
    card.style.viewTransitionName = `card-${i}`;
    card.addEventListener("click", () => {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          cards.forEach((c) => (c.hidden = true));
          detail.hidden = false;
          detail.style.viewTransitionName = `card-${i}`;
          detailTitle.textContent = items[i].name;
          detailDesc.textContent = items[i].desc;
        });
        output.textContent = `✅ Shared element transition for "${items[i].name}"`;
      } else {
        cards.forEach((c) => (c.hidden = true));
        detail.hidden = false;
        detailTitle.textContent = items[i].name;
        detailDesc.textContent = items[i].desc;
        output.textContent = `⚠️ Expanded "${items[i].name}" — fallback mode`;
      }
    });
  });

  backBtn.addEventListener("click", () => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        detail.hidden = true;
        detail.style.viewTransitionName = "";
        cards.forEach((c) => (c.hidden = false));
      });
      output.textContent = "↩️ Returned to card list with transition";
    } else {
      detail.hidden = true;
      cards.forEach((c) => (c.hidden = false));
      output.textContent = "↩️ Returned to card list";
    }
  });
});

// ─── Transition types ───
enhance("#demo-types", (el, { $ }) => {
  const output = $("#output-types");
  const stage = $("#types-stage");
  const buttons = el.querySelectorAll("[data-transition]");

  const colors = ["var(--wl-primary)", "var(--wl-accent, #6b7bf7)", "var(--success, #22c55e)", "var(--wl-warning, #f59e0b)"];
  let colorIdx = 0;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.transition;
      colorIdx = (colorIdx + 1) % colors.length;

      if (document.startViewTransition) {
        const transition = document.startViewTransition({
          update: () => {
            stage.style.background = colors[colorIdx];
            stage.textContent = type;
          },
          types: [type],
        });
        output.textContent = `✅ Transition type: "${type}" — applied`;
      } else {
        stage.style.background = colors[colorIdx];
        stage.textContent = type;
        output.textContent = `⚠️ Type "${type}" — View Transitions API not available`;
      }
    });
  });
});
