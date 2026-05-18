/**
 * Pipeline island — animates the blueprint-to-UI pipeline stages
 * Stages light up sequentially when scrolled into view, showing
 * the flow from blueprint → generated layers → rendered output.
 */
export default function init(el) {
  const stages = el.querySelectorAll('.pipeline-stage');
  const arrows = el.querySelectorAll('.pipeline-arrow');
  if (!stages.length) return;

  // Remove initial active state, will re-apply on scroll
  stages.forEach(s => s.classList.remove('pipeline-stage-active'));

  let animated = false;

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || animated) return;
    animated = true;
    observer.disconnect();

    // Sequentially activate each stage
    stages.forEach((stage, i) => {
      setTimeout(() => {
        stage.classList.add('pipeline-stage-active');
        stage.style.opacity = '1';
        stage.style.transform = 'translateY(0)';
      }, i * 400);
    });

    // Activate arrows between stages
    arrows.forEach((arrow, i) => {
      setTimeout(() => {
        arrow.style.opacity = '1';
      }, (i + 1) * 400 - 200);
    });
  }, { threshold: 0.2 });

  // Set initial hidden state
  stages.forEach(stage => {
    stage.style.opacity = '0';
    stage.style.transform = 'translateY(12px)';
    stage.style.transition = 'opacity 0.5s ease, transform 0.5s ease, box-shadow 0.3s ease';
  });

  arrows.forEach(arrow => {
    arrow.style.opacity = '0';
    arrow.style.transition = 'opacity 0.4s ease';
  });

  observer.observe(el);

  // Hover interaction: highlight related layers
  const layers = el.querySelectorAll('.pipeline-layer');
  layers.forEach(layer => {
    layer.addEventListener('mouseenter', () => {
      layers.forEach(l => {
        if (l !== layer) l.style.opacity = '0.5';
      });
    });
    layer.addEventListener('mouseleave', () => {
      layers.forEach(l => l.style.opacity = '1');
    });
  });
}
