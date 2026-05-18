/**
 * Blueprint Tabs Island
 * ARIA-compliant tablist with keyboard navigation.
 * Hydration: visible
 */
export default function blueprintTabs(el) {
  if (el._bpTabsInit) return;
  el._bpTabsInit = true;

  const tabs = Array.from(el.querySelectorAll('[role="tab"]'));
  const panels = Array.from(el.querySelectorAll('[role="tabpanel"]'));

  if (!tabs.length) return;

  function activate(index) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }

  // Click handler
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      activate(i);
      tab.focus();
    });
  });

  // Keyboard navigation (Arrow keys, Home, End)
  el.querySelector('[role="tablist"]').addEventListener('keydown', e => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let next = current;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    activate(next);
    tabs[next].focus();
  });

  // Ensure initial state is correct
  activate(0);
}
