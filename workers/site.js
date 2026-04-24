// Weblisk static-site Worker — secure HTTP server backed by R2.
// All responses pass through securityHeaders() before reaching the client.

// Frozen at deploy time — every `wrangler deploy` yields a new value.
const DEPLOY_VERSION = Date.now().toString(36);

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
  webmanifest: "application/manifest+json",
};

function mimeFor(key) {
  const ext = key.split(".").pop().toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

// Security headers applied to every response.
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

// Request handler.
export default {
  async fetch(request, env) {
    // Only allow safe methods
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, HEAD", "content-type": "text/plain" },
      });
    }

    const url = new URL(request.url);
    let key = url.pathname.slice(1); // strip leading /

    // Redirect /index.html → / to match canonical URL
    if (key === "index.html") {
      return Response.redirect(url.origin + "/" + (url.search || ""), 301);
    }

    // Root or trailing slash → index.html
    if (key === "" || key.endsWith("/")) {
      key += "index.html";
    }

    // Resolve object from R2
    let object = await env.SITE.get(key);

    // Clean-URL fallback: /docs/signals → docs/signals.html
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

// Build response with security and cache headers.
async function respond(object, key, headOnly) {
  const isHTML = key.endsWith(".html");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) {
    headers.set("content-type", mimeFor(key));
  }

  // Security first
  securityHeaders(headers, isHTML);

  // Cache: HTML briefly, assets aggressively
  headers.set(
    "cache-control",
    isHTML ? "public, max-age=60, s-maxage=300" : "public, max-age=31536000, immutable"
  );

  // For HTML: inject deploy version on CSS/JS references so browsers
  // always fetch the latest assets after each deploy.
  if (isHTML && !headOnly) {
    const html = await object.text();
    const versioned = injectVersion(html);
    return new Response(versioned, { headers });
  }

  return new Response(headOnly ? null : object.body, { headers });
}

// Replace any existing ?v=… and append ?v=DEPLOY_VERSION to local CSS/JS refs.
// Matches href/src/data-island="/….css|.js" with optional existing ?v= param.
// Skips absolute URLs (https://) so CDN refs are untouched.
const VERSION_RE = /((?:href|src|data-island)\s*=\s*["'])(\/[^"']*\.(?:css|js))(\?v=[^"']*)?(?=["'])/g;

function injectVersion(html) {
  return html.replace(VERSION_RE, `$1$2?v=${DEPLOY_VERSION}`);
}

// 404 with full security headers.
async function notFound(env) {
  const page = await env.SITE.get("404.html");
  const headers = new Headers({ "content-type": "text/html;charset=utf-8" });
  securityHeaders(headers, true);
  headers.set("cache-control", "no-store");
  return new Response(page ? page.body : "Not Found", { status: 404, headers });
}
