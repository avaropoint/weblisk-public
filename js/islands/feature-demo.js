// Feature Demo Island — Preview/Code toggle, viewport switching, copy button, code tabs.

export default function featureDemo(el) {
  // Handle all feature-demo blocks within this section
  const blocks = el.querySelectorAll('.feature-demo');
  blocks.forEach(initFeatureDemo);
}

function initFeatureDemo(block) {
  // Preview / Code tabs
  const tabs = block.querySelectorAll('.feature-demo-tab');
  const preview = block.querySelector('.feature-demo-preview');
  const code = block.querySelector('.feature-demo-code');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      if (target === 'preview' && preview) {
        preview.style.display = '';
        if (code) code.classList.remove('active');
      } else if (target === 'code' && code) {
        preview.style.display = 'none';
        code.classList.add('active');
      }
    });
  });

  // Viewport toggle buttons (mobile / tablet / desktop)
  const vpBtns = block.querySelectorAll('.feature-demo-viewport-btn');
  vpBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      vpBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (preview) {
        preview.classList.remove('viewport-mobile', 'viewport-tablet');
        const vp = btn.dataset.viewport;
        if (vp === 'mobile') preview.classList.add('viewport-mobile');
        else if (vp === 'tablet') preview.classList.add('viewport-tablet');
      }
    });
  });

  // Code sub-tabs (HTML / CSS / JS)
  const codeTabs = block.querySelectorAll('.feature-demo-code-tab');
  const codePanels = block.querySelectorAll('.feature-demo-code-panel');
  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      codePanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = block.querySelector(`.feature-demo-code-panel[data-lang="${tab.dataset.lang}"]`);
      if (panel) panel.classList.add('active');
    });
  });

  // Copy button
  const copyBtn = block.querySelector('.feature-demo-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const activePanel = block.querySelector('.feature-demo-code-panel.active pre');
      if (!activePanel) return;
      const text = activePanel.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const icon = copyBtn.querySelector('.wl-icon');
        if (icon) {
          icon.classList.replace('wl-i-copy', 'wl-i-check');
          setTimeout(() => icon.classList.replace('wl-i-check', 'wl-i-copy'), 1500);
        }
      });
    });
  }
}
