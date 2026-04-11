// Security Island — Interactive demos for security modules.
import { signal, effect, enhance } from "weblisk";
import {
  sanitize,
  escapeHTML,
  html as safeHTML,
} from "weblisk/security/sanitize.js";
import { trustedHTML } from "weblisk/security/trusted.js";
import { generateToken, csrfToken } from "weblisk/security/csrf.js";
import { buildCSP } from "weblisk/security/csp.js";

// ─── Sanitize demo ───
enhance("#demo-sanitize", (el, { $ }) => {
  const input = $("#sanitize-input");
  const output = $("#output-sanitize");

  input.addEventListener("input", () => {
    const raw = input.value;
    const clean = sanitize(raw);
    const escaped = escapeHTML(raw);
    output.textContent = `Raw:       ${raw}\nSanitized: ${clean}\nEscaped:   ${escaped}`;
  });
});

// ─── Trusted Types demo ───
enhance("#demo-trusted", (el, { $ }) => {
  const output = $("#output-trusted");
  const btn = $("#btn-trusted");

  btn.addEventListener("click", () => {
    const dangerous =
      '<img src=x onerror="alert(1)"><p>Safe content</p><script>evil()</script>';
    try {
      const safe = trustedHTML(dangerous);
      output.textContent = `Input:  ${dangerous}\nOutput: ${safe}\n\n✅ Scripts and handlers stripped`;
    } catch (e) {
      output.textContent = `Trusted Types: ${e.message}`;
    }
  });
});

// ─── CSRF demo ───
enhance("#demo-csrf", (el, { $ }) => {
  const output = $("#output-csrf");
  const btn = $("#btn-csrf");

  btn.addEventListener("click", () => {
    const token = generateToken();
    const reactiveToken = csrfToken();
    output.textContent = `Token:    ${token}\nReactive: ${reactiveToken}\nLength:   ${token.length} chars (64 hex = 32 bytes)\n\n✅ Cryptographically random`;
  });
});

// ─── CSP + Permissions check ───
enhance("#demo-csp-perms", (el, { $ }) => {
  const output = $("#output-csp");
  const btn = $("#btn-check-csp");

  btn.addEventListener("click", () => {
    const cspMeta = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]',
    );
    const permMeta = document.querySelector(
      'meta[http-equiv="Permissions-Policy"]',
    );

    // Show actual CSP built by framework
    const generated = buildCSP();
    output.textContent = `CSP Meta:  ${cspMeta ? "✅ Applied" : "⚠️ Not found"}\n`;
    if (cspMeta)
      output.textContent += `  ${cspMeta.content.substring(0, 80)}...\n\n`;
    output.textContent += `Permissions: ${permMeta ? "✅ Applied" : "⚠️ Not found"}\n`;
    if (permMeta)
      output.textContent += `  ${permMeta.content.substring(0, 80)}...\n\n`;
    output.textContent += `buildCSP() default:\n  ${generated.substring(0, 100)}...`;
  });
});
