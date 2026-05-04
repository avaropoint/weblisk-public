// Weblisk v2 — Shared Application State
// Signals synced across tabs via BroadcastChannel + localStorage.

import { synced } from "weblisk/state/sync.js";

export const [theme, setTheme] = synced("theme", "light");
export const [username, setUsername] = synced("username", "Guest");
