// Settings Island — Two-way form binding to persisted state signals
// Only loaded on /settings via <script type="module"> in the page content.
//
// Integrates: form state machine, undo/redo history, CSRF protection,
// push notifications, route guards, input sanitization, trusted types.

import { effect, enhance } from "weblisk";
import { theme, setTheme, username, setUsername } from "../state.js";
import { formState } from "weblisk/state/form.js";
import { undoable, undoKeyboard } from "weblisk/state/history.js";
import { protectForm } from "weblisk/security/csrf.js";
import { sanitize } from "weblisk/security/sanitize.js";
import { trustedHTML } from "weblisk/security/trusted.js";
import { permission, requestPermission, notify } from "weblisk/pwa/push.js";
import { beforeNavigate, installGuards } from "weblisk/nav/guard.js";
import { announce } from "weblisk/a11y/aria.js";

// ─── Track unsaved changes for route guard ───
let isDirty = false;

// Install guard: warn if leaving with unsaved changes
installGuards();
beforeNavigate((to, from) => {
  if (isDirty) {
    return confirm("You have unsaved changes. Leave this page?");
  }
  return true;
});

// ─── Settings with undo/redo history ───
const [settingsSnap, setSettingsSnap, { undo, redo, canUndo, canRedo }] =
  undoable({
    username: username(),
    theme: theme(),
  });

// Install keyboard shortcuts for undo/redo
const cleanupKeys = undoKeyboard({ undo, redo });

enhance("#settings-form", (form, { $ }) => {
  const nameInput = $("#setting-username");
  const themeSelect = $("#setting-theme");
  const indicator = $("#save-indicator");
  const undoBtn = $("#btn-undo-settings");
  const redoBtn = $("#btn-redo-settings");
  const pushToggle = $("#setting-push");
  const pushStatus = $("#push-status");

  // ─── CSRF protection on the form ───
  protectForm(form);

  let saveTimer;
  function flash(msg) {
    if (indicator) {
      // Use trustedHTML for dynamic content rendering
      try {
        indicator.innerHTML = trustedHTML(
          `<i class="wl-icon wl-i-check wl-icon-16"></i> ${msg || "Saved"}`,
        );
      } catch {
        indicator.textContent = msg || "Saved";
      }
      indicator.hidden = false;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        indicator.hidden = true;
      }, 1500);
    }
    isDirty = false;
    announce(msg || "Settings saved");
  }

  function applySettings(snap) {
    // Sanitize username before applying
    const cleanName = sanitize(snap.username) || "Guest";
    setUsername(cleanName);
    setTheme(snap.theme);
  }

  // Sync form ← signals (on load and after undo/redo)
  effect(() => {
    const snap = settingsSnap();
    nameInput.value = snap.username;
    themeSelect.value = snap.theme;
    applySettings(snap);
  });

  // Undo/redo button state
  if (undoBtn && redoBtn) {
    effect(() => {
      undoBtn.disabled = !canUndo();
    });
    effect(() => {
      redoBtn.disabled = !canRedo();
    });

    undoBtn.addEventListener("click", () => {
      undo();
      flash("Undone");
    });
    redoBtn.addEventListener("click", () => {
      redo();
      flash("Redone");
    });
  }

  // Sync signals ← form (on change) + record history snapshot
  nameInput.addEventListener("input", () => {
    isDirty = true;
    setSettingsSnap((prev) => ({
      ...prev,
      username: nameInput.value || "Guest",
    }));
    flash();
  });

  themeSelect.addEventListener("change", () => {
    isDirty = true;
    setSettingsSnap((prev) => ({ ...prev, theme: themeSelect.value }));
    flash();
  });

  // ─── Push Notifications toggle ───
  if (pushToggle && pushStatus) {
    effect(() => {
      pushStatus.textContent = `Permission: ${permission()}`;
    });

    pushToggle.addEventListener("change", async () => {
      if (pushToggle.checked) {
        const result = await requestPermission();
        if (result === "granted") {
          await notify("Weblisk", { body: "Push notifications enabled!" });
          flash("Notifications enabled");
        } else {
          pushToggle.checked = false;
          announce("Notification permission denied");
        }
      }
    });
  }

  // Prevent actual form submission
  form.addEventListener("submit", (e) => e.preventDefault());
});
