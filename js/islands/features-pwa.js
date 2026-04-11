// PWA Island — Interactive demos for PWA modules.
import { signal, effect, enhance } from "weblisk";
import { online, syncStatus, pendingCount } from "weblisk/pwa/offline.js";
import { permission, requestPermission, notify } from "weblisk/pwa/push.js";

// ─── Manifest demo ───
enhance("#demo-pwa-manifest", (el, { $ }) => {
  const output = $("#output-manifest");
  const btn = $("#btn-manifest");

  btn.addEventListener("click", () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) {
      output.textContent = `✅ Manifest injected at:\n  ${link.href}\n\n(Generated at runtime by shell.js via pwa/manifest.js)`;
    } else {
      output.textContent = "❌ No manifest <link> found";
    }
  });
});

// ─── Offline + Sync Status demo ───
enhance("#demo-pwa-offline", (el, { $ }) => {
  const output = $("#output-offline");

  effect(() => {
    const isOnline = online();
    const status = syncStatus();
    const pending = pendingCount();
    output.textContent = `Network:  ${isOnline ? "🟢 Online" : "🔴 Offline"}\n`;
    output.textContent += `Sync:     ${status === "idle" ? "✅" : status === "syncing" ? "⏳" : "❌"} ${status}\n`;
    output.textContent += `Pending:  ${pending} mutation(s) in queue\n\n`;
    output.textContent += "Toggle network in DevTools → Network → Offline";
  });
});

// ─── Push demo ───
enhance("#demo-pwa-push", (el, { $ }) => {
  const output = $("#output-push");
  const btnPerm = $("#btn-push");
  const btnNotify = $("#btn-notify");

  effect(() => {
    output.textContent = `Permission: ${permission()}`;
  });

  btnPerm.addEventListener("click", async () => {
    const result = await requestPermission();
    output.textContent = `Permission: ${result}`;
  });

  btnNotify.addEventListener("click", async () => {
    if (permission() !== "granted") {
      output.textContent =
        '⚠️ Permission not granted — click "Request Permission" first';
      return;
    }
    try {
      const result = await notify("Weblisk Demo", {
        body: "This is a local notification from the Features page!",
        icon: "/images/favicon.svg",
      });
      output.textContent = `Permission: ${permission()}\n${result !== null ? "✅ Notification shown (Notification API)" : "✅ Notification shown (Service Worker)"}`;
    } catch (err) {
      output.textContent = `Permission: ${permission()}\n❌ Error: ${err.message}`;
    }
  });
});
