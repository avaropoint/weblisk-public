// State Management Island — Interactive demos for state modules.
import { signal, effect, enhance } from "weblisk";
import { idbSignal } from "weblisk/state/idb.js";
import { synced } from "weblisk/state/sync.js";
import { undoable } from "weblisk/state/history.js";
import { formState } from "weblisk/state/form.js";

// ─── IDB Signal demo ───
enhance("#demo-idb", (el, { $ }) => {
  const output = $("#output-idb");
  const btnSet = $("#btn-idb-set");
  const btnGet = $("#btn-idb-get");

  const [val, setVal, { ready }] = idbSignal("demo-idb-value", {
    message: "none",
    ts: 0,
  });

  ready.then(() => {
    output.textContent = `Current: ${JSON.stringify(val(), null, 2)}`;
  });

  btnSet.addEventListener("click", () => {
    const data = {
      message: `Stored at ${new Date().toLocaleTimeString()}`,
      ts: Date.now(),
    };
    setVal(data);
    output.textContent = `Stored: ${JSON.stringify(data, null, 2)}\n(Persisted to IndexedDB — survives refresh)`;
  });

  btnGet.addEventListener("click", () => {
    output.textContent = `📖 Current: ${JSON.stringify(val(), null, 2)}`;
  });
});

// ─── Cross-Tab Sync demo ───
enhance("#demo-sync", (el, { $ }) => {
  const output = $("#output-sync");
  const btn = $("#btn-sync");

  const [count, setCount] = synced("demo-counter", 0);

  effect(() => {
    output.textContent = `Counter: ${count()}\n(Open another tab to see sync!)`;
  });

  btn.addEventListener("click", () => setCount((c) => c + 1));
});

// ─── Undo/Redo demo ───
enhance("#demo-undo", (el, { $ }) => {
  const input = $("#undo-input");
  const output = $("#output-undo");
  const btnUndo = $("#btn-undo");
  const btnRedo = $("#btn-redo");

  const [text, setText, { undo, redo, canUndo, canRedo }] = undoable("");

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => setText(input.value), 300);
  });

  effect(() => {
    const val = text();
    if (input.value !== val) input.value = val;
    output.textContent = `Value: "${val}"\nCan undo: ${canUndo()} | Can redo: ${canRedo()}`;
  });

  btnUndo.addEventListener("click", undo);
  btnRedo.addEventListener("click", redo);
});

// ─── Form State Machine demo ───
enhance("#demo-form", (el, { $ }) => {
  const output = $("#output-form");
  const formEl = $("#demo-form-el");

  const fs = formState({
    fields: {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+$/,
        message: "Invalid email",
      },
      age: {
        required: true,
        validate: (v) => {
          const n = parseInt(v);
          if (isNaN(n) || n < 1 || n > 120) return "Must be 1-120";
          return null;
        },
      },
    },
    onSubmit: async (values) => {
      await new Promise((r) => setTimeout(r, 500)); // simulate
      console.log("[form.js] Submitted:", values);
    },
  });

  fs.bind(formEl);

  effect(() => {
    const errs = fs.errors();
    const vals = fs.values();
    let text = `Values: ${JSON.stringify(vals)}\n`;
    text += `Valid: ${fs.valid()} | Dirty: ${fs.dirty()}\n`;
    if (Object.keys(errs).length) text += `Errors: ${JSON.stringify(errs)}`;
    if (fs.submitted()) text += "\nForm submitted successfully!";
    if (fs.submitting()) text = "Submitting...";
    output.textContent = text;
  });
});
