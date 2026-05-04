/**
 * Blueprint Source View
 * Activated by ?blueprint query parameter.
 * Full-page "View Source" for blueprints — shows the complete YAML
 * specification that produced this page, similar to browser View Source
 * but for the specification layer instead of HTML.
 *
 * Keyboard shortcut: Cmd/Ctrl+Shift+B toggles blueprint source view.
 */
export default async function blueprintSource(el, blueprintPath) {
  el.style.display = 'none';

  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'bp-source';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Blueprint source view');
  overlay.innerHTML = `
    <div class="bp-source-bar">
      <div class="bp-source-bar-inner">
        <span class="bp-source-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Blueprint Source
        </span>
        <span class="bp-source-path">${esc(blueprintPath || '')}</span>
        <button class="bp-source-copy" type="button" aria-label="Copy blueprint source">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span class="bp-source-copy-label">Copy</span>
        </button>
        <button class="bp-source-exit" type="button" aria-label="Close blueprint source view">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="bp-source-body">
      <div class="bp-source-gutter"></div>
      <pre class="bp-source-code"><code>Loading blueprint…</code></pre>
    </div>
    <div class="bp-source-footer">
      <span>This page was generated from this blueprint.</span>
      <a href="/platform/blueprints/">Learn about blueprints →</a>
    </div>`;

  document.body.appendChild(overlay);
  document.body.classList.add('bp-source-active');

  const codeEl = overlay.querySelector('.bp-source-code code');
  const gutterEl = overlay.querySelector('.bp-source-gutter');
  const exitBtn = overlay.querySelector('.bp-source-exit');
  const copyBtn = overlay.querySelector('.bp-source-copy');
  const copyLabel = overlay.querySelector('.bp-source-copy-label');

  let rawYaml = '';

  // Exit handler
  function exit() {
    const url = new URL(location.href);
    url.searchParams.delete('blueprint');
    history.replaceState(null, '', url);
    overlay.remove();
    document.body.classList.remove('bp-source-active');
    el.style.display = '';
  }

  exitBtn.addEventListener('click', exit);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('bp-source-active')) {
      e.preventDefault();
      exit();
    }
  });

  // Copy handler
  copyBtn.addEventListener('click', async () => {
    if (!rawYaml) return;
    try {
      await navigator.clipboard.writeText(rawYaml);
      copyLabel.textContent = 'Copied!';
      setTimeout(() => { copyLabel.textContent = 'Copy'; }, 2000);
    } catch {
      copyLabel.textContent = 'Failed';
      setTimeout(() => { copyLabel.textContent = 'Copy'; }, 2000);
    }
  });

  // Fetch and render
  if (!blueprintPath) {
    codeEl.textContent = '# No blueprint path specified';
    return;
  }

  try {
    rawYaml = await fetchBlueprint(blueprintPath);
    codeEl.innerHTML = highlightYaml(rawYaml);

    // Generate line numbers
    const lineCount = rawYaml.split('\n').length;
    gutterEl.innerHTML = Array.from({ length: lineCount }, (_, i) =>
      `<span>${i + 1}</span>`
    ).join('\n');
  } catch (err) {
    codeEl.textContent = `# Failed to load blueprint: ${err.message}`;
  }

  exitBtn.focus();
}

/* ── Keyboard shortcut (Cmd/Ctrl+Shift+B) ─────────── */

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
    e.preventDefault();
    if (document.body.classList.contains('bp-source-active')) {
      const exitBtn = document.querySelector('.bp-source-exit');
      if (exitBtn) exitBtn.click();
    } else {
      const url = new URL(location.href);
      url.searchParams.set('blueprint', 'true');
      history.replaceState(null, '', url);
      location.reload();
    }
  }
});

/* ── Fetch Blueprint ──────────────────────────────────── */

