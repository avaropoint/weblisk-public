// Data & Sync Island — Interactive demos for data and sync modules.
import { signal, effect, enhance } from "weblisk";
import { collection } from "weblisk/data/store.js";
import {
  syncStatus as ss,
  pendingCount as pc,
  countPending,
  triggerSync,
} from "weblisk/pwa/offline.js";

// ─── Local-First Store demo ───
enhance("#demo-store", (el, { $ }) => {
  const output = $("#output-store");
  const btnAdd = $("#btn-store-add");
  const btnList = $("#btn-store-list");
  const btnClear = $("#btn-store-clear");

  const todos = collection("demo-todos");
  const live = todos.live();
  let itemNum = 0;

  effect(() => {
    const items = live();
    if (items.length === 0) {
      output.textContent = "No items";
    } else {
      output.textContent = items
        .map(
          (i) => `• ${i.text} (${new Date(i._updated).toLocaleTimeString()})`,
        )
        .join("\n");
      output.textContent += `\n\n${items.length} item(s) in IDB — survives refresh`;
    }
  });

  btnAdd.addEventListener("click", async () => {
    itemNum++;
    await todos.put({
      text: `Task #${itemNum} — ${new Date().toLocaleTimeString()}`,
    });
  });

  btnList.addEventListener("click", async () => {
    const all = await todos.getAll();
    output.textContent = `Total: ${all.length} item(s)\n`;
    output.textContent += all
      .map((i) => `  ${i.id.slice(0, 8)}… ${i.text}`)
      .join("\n");
  });

  btnClear.addEventListener("click", async () => {
    const all = await todos.getAll();
    for (const item of all) await todos.delete(item.id);
    output.textContent = "🗑️ Cleared all items";
  });
});

// ─── Sync Status demo ───
enhance("#demo-sync-status", (el, { $ }) => {
  const output = $("#output-sync-status");
  const btnTrigger = $("#btn-sync-trigger");
  const btnCount = $("#btn-sync-count");

  effect(() => {
    const status = ss();
    const pending = pc();
    output.textContent = `Sync Status: ${status}\nPending: ${pending} mutation(s)\n`;
    output.textContent +=
      "\nMutations queue via Background Sync.\nSW replays them when connectivity returns.";
  });

  btnTrigger.addEventListener("click", async () => {
    output.textContent = "Triggering sync...";
    await triggerSync();
    output.textContent = "Sync triggered (SW will process queue)";
  });

  btnCount.addEventListener("click", async () => {
    const count = await countPending();
    output.textContent = `📊 Pending mutations: ${count}`;
  });
});
