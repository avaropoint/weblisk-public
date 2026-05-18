// Website Domain Controller — owns workflows for weblisk.dev interactive features.
// See: architecture/domain.md
//
// Workflows:
//   examples  — live code generation from blueprints (simulated until LLM live)
//   blueprint — fetch and return blueprint source (delegates to Blueprint API)
//
// Routes (via gateway):
//   POST /api/examples/generate → trigger examples workflow
//   GET  /api/examples/health   → domain + agent health
//   GET  /api/examples          → domain info

import { VERSION, manifest, jsonResponse, errorResponse, healthResponse, log } from "../protocol.js";

const DOMAIN_MANIFEST = manifest({
  name: "website",
  type: "domain",
  version: VERSION,
  description: "Weblisk public website — interactive blueprints and live examples",
  capabilities: [
    { name: "task:execute", resources: ["website.*"] },
    { name: "agent:message", resources: ["examples"] },
  ],
  workflows: ["examples"],
  requiredAgents: ["examples"],
  publishes: ["website.examples.generated"],
  subscriptions: [],
});

// Simulated examples data
// Pre-built responses for common blueprint types until LLM is configured.

const SIMULATED_EXAMPLES = {
  "agent": {
    language: "javascript",
    platform: "cloudflare",
    code: `// Generated from agent blueprint — Cloudflare Worker
import { manifest, jsonResponse, healthResponse } from "./protocol.js";

const MANIFEST = manifest({
  name: "my-agent",
  type: "work",
  version: "1.0.0",
  description: "Custom work agent",
  capabilities: [{ name: "task:execute", resources: ["my-domain.*"] }],
});

export async function handle(request, env, path) {
  if (path === "/health") return healthResponse(MANIFEST.name, "healthy", MANIFEST.version);
  if (path === "/describe") return jsonResponse(MANIFEST);
  if (path === "/execute") return execute(request, env);
  return jsonResponse({ agent: MANIFEST.name, version: MANIFEST.version });
}

async function execute(request, env) {
  const { action, payload } = await request.json();
  // Domain-specific logic here
  return jsonResponse({ status: "completed", action, result: {} });
}`,
  },
  "component": {
    language: "javascript",
    platform: "browser",
    code: `// Generated from component blueprint — Weblisk Island
export default function myComponent(el) {
  if (el._init) return;
  el._init = true;

  const props = JSON.parse(el.dataset.props || '{}');

  // Render from blueprint structure
  el.innerHTML = \`
    <div class="my-component" role="region" aria-label="\${props.label || 'Component'}">
      <h3>\${props.title || 'Component Title'}</h3>
      <div class="my-component-content">
        \${props.content || 'Content goes here'}
      </div>
    </div>
  \`;

  // Wire up interactions from blueprint behavior
  el.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (action) handleAction(action.dataset.action, props);
  });
}

function handleAction(action, props) {
  console.log('Action:', action, props);
}`,
  },
  "page": {
    language: "html",
    platform: "browser",
    code: `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{seo.title}}</title>
  <meta name="description" content="{{seo.description}}">
  <link rel="stylesheet" href="./css/styles.css">
  <script type="importmap">
    { "imports": { "weblisk": "https://cdn.weblisk.dev/weblisk.js" } }
  </script>
</head>
<body>
  <!-- Generated from page blueprint -->
  <nav data-island="./js/islands/nav.js" data-hydrate="load">
    <!-- nav component renders here -->
  </nav>

  <main id="main-content">
    {{#each sections}}
    <section id="{{id}}" class="section section-{{type}}">
      <h2>{{heading}}</h2>
      <p>{{body}}</p>
    </section>
    {{/each}}
  </main>

  <footer><!-- footer component --></footer>
  <script type="module" src="./js/islands/shell.js"></script>
</body>
</html>`,
  },
  "gateway": {
    language: "javascript",
    platform: "cloudflare",
    code: `// Generated from gateway blueprint — Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Path security (non-bypassable)
    if (/\\/\\.[a-z]/i.test(url.pathname)) return notFound();
    if (url.pathname.includes("..")) return badRequest();

    // Route to agents
    if (url.pathname.startsWith("/api/")) return routeAPI(request, env, url);

    // Static files from R2
    const key = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const object = await env.SITE.get(key);
    if (!object) return notFound();

    const headers = new Headers();
    headers.set("content-type", mimeFor(key));
    securityHeaders(headers, key.endsWith(".html"));
    return new Response(object.body, { headers });
  }
};`,
  },
};

