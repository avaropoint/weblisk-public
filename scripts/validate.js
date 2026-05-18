#!/usr/bin/env node
/**
 * Weblisk Blueprint Validator
 * ───────────────────────────
 * Validates all HTML pages in public/ against blueprint specifications.
 * Run: node scripts/validate.js
 *
 * Checks performed:
 *  1. Required <head> elements (theme script, importmap, OG meta, etc.)
 *  2. Body structure (skip link, nav island, footer, shell.js)
 *  3. Path consistency (no relative ./ paths)
 *  4. Footer link validity (all internal links resolve to real files)
 *  5. Theme storage key consistency
 *  6. Dark mode support (prefers-color-scheme fallback)
 *  7. Structured data presence
 *  8. Accessibility baseline (skip link, aria-labels, lang attr)
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PUBLIC = join(import.meta.dirname, "..", "public");
const ERRORS = [];
const WARNINGS = [];

// ─── Helpers ────────────────────────────────────────────────
function walk(dir, ext) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

function error(file, rule, msg) {
  ERRORS.push({ file: relative(PUBLIC, file), rule, msg });
}

function warn(file, rule, msg) {
  WARNINGS.push({ file: relative(PUBLIC, file), rule, msg });
}

// ─── Validation Rules ───────────────────────────────────────

function validateHtml(filePath) {
  const html = readFileSync(filePath, "utf8");
  const rel = relative(PUBLIC, filePath);

  // 1. html lang and dir
  if (!html.includes('lang="en"')) {
    error(filePath, "html-lang", "Missing lang=\"en\" on <html>");
  }
  if (!html.includes('dir="ltr"')) {
    warn(filePath, "html-dir", "Missing dir=\"ltr\" on <html>");
  }

  // 2. Theme FOUC prevention script
  if (!html.includes("localStorage.getItem('wl-theme')") &&
      !html.includes('localStorage.getItem("wl-theme")')) {
    error(filePath, "theme-script", "Missing theme FOUC prevention script in <head>");
  }

  // 3. Import map
  if (!html.includes('"importmap"')) {
    error(filePath, "importmap", "Missing <script type=\"importmap\"> in <head>");
  }

  // 4. Stylesheet
  if (!html.includes('href="/css/styles.css"') && !html.includes("href='/css/styles.css'")) {
    error(filePath, "stylesheet", "Missing /css/styles.css link");
  }

  // 5. Skip link (except 404)
  if (!rel.includes("404")) {
    if (!html.includes("wl-skip-link")) {
      error(filePath, "skip-link", "Missing skip-to-content link");
    }
  }

  // 6. Shell.js
  if (!html.includes('src="/js/islands/shell.js"')) {
    error(filePath, "shell-script", "Missing shell.js module script");
  }

  // 7. Nav island
  if (!html.includes('data-island="/js/islands/nav.js"')) {
    error(filePath, "nav-island", "Missing nav.js island reference");
  }

  // 8. No relative paths for assets
  const relativePathMatch = html.match(/(?:href|src)="\.\/(?:js|css|images)\//g);
  if (relativePathMatch) {
    error(filePath, "relative-paths", `Found ${relativePathMatch.length} relative asset path(s) — use absolute /`);
  }

  // 9. Footer links point to existing files
  const footerMatch = html.match(/<!-- ─── Footer ─── -->[\s\S]*?<\/footer>/);
  if (footerMatch) {
    const internalLinks = [...footerMatch[0].matchAll(/href="(\/[^"]+)"/g)];
    for (const [, href] of internalLinks) {
      // Normalize: /docs/ → /docs/index.html
      let target = href;
      if (target.endsWith("/")) target += "index.html";
      const targetPath = join(PUBLIC, target);
      if (!existsSync(targetPath)) {
        error(filePath, "footer-dead-link", `Footer links to ${href} which does not exist`);
      }
    }
  }

  // 10. OG meta (docs and platform pages)
  if (rel.startsWith("docs/") || rel.startsWith("platform/")) {
    if (!html.includes('og:title')) {
      warn(filePath, "og-meta", "Missing og:title meta tag");
    }
    if (!html.includes('og:description')) {
      warn(filePath, "og-meta", "Missing og:description meta tag");
    }
    if (!html.includes('og:image')) {
      warn(filePath, "og-meta", "Missing og:image meta tag");
    }
  }

  // 11. Structured data
  if (rel.startsWith("docs/") && !rel.includes("index.html")) {
    if (!html.includes('"TechArticle"')) {
      warn(filePath, "structured-data", "Missing TechArticle structured data");
    }
    if (!html.includes('"BreadcrumbList"')) {
      warn(filePath, "structured-data", "Missing BreadcrumbList structured data");
    }
  }

  // 12. Manifest
  if (!html.includes('rel="manifest"')) {
    warn(filePath, "manifest", "Missing manifest link");
  }

  // 13. Consistent theme-color
  if (html.includes('content="#0f172a"') && html.includes('theme-color')) {
    warn(filePath, "theme-color", "theme-color is #0f172a — should be #1a1f36 for consistency");
  }

  // 14. Twitter card
  if (rel.startsWith("docs/") || rel.startsWith("platform/")) {
    if (!html.includes('twitter:card')) {
      warn(filePath, "twitter-card", "Missing twitter:card meta tag");
    }
  }

  // 15. Check theme storage key consistency in inline scripts
  if (html.includes("localStorage.getItem('theme')") || html.includes('localStorage.getItem("theme")')) {
    if (!html.includes("wl-theme")) {
      error(filePath, "storage-key", "Uses 'theme' storage key instead of 'wl-theme'");
    }
  }
}

// ─── Run ────────────────────────────────────────────────────

console.log("🔍 Weblisk Blueprint Validator\n");
console.log("Scanning public/ for HTML files...\n");

const htmlFiles = walk(PUBLIC, ".html");
console.log(`Found ${htmlFiles.length} HTML files\n`);

for (const file of htmlFiles) {
  validateHtml(file);
}

// ─── CSS Checks ─────────────────────────────────────────────

const cssPath = join(PUBLIC, "css", "styles.css");
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, "utf8");

  // Check for prefers-color-scheme fallback
  if (!css.includes("prefers-color-scheme")) {
    error(cssPath, "color-scheme-fallback", "Missing @media (prefers-color-scheme: dark) fallback");
  }

  // Check for color-scheme property
  if (!css.includes("color-scheme:")) {
    warn(cssPath, "color-scheme-prop", "Missing color-scheme property on :root and [data-theme]");
  }
}

// ─── JS Checks ──────────────────────────────────────────────

const stateJs = join(PUBLIC, "js", "state.js");
if (existsSync(stateJs)) {
  const state = readFileSync(stateJs, "utf8");
  if (state.includes('synced("theme"') && !state.includes('synced("wl-theme"')) {
    error(stateJs, "storage-key-mismatch", "state.js uses 'theme' key — must match 'wl-theme' from inline scripts");
  }
}

// ─── Report ─────────────────────────────────────────────────

console.log("─".repeat(60));

if (ERRORS.length === 0 && WARNINGS.length === 0) {
  console.log("\n✅ All checks passed! No issues found.\n");
  process.exit(0);
}

if (ERRORS.length > 0) {
  console.log(`\n❌ ${ERRORS.length} ERROR(S):\n`);
  for (const { file, rule, msg } of ERRORS) {
    console.log(`  ${file}`);
    console.log(`    [${rule}] ${msg}\n`);
  }
}

if (WARNINGS.length > 0) {
  console.log(`\n⚠️  ${WARNINGS.length} WARNING(S):\n`);
  for (const { file, rule, msg } of WARNINGS) {
    console.log(`  ${file}`);
    console.log(`    [${rule}] ${msg}\n`);
  }
}

console.log("─".repeat(60));
console.log(`\nTotal: ${ERRORS.length} errors, ${WARNINGS.length} warnings`);
process.exit(ERRORS.length > 0 ? 1 : 0);
