// Shell — Version badge: fetch latest from CDN.
// Updates .version-badge elements with the released version.
// Falls back to the hardcoded value in the HTML if the fetch fails.

export async function initVersion() {
  try {
    const { app } = await import("../config.js");
    const res = await fetch(`${app.cdn}/version.json`);
    if (!res.ok) return;
    const { version } = await res.json();
    if (!version) return;
    app.version = version;
    document.querySelectorAll(".version-badge").forEach((el) => {
      el.textContent = `v${version}`;
    });
  } catch {}
}
