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
  // Cache static assets aggressively, HTML briefly
  if (key.endsWith(".html")) {
    headers.set("cache-control", "public, max-age=60, s-maxage=300");
  } else {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(object.body, { headers });
}
