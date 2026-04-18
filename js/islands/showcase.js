// Showcase Island — Preview/Code toggle, viewport switching, copy button, code tabs.

export default function showcase(el) {
  // Handle all showcase blocks within this section
  const blocks = el.querySelectorAll('.showcase');
  blocks.forEach(initShowcase);
}

function initShowcase(block) {
  // Preview / Code tabs
  const tabs = block.querySelectorAll('.showcase-tab');
  const preview = block.querySelector('.showcase-preview');
  const code = block.querySelector('.showcase-code');

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
  const vpBtns = block.querySelectorAll('.showcase-viewport-btn');
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
  const codeTabs = block.querySelectorAll('.showcase-code-tab');
  const codePanels = block.querySelectorAll('.showcase-code-panel');
  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      codePanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = block.querySelector(`.showcase-code-panel[data-lang="${tab.dataset.lang}"]`);
      if (panel) panel.classList.add('active');
    });
  });

  // Copy button
  const copyBtn = block.querySelector('.showcase-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const activePanel = block.querySelector('.showcase-code-panel.active pre');
      if (!activePanel) return;
      const text = activePanel.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const orig = copyBtn.innerHTML;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.innerHTML = orig; }, 1500);
      });
    });
  }
}
