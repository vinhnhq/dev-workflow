// The grammar — ONE definition, imported by everything that reads a backlog.
//
// This file exists because the rule was defined twice: once in the repo-side
// validator and once in the dashboard's parser. Two copies of a regex that
// decides whether a task is *visible* is a silent-data-loss bug waiting to
// happen — a task the parser cannot read is never scheduled and never reported
// as skipped. Consumers import from here; nobody re-derives it.
//
// Pure: no I/O, no config, no Node built-ins. Safe to import from a bundler,
// a test, a Bun script, or a Next.js server component.

/** Task line: `- <marker> **<id>** <title>`. */
export const TASK_RE = /^\s*-\s*(\[[ xX]\]|·|✎|⏸|↷|✓|→)\s*\*\*([\w.]+)\*\*\s*(.*)$/;

/** Anything that *looks* like a task, so we can diagnose near-misses instead of ignoring them. */
export const LOOKS_LIKE_TASK = /^\s*-\s*(\[[ xX]\]|·|✎|⏸|↷|✓|→)/;

/** Section header — sets a default autonomy tier for the tasks beneath it. */
export const HEADER_RE = /^#{2,4}\s+(.*)$/;

/** Inline tier marker, e.g. `**[P]**`. */
export const TIER_RE = /\*\*\[([SPDT])\]\*\*/;

export const TIER = {
  S: "supervised",
  P: "plan-gated",
  D: "dark",
  T: "trivial",
};

/** DoR field labels, in the order they should appear under a task. */
export const FIELD_LABELS = ["Intent", "Touches", "Must NOT", "Oracle", "Evidence", "Escalate if"];

/** A task is READY only when all of these are present. Derived, never stored. */
export const DOR_FIELDS = [
  "intent",
  "autonomy",
  "touches",
  "mustNot",
  "oracle",
  "evidence",
  "escalateIf",
];

/** Frontmatter keys every `.md` under the doc root must carry. */
export const REQUIRED_FRONTMATTER = ["id", "kind", "title", "description"];

export const DOC_KINDS = ["adr", "spec", "doc", "retro", "tasks"];

/** Length budgets. A title is a card label; a description is one line of a digest. */
export const LIMITS = { title: 60, description: 160 };

export function statusFromMarker(marker) {
  if (marker === "[x]" || marker === "[X]" || marker === "✓") return "done";
  if (marker === "→") return "in-progress";
  if (marker === "⏸") return "blocked";
  if (marker === "↷") return "stretch";
  return "todo";
}

export function tierFrom(text) {
  const m = text.match(TIER_RE);
  return m ? TIER[m[1]] : undefined;
}

/**
 * Why a task-looking line failed to parse.
 *
 * Each cause has a different fix, so a generic "invalid task" message would
 * make the reader guess. Returns null when the line is fine.
 */
export function diagnoseTaskLine(line) {
  if (!LOOKS_LIKE_TASK.test(line)) return null;
  if (TASK_RE.test(line)) return null;

  if (/^\s*-\s*\[[ xX]\]\s*(·|✎|⏸|↷|✓|→)/.test(line)) {
    return {
      problem: "two markers on one line (a checkbox AND a status glyph)",
      fix: "keep exactly one: `- ↷ **ID** title`, not `- [ ] ↷ **ID** title`",
    };
  }
  if (/\*\*[\w.]*-[\w.-]*\*\*/.test(line)) {
    return {
      problem: "task id contains a hyphen",
      fix: "use dots only — `T2.IN`, not `T2-IN` (the id charset is [A-Za-z0-9_.])",
    };
  }
  if (/\*\*[^*]*\s[^*]*\*\*/.test(line)) {
    return {
      problem: "the bold slot holds a title, not an id",
      fix: "bold means id and nothing else: `- [ ] **SP.13** Semantic project search`",
    };
  }
  return {
    problem: "actionable line with no id",
    fix: "add one: `- [ ] **XX.1** short title`",
  };
}

/** Parse a backlog into structured tasks. The dashboard and the gate share this. */
export function parseBacklog(markdown, project) {
  const lines = markdown.split("\n");
  const tasks = [];
  let sectionTier;
  let cur = null;

  const flush = () => {
    if (!cur) return;
    const perTaskTier = tierFrom(cur.rest);
    tasks.push({
      id: cur.id,
      project,
      title: cur.rest
        .replace(TIER_RE, "")
        .replace(/→\s*$/, "")
        .trim(),
      status: statusFromMarker(cur.marker),
      autonomy: perTaskTier ?? sectionTier,
      body: cur.body.join(" "),
    });
    cur = null;
  };

  for (const line of lines) {
    const header = line.match(HEADER_RE);
    if (header) {
      flush();
      sectionTier = tierFrom(header[1]);
      continue;
    }
    const task = line.match(TASK_RE);
    if (task) {
      flush();
      cur = { marker: task[1], id: task[2], rest: task[3], body: [] };
      continue;
    }
    if (cur) cur.body.push(line.replace(/^\s*-\s+/, ""));
  }
  flush();

  return tasks;
}
