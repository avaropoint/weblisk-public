// Networking Island — Interactive demos for networking modules.
import { signal, effect, enhance } from "weblisk";
import { fetchJSON, fetchOffline } from "weblisk/net/fetch.js";
import { socket } from "weblisk/net/ws.js";
import { stream, latest } from "weblisk/net/sse.js";
import { transport as createTransport } from "weblisk/net/transport.js";

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

// ─── WebSocket demo ───
enhance("#demo-ws", (el, { $ }) => {
  const output = $("#output-ws");
  const btn = $("#btn-ws");
  let conn = null;

  btn.addEventListener("click", () => {
    if (conn) {
      conn.close();
      conn = null;
    }
    output.textContent = "🔌 Connecting via socket()...\n";

    conn = socket("wss://echo.websocket.org", {
      reconnect: false,
      heartbeat: 0,
    });

    effect(() => {
      const s = conn.state();
      output.textContent = `🔌 socket('wss://echo.websocket.org')\n`;
      output.textContent += `State: ${s}\n`;
      const msgs = conn.messages();
      if (msgs.length) {
        output.textContent += `Messages: ${msgs.length}\n`;
        output.textContent += msgs
          .slice(-3)
          .map((m) => `  → ${JSON.stringify(m)}`)
          .join("\n");
      }
      if (s === "closed") {
        output.textContent += "\n\nReal socket() API used\n";
        output.textContent += "(No echo server available — closed as expected)";
      }
    });

    // Send a test message if connection opens
    setTimeout(() => {
      if (conn.state() === "open") {
        conn.send({ demo: true, from: "weblisk" });
      }
    }, 1000);
  });
});

// ─── SSE demo ───
enhance("#demo-sse", (el, { $ }) => {
  const output = $("#output-sse");
  const btn = $("#btn-sse");
  let conn = null;

  btn.addEventListener("click", () => {
    if (conn) {
      conn.close();
      conn = null;
    }
    output.textContent = "📡 Connecting via stream()...\n";

    // Use a public SSE endpoint or gracefully handle failure
    conn = stream("/api/events");
    const last = latest(conn.events);

    effect(() => {
      const s = conn.status();
      output.textContent = `📡 stream('/api/events')\n`;
      output.textContent += `Status: ${s}\n`;
      const evts = conn.events();
      if (evts.length) {
        output.textContent += `Events: ${evts.length}\n`;
        const recent = last();
        if (recent)
          output.textContent += `Latest: ${JSON.stringify(recent.data)}`;
      }
      if (s === "closed") {
        output.textContent += "\n\nReal stream() + latest() API used\n";
        output.textContent += "(No SSE endpoint — closed as expected)";
      }
    });
  });
});

// ─── Transport demo ───
enhance("#demo-transport", (el, { $ }) => {
  const output = $("#output-transport");
  const btn = $("#btn-transport");
  let conn = null;

  btn.addEventListener("click", () => {
    if (conn) {
      conn.close();
      conn = null;
    }

    const hasWT = typeof WebTransport !== "undefined";
    const hasWS = typeof WebSocket !== "undefined";

    output.textContent = "🔄 transport() — unified real-time API:\n\n";
    output.textContent += `  WebTransport (HTTP/3): ${hasWT ? "Available" : "Not available"}\n`;
    output.textContent += `  WebSocket fallback:    ${hasWS ? "Available" : "Not available"}\n\n`;
    output.textContent += "Connecting...\n";

    conn = createTransport("wss://echo.websocket.org", {
      reconnect: false,
      heartbeat: 0,
    });

    effect(() => {
      const s = conn.state();
      if (s === "open") {
        output.textContent += `\nState: ${s} — connection established!\n`;
        output.textContent += "  API: send(), on(), channel(name), close()\n";
        conn.send("hello from weblisk");
      }
      if (s === "closed") {
        output.textContent += `\nState: ${s}\n`;
        output.textContent += `\nReal transport() API used\n`;
        output.textContent += `Will use: ${hasWT ? "WebTransport" : hasWS ? "WebSocket" : "none"}`;
      }
    });
  });
});
