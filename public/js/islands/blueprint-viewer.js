/**
 * Blueprint Viewer Island
 * Activated by ?blueprint query parameter — full-page "View Source"
 * for the blueprint, like browser View Source but for specs.
 * Hydration: idle — loads after initial paint.
 */
export default function blueprintViewer(el) {
  if (el._bpViewerInit) return;
  el._bpViewerInit = true;

  const props = JSON.parse(el.dataset.props || '{}');
  const blueprintPath = props.blueprint_path;

  if (new URLSearchParams(location.search).has('blueprint')) {
    import('./blueprint-mode.js').then(m => m.default(el, blueprintPath));
  }
}