async function fetchBlueprint(path) {
  const pageBase = new URL('.', document.baseURI).href;
  const res = await fetch(`${pageBase}api/blueprint/${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

/* ── YAML Syntax Highlighter ──────────────────────────── */

function highlightYaml(src) {
  return src
    .split('\n')
    .map(line => {
      if (line.trim() === '') return '';
      if (/^\s*#/.test(line))
        return `<span class="syn-c">${esc(line)}</span>`;
      const m = line.match(/^(\s*(?:- )?)([A-Za-z_][A-Za-z0-9_]*)(\s*:\s*)(.*)/);
      if (m) {
        const [, indent, key, colon, val] = m;
        return esc(indent)
          + `<span class="syn-k">${esc(key)}</span>`
          + `<span class="syn-p">${esc(colon)}</span>`
          + highlightValue(val);
      }
      const li = line.match(/^(\s*- )(.*)/);
      if (li)
        return `<span class="syn-p">${esc(li[1])}</span>` + highlightValue(li[2]);
      return `<span class="syn-s">${esc(line)}</span>`;
    })
    .join('\n');
}

function highlightValue(val) {
  if (val === '' || val === '>' || val === '>-' || val === '|')
    return `<span class="syn-p">${esc(val)}</span>`;
  const ci = val.indexOf(' #');
  let value = val, comment = '';
  if (ci > 0) {
    value = val.slice(0, ci);
    comment = `<span class="syn-c">${esc(val.slice(ci))}</span>`;
  }
  if (/^\d[\d.]*$/.test(value.trim()))
    return `<span class="syn-n">${esc(value)}</span>${comment}`;
  if (/^(true|false|yes|no|null)$/i.test(value.trim()))
    return `<span class="syn-k">${esc(value)}</span>${comment}`;
  if (/^["']/.test(value.trim()))
    return `<span class="syn-s">${esc(value)}</span>${comment}`;
  return `<span class="syn-s">${esc(value)}</span>${comment}`;
}

/* ── Helpers ──────────────────────────────────────────── */

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Styles ───────────────────────────────────────────── */

function injectStyles() {
  if (document.getElementById('bp-source-css')) return;
  const style = document.createElement('style');
  style.id = 'bp-source-css';
  style.textContent = `
/* ── Blueprint Source View ───────────────────────────── */
.bp-source-active > :not(.bp-source):not(script):not(style):not(link) {
  display: none !important;
}
.bp-source {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  background: var(--wl-code-bg, #0f1219);
  color: var(--wl-text-dark, #e2e8f0);
  font-family: var(--wl-mono, var(--wl-font-mono, 'SF Mono', 'Fira Code', 'Cascadia Code', monospace));
}

/* ── Top Bar ──────────────────────────────────────── */
.bp-source-bar {
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--wl-primary, #6366f1), var(--wl-primary-dark, #4f46e5));
  color: #fff;
  padding: 0.55rem 0;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}
.bp-source-bar-inner {
  max-width: 100%;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.bp-source-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.7rem;
  white-space: nowrap;
}
.bp-source-badge svg { opacity: 0.85; }
.bp-source-path {
  opacity: 0.7;
  font-size: 0.72rem;
  background: rgba(255,255,255,0.12);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}
.bp-source-copy {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 600;
  transition: background 150ms ease;
}
.bp-source-copy:hover { background: rgba(255,255,255,0.25); }
.bp-source-exit {
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms ease;
}
.bp-source-exit:hover { background: rgba(255,255,255,0.25); }

/* ── Code Body ────────────────────────────────────── */
.bp-source-body {
  flex: 1;
  overflow: auto;
  display: flex;
  padding: 1rem 0;
}
.bp-source-gutter {
  flex-shrink: 0;
  padding: 0 0.75rem 0 1.25rem;
  text-align: right;
  color: rgba(255,255,255,0.2);
  font-size: 0.72rem;
  line-height: 1.7;
  user-select: none;
  white-space: pre-line;
  border-right: 1px solid rgba(255,255,255,0.06);
}
.bp-source-gutter span {
  display: block;
}
.bp-source-code {
  flex: 1;
  margin: 0;
  padding: 0 1.25rem;
  background: none;
  color: inherit;
  font-size: 0.78rem;
  line-height: 1.7;
  white-space: pre;
  overflow-x: auto;
  tab-size: 2;
}
.bp-source-code code {
  background: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

/* ── Footer ───────────────────────────────────────── */
.bp-source-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.6rem 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 0.72rem;
  color: rgba(255,255,255,0.4);
}
.bp-source-footer a {
  color: var(--wl-primary-light, #818cf8);
  text-decoration: none;
  font-weight: 600;
}
.bp-source-footer a:hover {
  text-decoration: underline;
}

/* ── Mobile ───────────────────────────────────────── */
@media (max-width: 600px) {
  .bp-source-bar-inner { padding: 0 0.75rem; }
  .bp-source-path { display: none; }
  .bp-source-gutter { padding: 0 0.5rem 0 0.75rem; font-size: 0.65rem; }
  .bp-source-code { padding: 0 0.75rem; font-size: 0.7rem; }
  .bp-source-footer { flex-direction: column; gap: 0.25rem; }
}
`;
  document.head.appendChild(style);
}
