// Weblisk Gateway Worker — edge security boundary for weblisk.dev.
// Serves static files from R2, Blueprint API with KV caching,
// and routes to the website domain controller + orchestrator.
// See: architecture/gateway.md for the full specification.

import { log, newTraceId, jsonResponse, VERSION } from "./protocol.js";
import { handle as handleWebsite } from "./domains/website.js";
export { Orchestrator } from "./orchestrator.js";

const DEPLOY_VERSION = Date.now().toString(36);

// ─── MIME types ───

const MIME = {
  html: "text/html;charset=utf-8",
  css:  "text/css;charset=utf-8",
  js:   "application/javascript;charset=utf-8",
  mjs:  "application/javascript;charset=utf-8",
  json: "application/json;charset=utf-8",
  svg:  "image/svg+xml",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  ico:  "image/x-icon",
  webp: "image/webp",
  avif: "image/avif",
  woff2: "font/woff2",
  woff:  "font/woff",
  ttf:   "font/ttf",
  txt:  "text/plain;charset=utf-8",
  xml:  "application/xml",
  yaml: "text/yaml;charset=utf-8",
  yml:  "text/yaml;charset=utf-8",
  webmanifest: "application/manifest+json",
};

function mimeFor(key) {
  const ext = key.split(".").pop().toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

// ─── Security headers (per gateway spec) ───

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.weblisk.dev https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' https: ws: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function securityHeaders(headers, isHTML) {
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  headers.set("x-dns-prefetch-control", "off");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-origin");
  if (isHTML) {
    headers.set("content-security-policy", CSP);
    headers.set("x-permitted-cross-domain-policies", "none");
  }
}

// ─── Blueprint path validation ───

const BLUEPRINT_PREFIXES = ["pages/", "components/", "styles/"];

function isValidBlueprintPath(path) {
  if (!BLUEPRINT_PREFIXES.some((p) => path.startsWith(p))) return false;
  if (!path.endsWith(".yaml") && !path.endsWith(".yml")) return false;
  if (path.includes("..") || path.includes("//")) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  Gateway — main fetch handler
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const tid = request.headers.get("x-trace-id") || newTraceId();

    // ─── Path security (non-bypassable, runs before everything) ───
    if (/\/\.[a-z]/i.test(url.pathname)) {
      log("gateway", "block", { reason: "dotfile", path: url.pathname }, tid);
      return notFound(env);
    }
    if (url.pathname.includes("..")) {
      log("gateway", "block", { reason: "traversal", path: url.pathname }, tid);
      return new Response("Bad Request", {
        status: 400,
        headers: { "content-type": "text/plain" },
      });
    }

    // ─── API routes ───

    // Hub health — aggregates orchestrator + gateway + domain health
    if (url.pathname === "/api/health") {
      return hubHealth(env, tid);
    }

    // Orchestrator (Durable Object) — internal protocol endpoints
    if (url.pathname.startsWith("/v1/")) {
      return routeToOrchestrator(request, env, tid);
    }

    // Website domain controller — examples, generation
    if (url.pathname.startsWith("/api/examples")) {
      if (!["GET", "HEAD", "POST"].includes(request.method)) {
        return methodNotAllowed("GET, HEAD, POST");
      }
      return routeToDomain(handleWebsite, request, env, "/api/examples", tid);
    }

    // Performance telemetry (fire-and-forget from shell-perf.js)
    if (url.pathname === "/api/perf" && request.method === "POST") {
      log("gateway", "perf", {}, tid);
      return new Response(null, { status: 204 });
    }

    // ─── Static routes: GET and HEAD only ───
    if (request.method !== "GET" && request.method !== "HEAD") {
      return methodNotAllowed("GET, HEAD");
    }

    // Blueprint API
    if (url.pathname.startsWith("/api/blueprint/")) {
      return handleBlueprintAPI(url, request, env, ctx, tid);
    }

    // Static file serving from R2
    return handleStatic(url, request, env);
  },
};

// ═══════════════════════════════════════════════════════════════
//  Route handlers
// ═══════════════════════════════════════════════════════════════

async function routeToDomain(handler, request, env, prefix, tid) {
  const path = new URL(request.url).pathname.slice(prefix.length) || "/";
  const proxied = new Request(request, {
    headers: new Headers([...request.headers.entries(), ["x-trace-id", tid]]),
  });
  const response = await handler(proxied, env, path);
  const headers = new Headers(response.headers);
  securityHeaders(headers, false);
  return new Response(response.body, { status: response.status, headers });
}

