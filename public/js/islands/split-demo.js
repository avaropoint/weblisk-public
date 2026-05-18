/**
 * Split Demo — tab switching for the generate output pane.
 * Switches between Go / Node.js / Rust output views.
 */
export default function splitDemo(container) {
  const tabs = container.querySelectorAll('.split-tab');
  const outputs = container.querySelectorAll('.split-output');

  if (!tabs.length || !outputs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      outputs.forEach(o => {
        o.hidden = o.dataset.tabContent !== target;
      });
    });
  });
}
