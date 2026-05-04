// Pro Features Island — Interactive demos for Weblisk Pro modules.
import { enhance, effect } from "weblisk";
import { init as analyticsInit, track, timing } from "weblisk/pro/analytics.js";
import { experiment, convert } from "weblisk/pro/ab.js";
import { table, exportCSV } from "weblisk/pro/table.js";
import { bar, line, pie } from "weblisk/pro/chart.js";
import { enhance as formEnhance } from "weblisk/pro/form.js";
import { init as authInit, setToken, logout, user, authenticated } from "weblisk/pro/auth.js";
import { toast } from "weblisk/pro/toast.js";
import { tabs } from "weblisk/pro/tabs.js";
import { gCounter } from "weblisk/pro/crdt.js";

// ─── Sample data ───
const sampleData = [
  { name: "Alice Chen", role: "Senior Engineer", dept: "Engineering", status: "Active", score: 96 },
  { name: "Bob Martinez", role: "Product Designer", dept: "Design", status: "Active", score: 91 },
  { name: "Carol Williams", role: "Engineering Manager", dept: "Engineering", status: "Active", score: 88 },
  { name: "Dave Okafor", role: "Frontend Developer", dept: "Engineering", status: "Pending", score: 84 },
  { name: "Eve Johansson", role: "UX Researcher", dept: "Design", status: "Active", score: 79 },
  { name: "Frank Liu", role: "DevOps Engineer", dept: "Infrastructure", status: "Inactive", score: 72 },
  { name: "Grace Kim", role: "Data Analyst", dept: "Analytics", status: "Active", score: 93 },
  { name: "Henry Patel", role: "Backend Developer", dept: "Engineering", status: "Active", score: 87 },
  { name: "Iris Taylor", role: "QA Engineer", dept: "Engineering", status: "Pending", score: 81 },
  { name: "Jack Ross", role: "Product Manager", dept: "Product", status: "Active", score: 90 },
  { name: "Kaya Müller", role: "Technical Writer", dept: "Engineering", status: "Active", score: 76 },
  { name: "Leo Hernandez", role: "Security Engineer", dept: "Infrastructure", status: "Active", score: 94 },
  { name: "Maya Singh", role: "UI Designer", dept: "Design", status: "Inactive", score: 68 },
  { name: "Noah Brown", role: "SRE", dept: "Infrastructure", status: "Active", score: 85 },
  { name: "Olivia Zhang", role: "ML Engineer", dept: "Analytics", status: "Pending", score: 92 },
];

const chartData = [
  { label: "Jan", value: 30 },
  { label: "Feb", value: 45 },
  { label: "Mar", value: 28 },
  { label: "Apr", value: 62 },
  { label: "May", value: 55 },
  { label: "Jun", value: 73 },
];

// ─── Analytics demo ───
enhance("#demo-analytics", (el, { $ }) => {
  const output = $("#output-analytics");

  // Init with a dummy endpoint (demo only)
  analyticsInit("/api/analytics", { pageViews: false, flushInterval: 60000 });

  $("#btn-track-event").addEventListener("click", () => {
    track("demo_click", { button: "track-event", page: "pro-demos" });
    output.textContent = `✓ Event queued: "demo_click" at ${new Date().toLocaleTimeString()}`;
  });

  $("#btn-track-timing").addEventListener("click", () => {
    const ms = Math.round(Math.random() * 200 + 50);
    timing("api_latency", ms);
    output.textContent = `✓ Timing queued: "api_latency" = ${ms}ms`;
  });
});

// ─── A/B Testing demo ───
enhance("#demo-ab", (el, { $ }) => {
  const output = $("#output-ab");
  const variants = ["control", "blue-cta"];
  const exp = experiment("cta-color", variants);

  function renderVariants() {
    const current = exp.variant();
    el.querySelectorAll("[data-variant]").forEach((v) => {
      const label = v.querySelector(".ab-variant-label");
      v.classList.remove("ab-active", "ab-inactive");
      if (v.dataset.variant === current) {
        v.classList.add("ab-active");
        if (label) label.textContent = "Active";
      } else {
        v.classList.add("ab-inactive");
        if (label) label.textContent = "Inactive";
      }
    });
    output.textContent = `Assigned: "${current}" — persistent across page reloads via localStorage`;
  }

  renderVariants();

  $("#btn-ab-switch").addEventListener("click", () => {
    const current = exp.variant();
    const next = variants.find((v) => v !== current) || variants[0];
    localStorage.setItem("wl-ab-cta-color", next);
    // Force re-read by reloading the experiment
    location.reload();
  });
});

