// Scheduler Island — Interactive demo for task scheduling.
import { enhance } from "weblisk";
import { scheduleTask } from "weblisk/core/scheduler.js";

// ─── Scheduler demo ───
enhance("#demo-scheduler", (el, { $ }) => {
  const output = $("#output-scheduler");
  const btn = $("#btn-scheduler");

  btn.addEventListener("click", async () => {
    output.textContent = "Scheduling 3 tasks at different priorities...\n";
    const log = [];

    await Promise.all([
      scheduleTask(() => {
        log.push("[3] background");
      }, "background"),
      scheduleTask(() => {
        log.push("[2] user-visible");
      }, "user-visible"),
      scheduleTask(() => {
        log.push("[1] user-blocking");
      }, "user-blocking"),
    ]);

    output.textContent += log.join("\n") + "\n\nDone — tasks executed by priority";
  });
});
