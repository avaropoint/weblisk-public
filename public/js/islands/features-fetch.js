// Fetch Island — Interactive demo for enhanced fetch.
import { enhance } from "weblisk";
import { fetchJSON, fetchOffline } from "weblisk/net/fetch.js";

// ─── Enhanced Fetch ───
enhance("#demo-fetch", (el, { $ }) => {
  const output = $("#output-fetch");
  const btnFetch = $("#btn-fetch");
  const btnOffline = $("#btn-fetch-offline");

  btnFetch.addEventListener("click", async () => {
    output.textContent = "Fetching...";
    try {
      const data = await fetchJSON(
        "https://jsonplaceholder.typicode.com/posts?_limit=5",
        { timeout: 5000 },
      );
      output.textContent = `Loaded ${data.length} posts:\n${data.map((p) => p.title).join("\n")}`;
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    }
  });

  btnOffline.addEventListener("click", async () => {
    try {
      const result = await fetchOffline("/api/analytics", {
        method: "POST",
        body: JSON.stringify({ event: "demo", timestamp: Date.now() }),
      });
      output.textContent = result.queued
        ? "Request queued for when back online"
        : `Sent (status ${result.status})`;
    } catch (err) {
      output.textContent = `Queued: ${err.message}`;
    }
  });
});
