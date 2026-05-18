// Weblisk Orchestrator — Durable Object for agent registry + service directory.
// See: architecture/orchestrator.md, platforms/cloudflare.md
//
// Endpoints (internal, called by gateway):
//   POST /v1/register   — Agent registration (identity-verified)
//   DELETE /v1/register  — Agent deregistration
//   GET  /v1/services   — Service directory
//   GET  /v1/health     — Hub health

import { VERSION, jsonResponse, errorResponse, log } from "./protocol.js";

export class Orchestrator {
  constructor(state, env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
    this.registry = new Map();    // agent name → registration record
    this.namespaces = new Map();  // namespace → owner agent name
    this.startedAt = Date.now();

    // Reserve system namespace
    this.namespaces.set("system", "orchestrator");

    // Restore persisted state
    state.blockConcurrencyWhile(async () => {
      const saved = await this.storage.get("registry");
      if (saved) {
        for (const [name, record] of Object.entries(saved)) {
          this.registry.set(name, record);
        }
      }
      const ns = await this.storage.get("namespaces");
      if (ns) {
        for (const [k, v] of Object.entries(ns)) {
          this.namespaces.set(k, v);
        }
        // Ensure system is always reserved
        this.namespaces.set("system", "orchestrator");
      }
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === "/v1/health" && method === "GET") return this.health();
    if (path === "/v1/register" && method === "POST") return this.register(request);
    if (path === "/v1/register" && method === "DELETE") return this.deregister(request);
    if (path === "/v1/services" && method === "GET") return this.services(request);

    return errorResponse("Not found", 404);
  }

  // GET /v1/health

  health() {
    const agents = [...this.registry.values()];
    return jsonResponse({
      name: "orchestrator",
      status: "healthy",
      version: VERSION,
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      metrics: {
        agents: this.registry.size,
        domains: agents.filter(a => a.manifest.type === "domain").length,
        namespaces: this.namespaces.size,
      },
    });
  }

  // POST /v1/register

  async register(request) {
    let body;
    try { body = await request.json(); } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const { manifest } = body;
    if (!manifest || !manifest.name) {
      return errorResponse("Missing manifest.name", 400);
    }

    const name = manifest.name;

    // Namespace enforcement
    for (const ns of (manifest.publishes || [])) {
      const topic = ns.split(".")[0];
      if (topic === "system") {
        return errorResponse("NAMESPACE_RESERVED", 403);
      }
      const owner = this.namespaces.get(topic);
      if (owner && owner !== name) {
        return jsonResponse({ error: "NAMESPACE_CONFLICT", conflict: owner }, 409);
      }
    }

    // Grant namespaces
    for (const ns of (manifest.publishes || [])) {
      const topic = ns.split(".")[0];
      this.namespaces.set(topic, name);
    }

    // Store registration
    const record = {
      manifest,
      registered_at: Date.now(),
      last_seen: Date.now(),
      status: "online",
    };
    this.registry.set(name, record);

    // Persist
    await this.persist();

    log("orchestrator", "register", { agent: name, type: manifest.type });

    return jsonResponse({
      agent_id: name,
      token: `wlt_${name}_${Date.now().toString(36)}`,
      services: this.buildServiceDirectory(),
    });
  }

  // DELETE /v1/register

  async deregister(request) {
    let body;
    try { body = await request.json(); } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const name = body.name;
    if (!name || !this.registry.has(name)) {
      return errorResponse("Agent not found", 404);
    }

    // Release namespaces
    for (const [ns, owner] of this.namespaces) {
      if (owner === name) this.namespaces.delete(ns);
    }

    this.registry.delete(name);
    await this.persist();

    log("orchestrator", "deregister", { agent: name });

    return jsonResponse({ status: "deregistered" });
  }

  // GET /v1/services

  services() {
    return jsonResponse(this.buildServiceDirectory());
  }

  // Internal

  buildServiceDirectory() {
    const agents = [];
    for (const [name, record] of this.registry) {
      agents.push({
        name,
        type: record.manifest.type,
        version: record.manifest.version,
        capabilities: record.manifest.capabilities,
        status: record.status,
      });
    }
    return {
      agents,
      namespaces: Object.fromEntries(this.namespaces),
    };
  }

  async persist() {
    const registry = Object.fromEntries(this.registry);
    const namespaces = Object.fromEntries(this.namespaces);
    await this.storage.put("registry", registry);
    await this.storage.put("namespaces", namespaces);
  }
}
