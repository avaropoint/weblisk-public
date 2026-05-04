// Shell — Security: CSP + Permissions Policy.

export async function initSecurity() {
  const { applyCSP } = await import("weblisk/security/csp.js");
  const { applyPermissionsPolicy } =
    await import("weblisk/security/permissions.js");
  applyCSP({
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.weblisk.dev", "https://static.cloudflareinsights.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://cdn.weblisk.dev"],
    "font-src": ["'self'", "https://cdn.weblisk.dev"],
    "connect-src": ["'self'", "https://cdn.weblisk.dev", "https://static.cloudflareinsights.com", "wss:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  });
  applyPermissionsPolicy();
}