// Route handler (called by gateway)

export async function handle(request, env, path) {
  const tid = request.headers.get("x-trace-id") || "";

  if (path === "/" || path === "") return info();
  if (path === "/health") return health(env);
  if (path === "/describe") return jsonResponse(DOMAIN_MANIFEST);
  if (path === "/generate") return generate(request, env, tid);

  return errorResponse("Not found", 404);
}

// Endpoints

function info() {
  return jsonResponse({
    domain: DOMAIN_MANIFEST.name,
    version: DOMAIN_MANIFEST.version,
    description: DOMAIN_MANIFEST.description,
    ai_required: true,
    ai_configured: false, // Overridden at runtime when key exists
    endpoints: [
      { path: "/api/examples", method: "GET", description: "Domain info" },
      { path: "/api/examples/describe", method: "GET", description: "Domain manifest" },
      { path: "/api/examples/health", method: "GET", description: "Health check" },
      { path: "/api/examples/generate", method: "POST", description: "Generate code from blueprint" },
    ],
  });
}

function health(env) {
  const aiReady = hasAI(env);
  return jsonResponse({
    name: "website",
    status: "healthy",
    version: VERSION,
    uptime_seconds: Math.floor(performance.now() / 1000),
    agents: {
      examples: {
        status: aiReady ? "live" : "simulated",
        ai_configured: aiReady,
      },
    },
  });
}

async function generate(request, env, tid) {
  if (request.method !== "POST") {
    return errorResponse("POST required", 405);
  }

  let body;
  try { body = await request.json(); } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (!body.blueprint) {
    return errorResponse("Request body must include 'blueprint'", 400);
  }

  log("website", "generate", { type: body.type, ai: hasAI(env) }, tid);

  // Live generation (when LLM is configured)
  if (hasAI(env)) {
    return generateLive(body, env, tid);
  }

  // Simulated generation
  return generateSimulated(body);
}

function generateSimulated(body) {
  const type = detectBlueprintType(body.blueprint);
  const example = SIMULATED_EXAMPLES[type] || SIMULATED_EXAMPLES["component"];

  return jsonResponse({
    status: "simulated",
    message: "Live generation requires AI configuration. Showing pre-built example.",
    type,
    code: example.code,
    language: example.language,
    platform: example.platform,
    input: {
      blueprint: body.blueprint.substring(0, 120),
      requested_language: body.language || "javascript",
      requested_platform: body.platform || "cloudflare",
    },
  });
}

async function generateLive(body, env, tid) {
  const aiURL = env.WL_AI_BASE_URL || "https://api.anthropic.com/v1/messages";
  const model = env.WL_AI_MODEL || "claude-sonnet-4-20250514";

  let aiResponse;
  try {
    aiResponse = await fetch(aiURL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.WL_AI_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            "Generate a clean, production-ready code example from this Weblisk blueprint.",
            `Target platform: ${body.platform || "cloudflare"}`,
            `Language: ${body.language || "javascript"}`,
            "", "Blueprint:", "```yaml", body.blueprint, "```", "",
            "Return only the code with brief inline comments. No markdown fences.",
          ].join("\n"),
        }],
      }),
    });
  } catch (err) {
    log("website", "generate_error", { error: "AI unreachable" }, tid);
    return errorResponse("AI provider unreachable", 502);
  }

  if (!aiResponse.ok) {
    log("website", "generate_error", { status: aiResponse.status }, tid);
    // Fall back to simulated
    return generateSimulated(body);
  }

  const result = await aiResponse.json();
  return jsonResponse({
    status: "generated",
    code: result.content?.[0]?.text || "",
    model,
    language: body.language || "javascript",
    platform: body.platform || "cloudflare",
    input: {
      blueprint: body.blueprint.substring(0, 120),
    },
  });
}

// Helpers

function hasAI(env) {
  return !!(env.WL_AI_KEY && env.WL_AI_KEY !== "sk-ant-PLACEHOLDER");
}

function detectBlueprintType(yaml) {
  if (/^type:\s*page/m.test(yaml)) return "page";
  if (/^type:\s*(island|component)/m.test(yaml)) return "component";
  if (/^type:\s*architecture.*\n.*name:\s*gateway/ms.test(yaml)) return "gateway";
  if (/^type:\s*architecture.*\n.*name:\s*agent/ms.test(yaml)) return "agent";
  if (/capabilities:|execute|agent/m.test(yaml)) return "agent";
  return "component";
}
