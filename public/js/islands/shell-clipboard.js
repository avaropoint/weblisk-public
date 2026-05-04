// Shell — Copy-to-clipboard handler for code blocks and install commands.

export async function initClipboard() {
  const { writeText } = await import("weblisk/ui/clipboard.js");
  document.addEventListener("click", (e) => {
    const copyBtn = e.target.closest("[data-copy], [data-copy-target]");
    if (!copyBtn) return;
    const text =
      copyBtn.dataset.copy ||
      document.getElementById(copyBtn.dataset.copyTarget)?.textContent;
    if (!text) return;
    writeText(text.trim()).then((ok) => {
      if (!ok) return;
      const icon = copyBtn.querySelector(".wl-icon");
      if (icon) {
        icon.classList.replace("wl-i-copy", "wl-i-check");
        setTimeout(
          () => icon.classList.replace("wl-i-check", "wl-i-copy"),
          1500,
        );
      }
    });
  });
}
