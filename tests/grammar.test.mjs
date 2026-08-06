// The grammar is the shared contract: the repo-side gate and the dashboard's parser both import
// it. These tests pin the exact cases that were silently failing when the rule lived in two
// places — a task line that does not parse is invisible, not rejected, so nothing tells you.

import assert from "node:assert/strict";
import test from "node:test";

import {
  diagnoseTaskLine,
  parseBacklog,
  statusFromMarker,
  TASK_RE,
  tierFrom,
} from "../lib/grammar.mjs";

test("parses a well-formed task line", () => {
  const m = "- [ ] **CA.1.1** i18n — externalize admin strings".match(TASK_RE);
  assert.ok(m);
  assert.equal(m[2], "CA.1.1");
  assert.equal(m[3], "i18n — externalize admin strings");
});

test("accepts every marker", () => {
  for (const [marker, status] of [
    ["[ ]", "todo"],
    ["[x]", "done"],
    ["→", "in-progress"],
    ["⏸", "blocked"],
    ["↷", "stretch"],
  ]) {
    const line = `- ${marker} **AB.1** title`;
    const m = line.match(TASK_RE);
    assert.ok(m, `marker ${marker} should parse`);
    assert.equal(statusFromMarker(m[1]), status);
  }
});

test("diagnoses a checkbox AND a glyph on one line", () => {
  const d = diagnoseTaskLine("- [ ] ↷ **SP.1** keyset paging");
  assert.match(d.problem, /two markers/);
});

test("diagnoses a hyphenated id", () => {
  const d = diagnoseTaskLine("- [ ] **T2-IN** harvest pipeline");
  assert.match(d.problem, /hyphen/);
});

test("diagnoses a title sitting in the id slot", () => {
  const d = diagnoseTaskLine("- [ ] ↷ **Semantic project search** — substring filter today");
  // Two markers is reported first: it is the outer error, and fixing it surfaces the inner one.
  assert.ok(d.problem.length > 0);
  const d2 = diagnoseTaskLine("- [ ] **Semantic project search** — substring filter today");
  assert.match(d2.problem, /title, not an id/);
});

test("diagnoses an actionable line with no id at all", () => {
  const d = diagnoseTaskLine("- ⏸ Real provider integration — blocked on credentials");
  assert.match(d.problem, /no id/);
});

test("returns null for lines that are not tasks and for valid ones", () => {
  assert.equal(diagnoseTaskLine("Some prose."), null);
  assert.equal(diagnoseTaskLine("- [ ] **AB.1** fine"), null);
});

test("a section header sets the default tier for tasks beneath it", () => {
  const md = [
    "## Block **[D]**",
    "",
    "- [ ] **AB.1** inherits dark",
    "- [ ] **AB.2** explicit **[T]**",
  ].join("\n");
  const tasks = parseBacklog(md, "demo");
  assert.equal(tasks[0].autonomy, "dark");
  assert.equal(tasks[1].autonomy, "trivial");
});

test("tierFrom reads an inline tier marker", () => {
  assert.equal(tierFrom("something **[P]** else"), "plan-gated");
  assert.equal(tierFrom("no marker"), undefined);
});
