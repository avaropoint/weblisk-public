/**
 * Use Case Expand — click a card to reveal blueprint/endpoint/agent stats.
 */
export default function usecaseExpand(container) {
  const cards = container.querySelectorAll('.usecase-card[data-expandable]');

  cards.forEach(card => {
    const detail = card.querySelector('.usecase-detail');
    if (!detail) return;

    card.setAttribute('aria-expanded', 'false');

    card.addEventListener('click', () => {
      const isOpen = card.getAttribute('aria-expanded') === 'true';

      // Close all others
      cards.forEach(c => {
        c.setAttribute('aria-expanded', 'false');
        const d = c.querySelector('.usecase-detail');
        if (d) d.hidden = true;
      });

      // Toggle this one
      if (!isOpen) {
        card.setAttribute('aria-expanded', 'true');
        detail.hidden = false;
      }
    });
  });
}