// ─── Data Table demo ───
enhance("#demo-table", (el, { $ }) => {
  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "role", label: "Role", sortable: true },
    { key: "dept", label: "Department", sortable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => {
        const badge = document.createElement("span");
        badge.className = `status-badge status-${val.toLowerCase()}`;
        badge.textContent = val;
        return badge;
      },
    },
    { key: "score", label: "Score", sortable: true },
  ];

  // Auto-render the table immediately
  const tbl = table("#table-target", { data: sampleData, columns, pageSize: 5 });

  // Show row count
  const count = $("#table-row-count");
  if (count) count.textContent = `${sampleData.length} records`;

  $("#btn-table-export").addEventListener("click", () => {
    exportCSV(sampleData, columns, "weblisk-demo.csv");
  });
});

// ─── Chart demo ───
enhance("#demo-chart", (el) => {
  const target = el.querySelector("#chart-target");
  const w = 400, h = 200;

  // Default: render bar chart
  bar("#chart-target", { data: chartData, width: w, height: h });

  el.querySelectorAll("[data-chart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.chart;
      target.innerHTML = "";
      if (type === "bar") bar("#chart-target", { data: chartData, width: w, height: h });
      else if (type === "line") line("#chart-target", { data: chartData, width: w, height: h });
      else if (type === "pie") pie("#chart-target", { data: chartData.slice(0, 4), size: 200 });
    });
  });
});

// ─── Form Validation demo ───
enhance("#demo-form", (el, { $ }) => {
  const output = $("#output-form");
  const { submitting, errors } = formEnhance("#pro-form", {
    format: "json",
    onSuccess: () => {
      output.textContent = "✓ Form submitted successfully!";
    },
    onError: (err) => {
      output.textContent = `✗ Error: ${err.message}`;
    },
  });

  effect(() => {
    const errs = errors();
    const keys = Object.keys(errs);
    if (keys.length > 0) {
      output.textContent = `Validation errors: ${keys.map((k) => `${k}: ${errs[k]}`).join(", ")}`;
    }
  });

  effect(() => {
    if (submitting()) output.textContent = "Submitting...";
  });
});

// ─── Auth demo ───
enhance("#demo-auth", (el, { $ }) => {
  const output = $("#output-auth");

  authInit({ storageKey: "wl-demo-token" });

  // Demo JWT (not real — for display purposes only)
  const demoPayload = { sub: "user_42", name: "Demo User", role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 };
  const demoToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9." + btoa(JSON.stringify(demoPayload)) + ".demo";

  effect(() => {
    const u = user();
    const auth = authenticated();
    if (auth && u) {
      output.textContent = `✓ Authenticated as: ${u.name} (role: ${u.role})\nExpires: ${new Date(u.exp * 1000).toLocaleTimeString()}`;
    } else {
      output.textContent = "Not authenticated.";
    }
  });

  $("#btn-auth-login").addEventListener("click", () => setToken(demoToken));
  $("#btn-auth-logout").addEventListener("click", () => {
    logout();
    localStorage.removeItem("wl-demo-token");
  });
});

// ─── Toast demo ───
enhance("#demo-toast", (el) => {
  el.querySelectorAll("[data-toast]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.toast;
      const messages = {
        info: "This is an informational toast.",
        success: "Operation completed successfully!",
        warning: "Check your input before continuing.",
        error: "Something went wrong. Please try again.",
      };
      toast(messages[type], { type, duration: 3000, position: "bottom-right" });
    });
  });
});

// ─── Tabs demo ───
enhance("#demo-tabs", () => {
  tabs("[data-tabs]", {
    defaultIndex: 0,
    onChange: (i) => console.log("[tabs.js] Switched to tab", i),
  });
});

// ─── CRDT demo ───
enhance("#demo-crdt", (el, { $ }) => {
  const output = $("#output-crdt");

  // Two independent nodes
  const nodeA = gCounter("node-A");
  const nodeB = gCounter("node-B");

  function render() {
    output.textContent = `Node A: ${nodeA.value()}  |  Node B: ${nodeB.value()}\n` +
      `Merged total: ${Math.max(nodeA.value(), nodeB.value())}`;
  }

  $("#btn-crdt-inc").addEventListener("click", () => {
    // Alternate between nodes
    if (Math.random() > 0.5) {
      nodeA.increment();
      output.textContent = `Node A incremented → ${nodeA.value()}\nNode B → ${nodeB.value()}`;
    } else {
      nodeB.increment();
      output.textContent = `Node A → ${nodeA.value()}\nNode B incremented → ${nodeB.value()}`;
    }
  });

  $("#btn-crdt-merge").addEventListener("click", () => {
    // Simulate syncing state between nodes
    nodeA.merge(nodeB.state());
    nodeB.merge(nodeA.state());
    output.textContent = `Merged! Both nodes now agree.\nNode A: ${nodeA.value()}  |  Node B: ${nodeB.value()}`;
  });
});
