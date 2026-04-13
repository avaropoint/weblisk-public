// Components Island — Interactive demos for Weblisk components.
import { enhance } from "weblisk";

// ─── Counter component demo ───
enhance("#demo-counter", (el, { $ }) => {
  const output = $("#output-counter");
  const countEl = $("#counter-value");
  const incBtn = $("#btn-inc");
  const decBtn = $("#btn-dec");
  const resetBtn = $("#btn-reset");
  let count = 0;

  function render() {
    countEl.textContent = count;
    countEl.style.color = count > 0
      ? "var(--wl-success, #047857)"
      : count < 0
        ? "var(--wl-danger, #dc2626)"
        : "var(--wl-text)";
  }

  incBtn.addEventListener("click", () => {
    count++;
    render();
    output.textContent = `✅ component("wl-counter") → count = ${count}`;
  });

  decBtn.addEventListener("click", () => {
    count--;
    render();
    output.textContent = `✅ component("wl-counter") → count = ${count}`;
  });

  resetBtn.addEventListener("click", () => {
    count = 0;
    render();
    output.textContent = "↩️ Counter reset to 0";
  });
});

// ─── Live clock component demo ───
enhance("#demo-clock", (el, { $ }) => {
  const output = $("#output-clock");
  const display = $("#clock-display");
  const startBtn = $("#btn-start-clock");
  const stopBtn = $("#btn-stop-clock");
  let interval = null;

  function tick() {
    const now = new Date();
    display.textContent = now.toLocaleTimeString();
  }

  startBtn.addEventListener("click", () => {
    if (interval) return;
    tick();
    interval = setInterval(tick, 1000);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    output.textContent = "✅ Clock started — setup() registered setInterval\n   cleanup() will clear it on destroy";
  });

  stopBtn.addEventListener("click", () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    output.textContent = "🛑 Clock stopped — cleanup() called clearInterval";
  });

  // Cleanup on island disconnect
  return () => {
    if (interval) clearInterval(interval);
  };
});

// ─── Toggle switch component demo ───
enhance("#demo-toggle", (el, { $ }) => {
  const output = $("#output-toggle");
  const switches = el.querySelectorAll("[data-toggle]");
  const status = $("#toggle-status");

  const state = { wifi: true, bluetooth: false, darkMode: false };

  function renderStatus() {
    const lines = Object.entries(state)
      .map(([k, v]) => `${k}: ${v ? "ON" : "OFF"}`)
      .join("  •  ");
    status.textContent = lines;
  }

  renderStatus();

  switches.forEach((sw) => {
    const key = sw.dataset.toggle;
    const dot = sw.querySelector(".toggle-dot");

    // Set initial visual state
    if (state[key]) {
      sw.classList.add("on");
      sw.setAttribute("aria-checked", "true");
    }

    sw.addEventListener("click", () => {
      state[key] = !state[key];
      sw.classList.toggle("on", state[key]);
      sw.setAttribute("aria-checked", String(state[key]));
      renderStatus();
      output.textContent = `✅ props.onChange("${key}", ${state[key]})\n   Component re-rendered with new state`;
    });
  });
});
