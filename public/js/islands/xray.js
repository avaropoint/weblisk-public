/**
 * X-Ray Island — Reveals the blueprint "skeleton" behind any section.
 * Adds a subtle button to each section. Clicking it opens a tabbed
 * overlay showing Blueprint YAML, HTML, CSS, JS and the live rendered
 * section — all extracted from the real page, not hard-coded.
 *
 * Hydration: idle
 */
export default function xray(el) {
  if (el._xrayInit) return;
  el._xrayInit = true;

  const props = JSON.parse(el.dataset.props || '{}');
  const blueprintPath = props.blueprint_path || 'pages/home.yaml';
  const pageBase = new URL('.', document.baseURI).href;

  let yamlCache = null;

  // Find all sections with ids in <main>
  const sections = document.querySelectorAll('main section[id]');
  if (!sections.length) return;

  injectStyles();

  sections.forEach(section => {
    const btn = document.createElement('button');
    btn.className = 'xray-trigger';
    btn.type = 'button';
    btn.setAttribute('aria-label', `X-Ray ${section.id} section`);
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
    btn.addEventListener('click', () => openXray(section));
    section.style.position = 'relative';
    section.appendChild(btn);
  });

  async function fetchYaml() {
    if (yamlCache) return yamlCache;
    try {
      const res = await fetch(`${pageBase}api/blueprint/${blueprintPath}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const text = await res.text();
      yamlCache = text;
      return text;
    } catch {
      return '# Could not load blueprint';
    }
  }

  function extractSectionYaml(yaml, sectionId) {
    const lines = yaml.split('\n');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*-\s+id:\s*(.+)/);
      if (m && m[1].trim() === sectionId) { start = i; continue; }
      if (start >= 0 && m) {
        // Trim trailing blank lines and standalone comments before next section
        let end = i;
        while (end > start && /^\s*(#.*)?$/.test(lines[end - 1])) end--;
        return lines.slice(start, end).join('\n');
      }
    }
    if (start >= 0) {
      // Last section — trim trailing blank/comment lines
      let end = lines.length;
      while (end > start && /^\s*(#.*)?$/.test(lines[end - 1])) end--;
      return lines.slice(start, end).join('\n');
    }
    return `# Section "${sectionId}" not found in blueprint`;
  }

  function extractCSS(section) {
    // X-Ray inspector UI classes — exclude trigger button (overlay not yet in DOM)
    const XRAY_INSPECTOR_RE = /\.xray-trigger|\.xray-overlay|\.xray-panel|\.xray-header|\.xray-close|\.xray-tabs\b|\.xray-tab\b|\.xray-body|\.xray-code|\.xray-rendered|\.xray-active|\.xray-fade|\.xray-scan|\.xray-title|\.xray-css/;
    // Global icon system classes — not section-specific
    const ICON_RE = /\.wl-icon|\.wl-i-/;

    const rules = [];
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (!(rule instanceof CSSStyleRule)) continue;
            const sel = rule.selectorText || '';

            // Skip xray inspector UI / icon system rules
            if (XRAY_INSPECTOR_RE.test(sel) || ICON_RE.test(sel)) continue;

            // Check if any element in this section actually matches
            try {
              if (section.matches(sel) || section.querySelector(sel)) {
                rules.push(rule.cssText);
              }
            } catch { /* invalid selector */ }
          }
        } catch { /* cross-origin sheet */ }
      }
    } catch { /* no sheets */ }

    if (rules.length === 0) return '/* No matching CSS rules found */';
    const unique = [...new Set(rules)];
    // Format: one rule per block with blank line separator
    const formatted = unique.map(r => formatCSSRule(r)).join('\n\n');
    if (unique.length > 60) {
      return unique.slice(0, 60).map(r => formatCSSRule(r)).join('\n\n')
        + '\n\n/* … ' + (unique.length - 60) + ' more rules */';
    }
    return formatted;
  }

  /** Rough CSS formatter — one property per line */
  function formatCSSRule(css) {
    // Already readable? Return as-is if it has newlines
    if (css.includes('\n')) return css;
    // Split "selector { prop: val; prop: val; }" into readable form
    return css
      .replace(/\{\s*/g, ' {\n  ')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\s*\}$/g, '\n}')
      .replace(/\n  \n}/g, '\n}');
  }

  function extractJS(section) {
    const islands = section.querySelectorAll('[data-island]');
    if (!islands.length) return '// No island JS in this section';
    return [...islands].map(el => {
      const src = el.dataset.island;
      const hydrate = el.dataset.hydrate || 'load';
      const props = el.dataset.props ? `\n// Props: ${el.dataset.props}` : '';
      return `// Island: ${src}\n// Hydration strategy: ${hydrate}${props}\nimport island from '${src}';\nisland(element);`;
    }).join('\n\n');
  }

  function extractHTML(section) {
    const clone = section.cloneNode(true);
    // Remove xray artifacts
    clone.querySelectorAll('.xray-trigger').forEach(b => b.remove());
    clone.querySelectorAll('.xray-overlay').forEach(o => o.remove());
    clone.classList.remove('xray-active');
    clone.style.removeProperty('position');
    // Clean empty style attribute
    if (clone.getAttribute('style') === '') clone.removeAttribute('style');
    // Format the HTML with indentation
    return formatHTML(clone.outerHTML);
  }

  /** Rough HTML formatter — indents nested tags */
  function formatHTML(html) {
    // Normalize to single line first
    let s = html.replace(/\n\s*/g, ' ').replace(/>\s+</g, '>\n<');
    const lines = s.split('\n');
    let indent = 0;
    const out = [];
    const VOID = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr']);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      // Closing tag
      const isClose = /^<\//.test(line);
      // Self-closing or void tag
      const isVoid = /\/>$/.test(line) || VOID.has((line.match(/^<(\w+)/) || [])[1]);
      if (isClose) indent = Math.max(0, indent - 1);
      out.push('  '.repeat(indent) + line);
      if (!isClose && !isVoid && /^<[a-zA-Z]/.test(line) && !line.includes('</')) {
        indent++;
      }
    }
    return out.join('\n');
  }

  async function openXray(section) {
    // Close any existing overlay
    document.querySelectorAll('.xray-overlay').forEach(o => o.remove());
    document.querySelectorAll('.xray-active').forEach(s => s.classList.remove('xray-active'));

    // Extract HTML/CSS/JS BEFORE inserting overlay into the section DOM
    const [yaml, html, css, js] = await Promise.all([
      fetchYaml().then(y => extractSectionYaml(y, section.id)),
      Promise.resolve(extractHTML(section)),
      Promise.resolve(extractCSS(section)),
      Promise.resolve(extractJS(section))
    ]);

    section.classList.add('xray-active');

    const overlay = document.createElement('div');
    overlay.className = 'xray-overlay';

    // Loading state
    overlay.innerHTML = `
      <div class="xray-panel">
        <div class="xray-header">
          <div class="xray-header-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span class="xray-title">X-Ray: <code>#${section.id}</code></span>
          </div>
          <button class="xray-close" type="button" aria-label="Close X-Ray">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="xray-tabs" role="tablist" aria-label="X-Ray tabs">
          <button role="tab" aria-selected="true" data-tab="blueprint" type="button">Blueprint</button>
          <button role="tab" aria-selected="false" data-tab="html" type="button" tabindex="-1">HTML</button>
          <button role="tab" aria-selected="false" data-tab="css" type="button" tabindex="-1">CSS</button>
          <button role="tab" aria-selected="false" data-tab="js" type="button" tabindex="-1">JS</button>
          <button role="tab" aria-selected="false" data-tab="rendered" type="button" tabindex="-1">Rendered</button>
        </div>
        <div class="xray-body">
          <pre class="xray-code"><code>Loading blueprint…</code></pre>
        </div>
      </div>
    `;

    section.appendChild(overlay);

    // Wire close
    overlay.querySelector('.xray-close').addEventListener('click', () => {
      section.classList.remove('xray-active');
      overlay.remove();
    });

    // Escape to close
    const onEsc = e => {
      if (e.key === 'Escape') {
        section.classList.remove('xray-active');
        overlay.remove();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);

    // Data already gathered above

    const data = {
      blueprint: { content: yaml, lang: 'yaml' },
      html: { content: html, lang: 'html' },
      css: { content: css, lang: 'css' },
      js: { content: js, lang: 'js' },
      rendered: { type: 'rendered' }
    };

    // Tab switching
    const tabs = overlay.querySelectorAll('[role="tab"]');
    const body = overlay.querySelector('.xray-body');
    let activeTab = 'blueprint';

    function renderTab(tabName) {
      activeTab = tabName;
      tabs.forEach(t => {
        const selected = t.dataset.tab === tabName;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
      });

      if (tabName === 'rendered') {
        // Show a miniature rendered version
        const clone = section.cloneNode(true);
        clone.querySelectorAll('.xray-trigger, .xray-overlay').forEach(el => el.remove());
        clone.classList.remove('xray-active');
        clone.style.cssText = 'position:static;transform:none;';
        body.innerHTML = `<div class="xray-rendered-frame"></div>`;
        body.querySelector('.xray-rendered-frame').appendChild(clone);
      } else {
        const d = data[tabName];
        body.innerHTML = `<pre class="xray-code"><code></code></pre>`;
        const codeEl = body.querySelector('code');
        if (tabName === 'blueprint') {
          codeEl.innerHTML = highlightYaml(d.content);
        } else if (tabName === 'html') {
          codeEl.innerHTML = highlightHTML(d.content);
        } else if (tabName === 'css') {
          codeEl.innerHTML = highlightCSS(d.content);
        } else if (tabName === 'js') {
          codeEl.innerHTML = highlightJS(d.content);
        } else {
          codeEl.textContent = d.content;
        }
      }
    }

    tabs.forEach(t => {
      t.addEventListener('click', () => renderTab(t.dataset.tab));
    });

    // Keyboard nav
    overlay.querySelector('.xray-tabs').addEventListener('keydown', e => {
      const tabArr = [...tabs];
      const idx = tabArr.indexOf(document.activeElement);
      if (idx < 0) return;
      let next = idx;
      if (e.key === 'ArrowRight') next = (idx + 1) % tabArr.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + tabArr.length) % tabArr.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabArr.length - 1;
      else return;
      e.preventDefault();
      renderTab(tabArr[next].dataset.tab);
      tabArr[next].focus();
    });

    renderTab('blueprint');
  }

  /* Syntax highlighting */

  function highlightYaml(src) {
    return src.split('\n').map(line => {
      if (line.trim() === '') return '';
      if (/^\s*#/.test(line)) return `<span class="syn-c">${esc(line)}</span>`;
      const m = line.match(/^(\s*(?:- )?)([A-Za-z_][A-Za-z0-9_]*)(\s*:\s*)(.*)/);
      if (m) {
        const [, indent, key, colon, val] = m;
        return esc(indent) + `<span class="syn-k">${esc(key)}</span><span class="syn-p">${esc(colon)}</span>` + hlVal(val);
      }
      const li = line.match(/^(\s*- )(.*)/);
      if (li) return `<span class="syn-p">${esc(li[1])}</span>` + hlVal(li[2]);
      return `<span class="syn-s">${esc(line)}</span>`;
    }).join('\n');
  }

  function hlVal(val) {
    if (!val || val === '>' || val === '|') return `<span class="syn-p">${esc(val)}</span>`;
    if (/^\d[\d.]*$/.test(val.trim())) return `<span class="syn-n">${esc(val)}</span>`;
    if (/^(true|false|yes|no|null)$/i.test(val.trim())) return `<span class="syn-k">${esc(val)}</span>`;
    return `<span class="syn-s">${esc(val)}</span>`;
  }

  function highlightHTML(src) {
    return esc(src)
      .replace(/(&lt;\/?)([\w-]+)/g, '<span class="syn-t">$1$2</span>')
      .replace(/([\w-]+)(=)(&quot;[^&]*&quot;)/g, '<span class="syn-a">$1</span><span class="syn-p">$2</span><span class="syn-s">$3</span>')
      .replace(/(&lt;!--.*?--&gt;)/g, '<span class="syn-c">$1</span>');
  }

  function highlightCSS(src) {
    return esc(src).split('\n').map(line => {
      // Comments
      if (/^\s*\/\*/.test(line)) return `<span class="syn-c">${line}</span>`;
      // Selector line (ends with {)
      if (/\{\s*$/.test(line.trim())) {
        return line
          .replace(/(\.[\w-]+)/g, '<span class="syn-t">$1</span>')
          .replace(/(#[\w-]+)/g, '<span class="syn-a">$1</span>')
          .replace(/(:[\w-]+)/g, '<span class="syn-f">$1</span>')
          .replace(/(\[[\w-]+=?[^\]]*\])/g, '<span class="syn-a">$1</span>');
      }
      // Property line (contains : )
      const pm = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.*)/);
      if (pm) {
        const [, indent, prop, colon, rest] = pm;
        const valHighlighted = rest
          .replace(/(var\(--[\w-]+\))/g, '<span class="syn-f">$1</span>')
          .replace(/(--[\w-]+)/g, '<span class="syn-a">$1</span>')
          .replace(/(\d+\.?\d*)(px|rem|em|%|vw|vh|ms|s|deg|fr)\b/g, '<span class="syn-n">$1$2</span>')
          .replace(/\b(\d+\.?\d*)\b/g, '<span class="syn-n">$1</span>');
        return `${indent}<span class="syn-k">${prop}</span><span class="syn-p">${colon}</span>${valHighlighted}`;
      }
      return line;
    }).join('\n');
  }

  function highlightJS(src) {
    return esc(src).split('\n').map(line => {
      // Comments
      if (/^\s*\/\//.test(line)) return `<span class="syn-c">${line}</span>`;
      // Keywords
      return line
        .replace(/\b(import|export|from|const|let|var|function|return|async|await|default)\b/g, '<span class="syn-k">$1</span>')
        .replace(/(&quot;[^&]*&quot;|&#x27;[^&]*&#x27;)/g, '<span class="syn-s">$1</span>')
        .replace(/'([^']*)'/g, '<span class="syn-s">\'$1\'</span>');
    }).join('\n');
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

/* Injected Styles */

function injectStyles() {
  if (document.getElementById('xray-css')) return;
  const s = document.createElement('style');
  s.id = 'xray-css';
  s.textContent = `
/* X-Ray trigger button — appears on hover */
.xray-trigger {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 50;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--wl-border, #e2e8f0);
  background: var(--wl-surface, #fff);
  color: var(--wl-text-dim, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 200ms ease, background 150ms ease, border-color 150ms ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}
[data-theme="dark"] .xray-trigger {
  background: var(--wl-dark-surface, #1a1f36);
  border-color: var(--wl-border-dark, #334155);
}
section:hover > .xray-trigger,
.xray-trigger:focus-visible {
  opacity: 1;
}
.xray-trigger:hover {
  border-color: var(--wl-primary, #6366f1);
  color: var(--wl-primary, #6366f1);
  background: var(--wl-primary-light, rgba(99,102,241,0.08));
}

/* X-Ray active state — the "skeleton" visual */
.xray-active {
  outline: 2px solid var(--wl-primary, #6366f1) !important;
  outline-offset: -2px;
  border-radius: 4px;
}
.xray-active::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 39px,
      rgba(99,102,241,0.04) 39px,
      rgba(99,102,241,0.04) 40px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 39px,
      rgba(99,102,241,0.04) 39px,
      rgba(99,102,241,0.04) 40px
    );
  border-radius: inherit;
  animation: xray-scan 2s ease-out forwards;
}
@keyframes xray-scan {
  0%   { opacity: 0; }
  30%  { opacity: 1; }
  100% { opacity: 0.5; }
}

/* X-Ray overlay panel */
.xray-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: rgba(15, 18, 37, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: xray-fade 250ms ease;
}
@keyframes xray-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.xray-panel {
  text-align: left;
  width: min(1100px, 100%);
  max-height: calc(100vh - 6rem);
  background: var(--wl-code-bg, #0f1225);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: xray-panel-in 300ms ease;
}
@keyframes xray-panel-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.xray-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--wl-code-surface, #232946);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.xray-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--wl-primary, #6366f1);
}
.xray-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--wl-code-text, #e2e8f0);
}
.xray-title code {
  color: var(--wl-primary, #6366f1);
  font-family: var(--wl-mono, monospace);
  font-size: 0.8rem;
  background: none;
  padding: 0;
}
.xray-close {
  background: none;
  border: none;
  color: var(--wl-text-dim, #94a3b8);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 6px;
  display: flex;
  transition: background 150ms ease, color 150ms ease;
}
.xray-close:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

/* X-Ray tabs */
.xray-tabs {
  display: flex;
  gap: 0;
  background: var(--wl-code-surface, #232946);
  border-bottom: 2px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
}
.xray-tabs [role="tab"] {
  flex-shrink: 0;
  padding: 0.55rem 1.1rem;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--wl-text-dim, #94a3b8);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 150ms ease, border-color 150ms ease;
  white-space: nowrap;
}
.xray-tabs [role="tab"]:hover {
  color: var(--wl-code-text, #e2e8f0);
}
.xray-tabs [role="tab"][aria-selected="true"] {
  color: var(--wl-primary, #6366f1);
  border-bottom-color: var(--wl-primary, #6366f1);
}

/* X-Ray body */
.xray-body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.xray-code {
  margin: 0;
  padding: 1rem 1.25rem;
  font-family: var(--wl-mono, monospace);
  font-size: 0.72rem;
  line-height: 1.6;
  color: var(--wl-code-text, #e2e8f0);
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  tab-size: 2;
}
.xray-code code {
  background: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

/* Rendered preview */
.xray-rendered-frame {
  background: var(--wl-bg, #fff);
  border-radius: 8px;
  margin: 1rem;
  overflow: hidden;
  border: 1px solid var(--wl-border, #e2e8f0);
}
[data-theme="dark"] .xray-rendered-frame {
  background: var(--wl-bg, #0f1225);
  border-color: var(--wl-border-dark, #334155);
}
.xray-rendered-frame > * {
  pointer-events: none;
}

@media (max-width: 480px) {
  .xray-panel {
    max-height: 80vh;
  }
  .xray-tabs [role="tab"] {
    padding: 0.45rem 0.75rem;
    font-size: 0.7rem;
  }
  .xray-code {
    font-size: 0.65rem;
    padding: 0.75rem;
  }
}
`;
  document.head.appendChild(s);
}
