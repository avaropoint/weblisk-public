/**
 * Blueprint Viewer Island
 * Two modes:
 *   Default — slide-out drawer showing full YAML source.
 *   Source  — activated by ?blueprint — full-page "View Source" for
 *             the blueprint, like browser View Source but for specs.
 * Hydration: idle — loads after initial paint.
 */
export default function blueprintViewer(el) {
  // Guard against double hydration (shell.js + bootstrap script)
  if (el._bpViewerInit) return;
  el._bpViewerInit = true;

  const props = JSON.parse(el.dataset.props || '{}');
  const blueprintPath = props.blueprint_path;

  if (new URLSearchParams(location.search).has('blueprint')) {
    import('./blueprint-mode.js').then(m => m.default(el, blueprintPath));
    return;
  }

  const toggle = el.querySelector('.blueprint-viewer-toggle');
  const drawer = el.querySelector('.blueprint-drawer');
  const closeBtn = el.querySelector('.blueprint-drawer-close');
  const codeEl = el.querySelector('.blueprint-code code');

  if (!toggle || !drawer || !closeBtn) return;

  let loaded = false;

  function isOpen() {
    return !drawer.hidden;
  }

  function open() {
    drawer.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
    if (!loaded) fetchBlueprint();
  }

  function close() {
    drawer.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  // Toggle button
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen()) close(); else open();
  });

  // Close button
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      close();
    }
  });

  // Click outside drawer to close
  document.addEventListener('click', (e) => {
    if (isOpen() && !drawer.contains(e.target) && !toggle.contains(e.target)) {
      close();
    }
  });

  // Prevent clicks inside drawer from closing
  drawer.addEventListener('click', (e) => e.stopPropagation());

  async function fetchBlueprint() {
    if (!blueprintPath) {
      codeEl.textContent = '# No blueprint path specified';
      return;
    }
    try {
      codeEl.textContent = 'Loading…';
      const pageBase = new URL('.', document.baseURI).href;
      // Always try API first (works with both wrangler dev and production)
      const apiRes = await fetch(`${pageBase}api/blueprint/${blueprintPath}`).catch(() => null);
      let text;
      if (apiRes && apiRes.ok) {
        text = await apiRes.text();
      } else {
        // Fallback: direct file fetch (weblisk dev serves filesystem)
        const fileRes = await fetch(`${pageBase}blueprints/${blueprintPath}`);
        if (!fileRes.ok) throw new Error(`${fileRes.status} ${fileRes.statusText}`);
        text = await fileRes.text();
      }
      codeEl.innerHTML = highlightYaml(text);
      loaded = true;
    } catch (err) {
      codeEl.textContent = `# Failed to load blueprint: ${err.message}`;
    }
  }

  /**
   * Lightweight YAML syntax highlighter using the same .syn-* token
   * classes the rest of the site uses.
   */
  function highlightYaml(src) {
    return src
      .split('\n')
      .map(line => {
        // Blank lines
        if (line.trim() === '') return '';
        // Full-line comments
        if (/^\s*#/.test(line)) {
          return `<span class="syn-c">${esc(line)}</span>`;
        }
        // Key: value pairs
        const m = line.match(/^(\s*(?:- )?)([A-Za-z_][A-Za-z0-9_]*)(\s*:\s*)(.*)/);
        if (m) {
          const [, indent, key, colon, val] = m;
          return esc(indent)
            + `<span class="syn-k">${esc(key)}</span>`
            + `<span class="syn-p">${esc(colon)}</span>`
            + highlightValue(val);
        }
        // List item without key (bare value)
        const li = line.match(/^(\s*- )(.*)/);
        if (li) {
          return `<span class="syn-p">${esc(li[1])}</span>` + highlightValue(li[2]);
        }
        // Continuation / multiline string
        return `<span class="syn-s">${esc(line)}</span>`;
      })
      .join('\n');
  }

  function highlightValue(val) {
    if (val === '' || val === '>' || val === '|') {
      return `<span class="syn-p">${esc(val)}</span>`;
    }
    // Inline comment after value
    const commentIdx = val.indexOf(' #');
    let value = val, comment = '';
    if (commentIdx > 0) {
      value = val.slice(0, commentIdx);
      comment = `<span class="syn-c">${esc(val.slice(commentIdx))}</span>`;
    }
    // Numbers
    if (/^\d[\d.]*$/.test(value.trim())) {
      return `<span class="syn-n">${esc(value)}</span>${comment}`;
    }
    // Booleans
    if (/^(true|false|yes|no|null)$/i.test(value.trim())) {
      return `<span class="syn-k">${esc(value)}</span>${comment}`;
    }
    // Quoted strings
    if (/^["']/.test(value.trim())) {
      return `<span class="syn-s">${esc(value)}</span>${comment}`;
    }
    // Bare strings
    return `<span class="syn-s">${esc(value)}</span>${comment}`;
  }

  function esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
