/**
 * Architecture Diagram — hover/tap SVG layers to show details.
 */
export default function archDiagram(container) {
  const layers = container.querySelectorAll('.arch-layer');
  const details = container.querySelectorAll('.arch-detail-content');

  if (!layers.length || !details.length) return;

  function showLayer(name) {
    layers.forEach(l => l.classList.toggle('active', l.dataset.layer === name));
    details.forEach(d => {
      d.hidden = d.dataset.detail !== name;
      if (d.dataset.detail === name) {
        d.style.animation = 'none';
        // Force reflow to restart animation
        void d.offsetHeight;
        d.style.animation = '';
      }
    });
  }

  // Hover on desktop
  layers.forEach(layer => {
    layer.addEventListener('mouseenter', () => showLayer(layer.dataset.layer));
    layer.addEventListener('click', () => showLayer(layer.dataset.layer));
  });

  // Default: show first layer
  showLayer('orchestrator');
}
