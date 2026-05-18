/**
 * Scroll Reveal — IntersectionObserver for [data-reveal] and [data-reveal-stagger]
 * Adds .revealed class when element enters viewport (once).
 */
export default function scrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-reveal],[data-reveal-stagger]').forEach(el => {
      el.classList.add('revealed');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('[data-reveal],[data-reveal-stagger]').forEach(el => {
    observer.observe(el);
  });
}
