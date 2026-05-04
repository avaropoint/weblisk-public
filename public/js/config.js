// Weblisk — Application Configuration
// Single source of truth for brand, routes, and shell content.

export const app = {
  name: "Weblisk",
  version: "1.0",
  cdn: "https://cdn.weblisk.dev",
  icon: "bolt",
  taglines: ["Zero dependencies", "No build step", "Software finally has blueprints"],
};

export const routes = [
  {
    path: "/",
    label: "Home",
    icon: "home",
    desc: "The specification layer for software",
  },
  {
    path: "/platform/",
    label: "Platform",
    icon: "layers",
    desc: "Blueprints, agents, and server specifications",
  },
  {
    path: "/marketplace/",
    label: "Marketplace",
    icon: "globe",
    desc: "Community blueprints, agents, and templates",
  },
  {
    path: "/docs/",
    label: "Docs",
    icon: "book",
    desc: "Documentation",
  },
  {
    path: "/docs/quick-start.html",
    label: "Quick Start",
    icon: "bolt",
    desc: "Get started in under a minute",
  },
  {
    path: "/docs/installation.html",
    label: "Installation",
    icon: "box",
    desc: "Install and scaffold a project",
  },
];

// Shell configuration — loaded by shell.js for runtime behaviour
export const shell = {
  theme: {
    default: "light",
    storageKey: "wl-theme",
  },
  sw: {
    enabled: true,
    path: "/sw.js",
  },
};
