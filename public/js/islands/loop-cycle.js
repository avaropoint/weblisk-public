/**
 * Loop cycle island — animates the autonomous loop steps
 * Steps activate sequentially, then cycle continuously to
 * reinforce the "continuous improvement" message.
 */
export default function init(el) {
  const steps = el.querySelectorAll('.loop-step');
  const connectors = el.querySelectorAll('.loop-connector');
  if (!steps.length) return;

  // Remove initial active state
  steps.forEach(s => s.classList.remove('loop-step-active'));

  let animated = false;
  let cycleInterval = null;

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || animated) return;
    animated = true;
    observer.disconnect();

    // Initial sequential reveal
    steps.forEach((step, i) => {
      setTimeout(() => {
        step.style.opacity = '1';
        step.style.transform = 'translateY(0)';
      }, i * 300);
    });

    connectors.forEach((conn, i) => {
      setTimeout(() => {
        conn.style.opacity = '1';
      }, (i + 1) * 300 - 150);
    });

    // After initial reveal, start cycling
    setTimeout(() => {
      let active = 0;
      steps[0].classList.add('loop-step-active');

      cycleInterval = setInterval(() => {
        steps[active].classList.remove('loop-step-active');
        active = (active + 1) % steps.length;
        steps[active].classList.add('loop-step-active');
      }, 2500);
    }, steps.length * 300 + 500);
  }, { threshold: 0.3 });

  // Set initial hidden state
  steps.forEach(step => {
    step.style.opacity = '0';
    step.style.transform = 'translateY(12px)';
    step.style.transition = 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.3s ease, border-color 0.3s ease';
  });

  connectors.forEach(conn => {
    conn.style.opacity = '0';
    conn.style.transition = 'opacity 0.3s ease';
  });

  observer.observe(el);

  // Pause cycling on hover
  el.addEventListener('mouseenter', () => {
    if (cycleInterval) clearInterval(cycleInterval);
  });

  el.addEventListener('mouseleave', () => {
    if (!animated) return;
    let active = Array.from(steps).findIndex(s => s.classList.contains('loop-step-active'));
    if (active < 0) active = 0;

    cycleInterval = setInterval(() => {
      steps[active].classList.remove('loop-step-active');
      active = (active + 1) % steps.length;
      steps[active].classList.add('loop-step-active');
    }, 2500);
  });
}