async function routeToOrchestrator(request, env, tid) {
  if (!env.ORCHESTRATOR) {
    return jsonResponse({ error: "Orchestrator not configured" }, 503);
  }
  const id = env.ORCHESTRATOR.idFromName("main");
  const stub = env.ORCHESTRATOR.get(id);
  log("gateway", "orchestrator", { path: new URL(request.url).pathname }, tid);
  const response = await stub.fetch(request);
  const headers = new Headers(response.headers);
  securityHeaders(headers, false);
  return new Response(response.body, { status: response.status, headers });
}

async function hubHealth(env, tid) {
  const health = {
    name: "weblisk-public",
    status: "healthy",
    version: VERSION,
    gateway: { status: "healthy" },
    orchestrator: { status: "unknown" },
    domains: { website: { status: "healthy" } },
  };

  if (env.ORCHESTRATOR) {
    try {
      const id = env.ORCHESTRATOR.idFromName("main");
      const stub = env.ORCHESTRATOR.get(id);
      const res = await stub.fetch(new Request("https://internal/v1/health"));
      if (res.ok) {
        health.orchestrator = await res.json();
      }
    } catch {
      health.orchestrator.status = "unreachable";
      health.status = "degraded";
    }
  }

  return jsonResponse(health);
}

// ═══════════════════════════════════════════════════════════════
//  Blueprint API (with KV edge caching)
// ═══════════════════════════════════════════════════════════════

async function handleBlueprintAPI(url, request, env, ctx, tid) {
  const path = url.pathname.replace("/api/blueprint/", "");

  if (!isValidBlueprintPath(path)) {
    const headers = new Headers({ "content-type": "application/json" });
    securityHeaders(headers, false);
    return new Response(JSON.stringify({ error: "Invalid blueprint path" }), {
      status: 400, headers,
    });
  }

  const key = `blueprints/${path}`;

  // KV edge cache — fast reads
  let body;
  if (env.CACHE) {
    body = await env.CACHE.get(`bp:${path}`, "text");
  }

  if (!body) {
    const object = await env.SITE.get(key);
    if (!object) {
      const headers = new Headers({ "content-type": "application/json" });
      securityHeaders(headers, false);
      return new Response(JSON.stringify({ error: "Blueprint not found" }), {
        status: 404, headers,
      });
    }
    body = await object.text();
    if (env.CACHE) {
      const put = env.CACHE.put(`bp:${path}`, body, { expirationTtl: 600 });
      ctx ? ctx.waitUntil(put) : await put;
    }
  }

  const headers = new Headers();
  headers.set("content-type", "text/yaml;charset=utf-8");
  headers.set("cache-control", "public, max-age=300, s-maxage=600");
  securityHeaders(headers, false);

  if (request.method === "HEAD") {
    return new Response(null, { headers });
  }
  return new Response(body, { headers });
}

// ═══════════════════════════════════════════════════════════════
//  Static file serving (R2)
// ═══════════════════════════════════════════════════════════════

async function handleStatic(url, request, env) {
  let key = url.pathname.slice(1);

  if (key === "index.html") {
    return Response.redirect(url.origin + "/" + (url.search || ""), 301);
  }

  if (key === "" || key.endsWith("/")) {
    key += "index.html";
  }

  let object = await env.SITE.get(key);

  if (!object && !key.includes(".")) {
    object = await env.SITE.get(key + ".html");
    if (object) key += ".html";
  }

  if (!object) {
    return notFound(env);
  }

  return respond(object, key, request.method === "HEAD");
}

async function respond(object, key, headOnly) {
  const isHTML = key.endsWith(".html");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) {
    headers.set("content-type", mimeFor(key));
  }

  securityHeaders(headers, isHTML);
  headers.set(
    "cache-control",
    isHTML ? "public, max-age=60, s-maxage=300" : "public, max-age=31536000, immutable"
  );

  if (isHTML && !headOnly) {
    const html = await object.text();
    return new Response(injectVersion(html), { headers });
  }

  return new Response(headOnly ? null : object.body, { headers });
}

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

const VERSION_RE = /((?:href|src|data-island)\s*=\s*["'])(\/[^"']*\.(?:css|js))(\?v=[^"']*)?(?=["'])/g;

function injectVersion(html) {
  return html.replace(VERSION_RE, `$1$2?v=${DEPLOY_VERSION}`);
}

function methodNotAllowed(allow) {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow, "content-type": "text/plain" },
  });
}

async function notFound(env) {
  const page = await env.SITE.get("404.html");
  const headers = new Headers({ "content-type": "text/html;charset=utf-8" });
  securityHeaders(headers, true);
  headers.set("cache-control", "no-store");
  return new Response(page ? page.body : "Not Found", { status: 404, headers });
}
