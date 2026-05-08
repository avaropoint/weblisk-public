/**
 * Stat Counter — animates numbers from 0 to their target value.
 * Reads data-count (target number) and data-suffix (e.g. "+") from each .stat-number.
 * Uses requestAnimationFrame for smooth 60fps animation.
 */
export default function statCounter(container) {
  const numbers = container.querySelectorAll('.stat-number[data-count]');
  if (!numbers.length) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const duration = 1200; // ms

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function animateNumber(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';

    if (target === 0) {
      el.textContent = '0' + suffix;
      return;
    }

    const start = performance.now();
    el.textContent = '0' + suffix;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(easeOutExpo(progress) * target);
      el.textContent = value + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  // Animate all numbers
  numbers.forEach(animateNumber);
}
