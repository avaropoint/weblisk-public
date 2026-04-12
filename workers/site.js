// Minimal static-site Worker — serves files from R2 with index.html fallback.

const MIME = {
  html: "text/html;charset=utf-8",
  css: "text/css;charset=utf-8",
  js: "application/javascript;charset=utf-8",
  json: "application/json;charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
  webp: "image/webp",
  woff2: "font/woff2",
  woff: "font/woff",
  txt: "text/plain",
  xml: "application/xml",
};

function mimeType(path) {
  const ext = path.split(".").pop();
  return MIME[ext] || "application/octet-stream";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let key = url.pathname.slice(1); // strip leading /

    // Root or trailing slash → index.html
    if (key === "" || key.endsWith("/")) {
      key += "index.html";
    }

    const object = await env.SITE.get(key);
    if (!object) {
      // Try .html fallback for clean URLs (e.g. /docs/signals → docs/signals.html)
      const fallback = await env.SITE.get(key + ".html");
      if (fallback) {
        return respond(fallback, key + ".html");
      }
      // 404
      const notFound = await env.SITE.get("404.html");
      return new Response(notFound ? notFound.body : "Not Found", {
        status: 404,
        headers: { "content-type": "text/html;charset=utf-8" },
      });
    }

    return respond(object, key);
  },
};

function respond(object, key) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) {
    headers.set("content-type", mimeType(key));
  }

  // ── Security headers (all responses) ──
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );

  // ── Cache + CSP ──
  if (key.endsWith(".html")) {
    headers.set("cache-control", "public, max-age=60, s-maxage=300");
    headers.set(
      "content-security-policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.weblisk.dev https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https: ws: wss:; worker-src 'self' blob:; manifest-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
  } else {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(object.body, { headers });
}
