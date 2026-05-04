// Weblisk Gateway Worker — edge security boundary for weblisk.dev.
// Static site via R2, Blueprint API, and agent routing.
// See: architecture/gateway.md for the full specification.

import { handle as handleExamples } from "./agents/examples.js";

const DEPLOY_VERSION = Date.now().toString(36);

// ─── Structured logging (per platforms/cloudflare.md) ───
function log(component, action, detail, traceId) {
  console.log(JSON.stringify({
    component,
    action,
    ...detail,
    trace_id: traceId,
    timestamp: Date.now(),
  }));
}

function traceId() {
  return crypto.randomUUID();
}

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

// Allowed blueprint prefixes — prevents path traversal.
const BLUEPRINT_PREFIXES = ["pages/", "components/", "styles/"];

function isValidBlueprintPath(path) {
  // Must start with an allowed prefix and end with .yaml or .yml
  if (!BLUEPRINT_PREFIXES.some((p) => path.startsWith(p))) return false;
  if (!path.endsWith(".yaml") && !path.endsWith(".yml")) return false;
  // No path traversal
  if (path.includes("..") || path.includes("//")) return false;
  return true;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const tid = request.headers.get("x-trace-id") || traceId();

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

    // ─── Agent routing (accepts GET, HEAD, POST) ───
    if (url.pathname.startsWith("/api/examples")) {
      if (!["GET", "HEAD", "POST"].includes(request.method)) {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { allow: "GET, HEAD, POST", "content-type": "text/plain" },
        });
      }
      return routeToAgent(handleExamples, request, env, "/api/examples");
    }

    // ─── Static routes: GET and HEAD only ───
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, HEAD", "content-type": "text/plain" },
      });
    }

    // ─── Blueprint API ───
    // GET /api/blueprint/pages/home.yaml → returns YAML source
    if (url.pathname.startsWith("/api/blueprint/")) {
      return handleBlueprintAPI(url, request, env);
    }

    // ─── Static file serving ───
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
  },
};

async function handleBlueprintAPI(url, request, env) {
  const path = url.pathname.replace("/api/blueprint/", "");

  if (!isValidBlueprintPath(path)) {
    const headers = new Headers({ "content-type": "application/json" });
    securityHeaders(headers, false);
    return new Response(JSON.stringify({ error: "Invalid blueprint path" }), {
      status: 400,
      headers,
    });
  }

  // Blueprints stored in R2 under blueprints/ prefix
  const key = `blueprints/${path}`;

  // ─── KV edge cache (fast reads, avoids R2 round-trip) ───
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
        status: 404,
        headers,
      });
    }
    body = await object.text();
    // Write-through to KV (10 min TTL) — non-blocking
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
    const versioned = injectVersion(html);
    return new Response(versioned, { headers });
  }

  return new Response(headOnly ? null : object.body, { headers });
}

const VERSION_RE = /((?:href|src|data-island)\s*=\s*["'])(\/[^"']*\.(?:css|js))(\?v=[^"']*)?(?=["'])/g;

function injectVersion(html) {
  return html.replace(VERSION_RE, `$1$2?v=${DEPLOY_VERSION}`);
}

async function routeToAgent(handler, request, env, prefix) {
  const path = new URL(request.url).pathname.slice(prefix.length) || "/";
  const response = await handler(request, env, path);
  // Gateway applies security headers to all agent responses
  const headers = new Headers(response.headers);
  securityHeaders(headers, false);
  return new Response(response.body, { status: response.status, headers });
}

async function notFound(env) {
  const page = await env.SITE.get("404.html");
  const headers = new Headers({ "content-type": "text/html;charset=utf-8" });
  securityHeaders(headers, true);
  headers.set("cache-control", "no-store");
  return new Response(page ? page.body : "Not Found", { status: 404, headers });
}
