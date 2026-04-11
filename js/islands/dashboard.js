// Dashboard Island — Chart rendering + data refresh
// Only loaded on /dashboard via <script type="module"> in the page content.
//
// Integrates: error boundary, worker offload, scheduler, IDB signals,
// web vitals, virtual-list, perf marks, reduced motion.

import { signal, effect, enhance } from "weblisk";
import { boundary } from "weblisk/core/error.js";
import { offload } from "weblisk/core/worker.js";
import { batchUpdates } from "weblisk/core/scheduler.js";
import { idbSignal } from "weblisk/state/idb.js";
import { vitals } from "weblisk/perf/vitals.js";
import { mark, time } from "weblisk/perf/marks.js";
import { virtualList } from "weblisk/ui/virtual-list.js";
import { motionReduced } from "weblisk/a11y/motion.js";

// ─── Chart data persisted to IndexedDB ───
const [chartData, setChartData, { ready: chartReady }] = idbSignal(
  "dashboard-chart",
  [
    { label: "Mon", value: 42 },
    { label: "Tue", value: 78 },
    { label: "Wed", value: 56 },
    { label: "Thu", value: 91 },
    { label: "Fri", value: 64 },
    { label: "Sat", value: 35 },
    { label: "Sun", value: 83 },
  ],
);

// ─── Offload random data generation to a Web Worker ───
const generateRandom = offload(function () {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((d) => ({
    label: d,
    value: Math.floor(Math.random() * 100) + 10,
  }));
});

// ─── Chart panel wrapped in error boundary ───
boundary(
  "#chart-panel",
  (panel, { $ }) => {
    const barsEl = $("#chart-bars");
    const labelsEl = $("#chart-labels");
    const refreshBtn = $("#chart-refresh");

    refreshBtn.addEventListener("click", async () => {
      mark("chart:refresh");
      const data = await generateRandom();
      setChartData(data);
    });

    effect(() => {
      const data = chartData();
      if (!Array.isArray(data) || data.length === 0) return;
      const max = Math.max(...data.map((d) => d.value));
      const useMotion = !motionReduced();

      // Batch DOM updates for performance
      batchUpdates(() => {
        barsEl.innerHTML = data
          .map((d) => {
            const pct = (d.value / max) * 100;
            return `<div class="bar" style="height:${pct}%;${useMotion ? "transition:height 0.3s ease" : ""}">
            <span class="bar-value">${d.value}</span>
          </div>`;
          })
          .join("");

        labelsEl.innerHTML = data
          .map((d) => `<span class="bar-label">${d.label}</span>`)
          .join("");
      });
    });
  },
  {
    fallback:
      '<p style="padding:1rem;color:var(--danger)">Chart failed to load. <button onclick="location.reload()">Retry</button></p>',
  },
);

// ─── Web Vitals fed into stat cards ───
const v = vitals();
effect(() => {
  const el = document.querySelector("#stat-lcp .stat-value");
  if (el) el.textContent = `${Math.round(v.lcp())}ms`;
});
effect(() => {
  const el = document.querySelector("#stat-cls .stat-value");
  if (el) el.textContent = v.cls().toFixed(3);
});
effect(() => {
  const el = document.querySelector("#stat-fcp .stat-value");
  if (el) el.textContent = `${Math.round(v.fcp())}ms`;
});
effect(() => {
  const el = document.querySelector("#stat-ttfb .stat-value");
  if (el) el.textContent = `${Math.round(v.ttfb())}ms`;
});

// ─── Virtual-scrolled activity feed (1000 items) ───
const activities = [
  { action: "New user signup", user: "alice@example.com", color: "green" },
  { action: "Dashboard viewed", user: "bob", color: "blue" },
  { action: "Settings updated", user: "carol", color: "yellow" },
  { action: "New user signup", user: "dave@example.com", color: "green" },
  { action: "Failed login", user: "unknown", color: "red" },
  { action: "File uploaded", user: "eve", color: "blue" },
  { action: "Password changed", user: "frank", color: "yellow" },
  { action: "API key created", user: "grace", color: "green" },
];

// Generate 1000 items from our templates
const [activityItems] = signal(
  Array.from({ length: 1000 }, (_, i) => {
    const tmpl = activities[i % activities.length];
    const mins = i + 1;
    return {
      ...tmpl,
      time: mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`,
    };
  }),
);

enhance("#activity-panel", (panel, { $ }) => {
  const list = $("#activity-list");
  if (!list) return;

  // Clear static content and set up virtual scrolling
  list.innerHTML = "";
  list.style.height = "300px";

  virtualList(list, {
    items: activityItems,
    itemHeight: 44,
    overscan: 10,
    render: (item) =>
      `<div class="activity-item" style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0.75rem;">
        <span class="activity-dot ${item.color}"></span>
        <span style="flex:1">${item.action} — <strong>${item.user}</strong></span>
        <time style="color:var(--text-muted);font-size:0.8rem">${item.time}</time>
      </div>`,
  });
});

mark("dashboard:ready");
