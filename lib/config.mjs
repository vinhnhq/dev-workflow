// Per-project conventions, read from `__project__/project.yml`.
//
// Deliberately NOT a new config file: project.yml is already the keystone the
// dashboard and the portfolio read, and one owner per fact is the whole point.
// A second `dev-workflow.config.json` would be a second place to look and a
// second place to drift.
//
// Only the `conventions:` block is read here, with a hand-rolled two-level
// reader — same reasoning as frontmatter.mjs: flat data, no dependency.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULTS = {
  idPrefix: "", // e.g. `io` → io-adr-0031. Empty means unprefixed ids.
  docRoot: "__project__",
  exempt: [], // globs excluded from the frontmatter contract, e.g. reference/**
  backlog: "tasks/backlog.md",
};

/**
 * Read `conventions:` out of project.yml.
 *
 * Supports `key: value` and `key: [a, b]` under the block, plus `- item` list
 * form. Unknown keys are ignored rather than rejected — a project pinned to an
 * older package version must not fail because it carries a newer key.
 */
export function readConventions(cwd, docRoot = DEFAULTS.docRoot) {
  const path = join(cwd, docRoot, "project.yml");
  if (!existsSync(path)) return { ...DEFAULTS };

  const lines = readFileSync(path, "utf8").split("\n");
  const start = lines.findIndex((l) => /^conventions:\s*$/.test(l));
  if (start === -1) return { ...DEFAULTS };

  const out = { ...DEFAULTS };
  let listKey = null;

  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // dedent → block over

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && listKey) {
      out[listKey].push(listItem[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }

    const pair = line.match(/^\s+([a-zA-Z]+):\s*(.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = raw.trim();

    if (value === "") {
      listKey = key;
      out[key] = [];
      continue;
    }
    listKey = null;

    if (value.startsWith("[") && value.endsWith("]")) {
      out[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      continue;
    }
    out[key] = value.replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
  }

  return out;
}

/** `reference/**` → matches `reference/handoff/04-performance.md`. Prefix + `*` only. */
export function matchesGlob(rel, glob) {
  if (glob.endsWith("/**")) return rel.startsWith(glob.slice(0, -2));
  if (glob.endsWith("*")) return rel.startsWith(glob.slice(0, -1));
  return rel === glob;
}
