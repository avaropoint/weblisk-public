// Routing Island — Interactive demos for client-side routing.
import { enhance } from "weblisk";

// ─── Route Guard demo ───
enhance("#demo-guard", (el, { $ }) => {
  const btn = $("#btn-navigate-guard");
  const toggle = $("#toggle-dirty");
  const output = $("#output-guard");
  const indicator = $("#dirty-indicator");
  let isDirty = false;

  toggle.addEventListener("change", () => {
    isDirty = toggle.checked;
    indicator.textContent = isDirty ? "Unsaved changes" : "No changes";
    indicator.style.color = isDirty ? "var(--wl-danger, #dc2626)" : "var(--wl-success, #047857)";
  });

  btn.addEventListener("click", () => {
    if (isDirty) {
      output.textContent = "🛑 Navigation blocked — beforeNavigate guard rejected.\n   \"You have unsaved changes!\"";
    } else {
      output.textContent = "Navigation allowed — guard passed.\n   Navigated to /dashboard";
    }
  });
});

// ─── Hash / Anchor routing demo ───
enhance("#demo-hash", (el, { $ }) => {
  const output = $("#output-hash");
  const sections = el.querySelectorAll("[data-section]");
  const links = el.querySelectorAll("[data-nav]");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.nav;

      // Highlight active link
      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      // Show target section
      sections.forEach((s) => {
        s.hidden = s.dataset.section !== target;
      });

      // Update hash without scrolling
      history.replaceState(null, "", `#${target}`);
      output.textContent = `Hash updated → #${target}\n   Section "${target}" now visible`;
    });
  });
});

// ─── Navigation API demo ───
enhance("#demo-navapi", (el, { $ }) => {
  const output = $("#output-navapi");
  const pathDisplay = $("#path-display");
  const backBtn = $("#btn-back-nav");
  const fwdBtn = $("#btn-fwd-nav");
  const routeBtns = el.querySelectorAll("[data-route]");

  const routes = {
    "/home": { title: "Home", color: "var(--wl-primary)" },
    "/about": { title: "About", color: "var(--wl-accent, #0b7d97)" },
    "/blog": { title: "Blog", color: "var(--wl-success, #047857)" },
  };

  const history = ["/home"];
  let historyIdx = 0;

  function renderRoute(path) {
    const route = routes[path];
    if (!route) return;
    pathDisplay.textContent = path;
    pathDisplay.style.background = route.color;
    backBtn.disabled = historyIdx <= 0;
    fwdBtn.disabled = historyIdx >= history.length - 1;
  }

  renderRoute("/home");

  routeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const path = btn.dataset.route;
      // Trim forward history
      history.length = historyIdx + 1;
      history.push(path);
      historyIdx = history.length - 1;
      renderRoute(path);

      if (window.navigation) {
        output.textContent = `navigation.navigate("${path}")\n   Navigation API is supported`;
      } else {
        output.textContent = `Navigated to "${path}"\n   Navigation API not available — using fallback`;
      }
    });
  });

  backBtn.addEventListener("click", () => {
    if (historyIdx > 0) {
      historyIdx--;
      const path = history[historyIdx];
      renderRoute(path);
      output.textContent = `↩️ Back to "${path}" (history index: ${historyIdx})`;
    }
  });

  fwdBtn.addEventListener("click", () => {
    if (historyIdx < history.length - 1) {
      historyIdx++;
      const path = history[historyIdx];
      renderRoute(path);
      output.textContent = `↪️ Forward to "${path}" (history index: ${historyIdx})`;
    }
  });
});
