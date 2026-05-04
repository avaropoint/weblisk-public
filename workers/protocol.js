// Weblisk Protocol — shared types and validation.
// See: protocol/types.md, protocol/identity.md

export const VERSION = "1.0.0";

// Agent manifest helpers

export function manifest({ name, type, version, description, capabilities, inputs, outputs, publishes, subscriptions, workflows, requiredAgents }) {
  return {
    name,
    type: type || "work",
    version: version || VERSION,
    description: description || "",
    url: "",  // set at registration time
    public_key: "", // set at startup
    capabilities: capabilities || [],
    inputs: inputs || [],
    outputs: outputs || [],
    publishes: publishes || [],
    subscriptions: subscriptions || [],
    workflows: workflows || [],
    required_agents: requiredAgents || [],
  };
}

// Standard responses

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json;charset=utf-8", ...headers },
  });
}

export function errorResponse(error, status = 400) {
  return jsonResponse({ error }, status);
}

// Health response

export function healthResponse(name, status, version, extra = {}) {
  return jsonResponse({
    name,
    status,
    version,
    uptime_seconds: Math.floor(performance.now() / 1000),
    ...extra,
  });
}

// Structured logging (per platforms/cloudflare.md)

export function log(component, action, detail = {}, traceId) {
  console.log(JSON.stringify({
    component,
    action,
    ...detail,
    trace_id: traceId || "",
    timestamp: Date.now(),
  }));
}

// Trace ID

export function newTraceId() {
  return crypto.randomUUID();
}

// Validation helpers

export function validateRequired(obj, fields) {
  const missing = fields.filter(f => !(f in obj) || obj[f] === undefined || obj[f] === "");
  return missing.length ? missing : null;
}
