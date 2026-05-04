// Navigation Island — enhances the existing <nav> markup.
// Wires up theme toggle, mobile menu, and sidebar injection via signals.

import { effect } from "weblisk";
import { theme, setTheme } from "../state.js";

export default function nav(el) {
  const themeBtn = el.querySelector("#theme-toggle");
  const themeIcon = el.querySelector("#theme-icon");
  const mobileBtn =
    el.querySelector("#nav-toggle") || el.querySelector("#mobile-menu-btn");
  const navLinks = el.querySelector(".nav-links");

  // Theme toggle
  if (themeBtn && themeIcon) {
    themeBtn.addEventListener("click", () =>
      setTheme(theme() === "light" ? "dark" : "light"),
    );
    effect(() => {
      const t = theme();
      document.documentElement.dataset.theme = t;
      themeIcon.className = `wl-icon wl-icon-18 wl-i-${t === "light" ? "moon" : "sun"}`;
    });
  }

  // Mobile menu toggle
  if (mobileBtn && navLinks) {
    mobileBtn.setAttribute("aria-controls", "nav-links");
    navLinks.id = navLinks.id || "nav-links";
    mobileBtn.addEventListener("click", () => {
      const expanded = mobileBtn.getAttribute("aria-expanded") === "true";
      mobileBtn.setAttribute("aria-expanded", String(!expanded));
      navLinks.classList.toggle("open", !expanded);
    });
  }

  // Inject sidebar links into mobile hamburger menu
  if (navLinks) {
    const sidebar =
      document.querySelector(".docs-sidebar") ||
      document.querySelector(".examples-sidebar");
    if (sidebar) {
      const section = document.createElement("div");
      section.className = "nav-sidebar-section";
      section.setAttribute("role", "navigation");
      section.setAttribute("aria-label", "Page navigation");

      for (const child of sidebar.children) {
        if (child.matches("h2, h3")) {
          const heading = document.createElement("span");
          heading.className = "nav-sidebar-heading";
          heading.textContent = child.textContent;
          section.appendChild(heading);
        } else if (child.matches("nav")) {
          for (const link of child.querySelectorAll("a")) {
            const a = document.createElement("a");
            a.href = link.href;
            a.className = "nav-sidebar-link";
            a.innerHTML = link.innerHTML;
            if (link.classList.contains("active") || link.hasAttribute("aria-current")) {
              a.classList.add("active");
              a.setAttribute("aria-current", "page");
            }
            section.appendChild(a);
          }
        } else if (child.matches("a")) {
          const a = document.createElement("a");
          a.href = child.href;
          a.className = "nav-sidebar-link";
          a.innerHTML = child.innerHTML;
          if (child.classList.contains("active") || child.hasAttribute("aria-current")) {
            a.classList.add("active");
            a.setAttribute("aria-current", "page");
          }
          section.appendChild(a);
        } else if (child.matches("nav.examples-subnav, .examples-subnav")) {
          for (const link of child.querySelectorAll("a")) {
            const a = document.createElement("a");
            a.href = link.href;
            a.className = "nav-sidebar-link nav-sidebar-sub";
            a.innerHTML = link.innerHTML;
            if (link.classList.contains("active") || link.hasAttribute("aria-current")) {
              a.classList.add("active");
              a.setAttribute("aria-current", "page");
            }
            section.appendChild(a);
          }
        }
      }

      if (section.children.length) {
        navLinks.appendChild(section);
      }
    }
  }
}
