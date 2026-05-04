// Live Examples Agent — generates code from blueprints when an LLM is available.
// When WL_AI_KEY is not set, returns placeholder responses.
// See: architecture/agent.md for the protocol specification.

const MANIFEST = {
  name: "examples",
  type: "work",
  version: "1.0.0",
  description: "Live code example generation from Weblisk blueprints",
  capabilities: [
    { name: "task:execute", resources: ["examples.*"] },
    { name: "llm:generate", resources: ["code"] },
  ],
  inputs: ["blueprint_yaml", "target_language", "target_platform"],
  outputs: ["generated_code", "explanation"],
  publishes: ["examples.generated"],
  subscriptions: [],
};

// ─── Browser-facing handler (called by gateway) ───

export async function handle(request, env, path) {
  if (path === "/" || path === "") return index(env);
  if (path === "/health") return health(env);
  if (path === "/describe") return describe();
  if (path === "/generate") return generate(request, env);
  return json({ error: "Not found" }, 404);
}

// ─── Endpoints ───

function index(env) {
  return json({
    agent: MANIFEST.name,
    version: MANIFEST.version,
    description: MANIFEST.description,
    ai_configured: hasAI(env),
    endpoints: [
      { path: "/api/examples", method: "GET", description: "Agent info" },
      { path: "/api/examples/describe", method: "GET", description: "Agent manifest" },
      { path: "/api/examples/health", method: "GET", description: "Health status" },
      { path: "/api/examples/generate", method: "POST", description: "Generate code from blueprint" },
    ],
  });
}

function describe() {
  return json(MANIFEST);
}

function health(env) {
  const ready = hasAI(env);
  return json({
    name: MANIFEST.name,
    status: ready ? "healthy" : "degraded",
    version: MANIFEST.version,
    ai_configured: ready,
    message: ready
      ? "Live examples ready"
      : "AI key not configured — returns placeholders",
  });
}

async function generate(request, env) {
  if (request.method !== "POST") {
    return json({ error: "POST required" }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.blueprint) {
    return json({ error: "Request body must include 'blueprint'" }, 400);
  }

  if (!hasAI(env)) {
    return json({
      status: "placeholder",
      message:
        "Live examples require AI configuration. Set WL_AI_KEY to enable.",
      input: {
        blueprint: body.blueprint.substring(0, 120),
        language: body.language || "javascript",
        platform: body.platform || "cloudflare",
      },
      output: null,
    });
  }

  // ─── LLM generation (active when key is configured) ───
  const aiURL =
    env.WL_AI_BASE_URL ||
    "https://api.anthropic.com/v1/messages";
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
        messages: [
          {
            role: "user",
            content: [
              "Generate a clean, production-ready code example from this Weblisk blueprint.",
              "",
              "Blueprint:",
              "```yaml",
              body.blueprint,
              "```",
              "",
              `Target platform: ${body.platform || "cloudflare"}`,
              `Language: ${body.language || "javascript"}`,
              "",
              "Return only the code with brief inline comments. No markdown fences.",
            ].join("\n"),
          },
        ],
      }),
    });
  } catch {
    return json({ error: "AI provider unreachable" }, 502);
  }

  if (!aiResponse.ok) {
    return json({ error: "AI generation failed", status: aiResponse.status }, 502);
  }

  const result = await aiResponse.json();
  return json({
    status: "generated",
    code: result.content?.[0]?.text || "",
    model,
    input: {
      blueprint: body.blueprint.substring(0, 120),
      language: body.language || "javascript",
      platform: body.platform || "cloudflare",
    },
  });
}

// ─── Helpers ───

function hasAI(env) {
  return !!(env.WL_AI_KEY && env.WL_AI_KEY !== "sk-ant-PLACEHOLDER");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json;charset=utf-8" },
  });
}
