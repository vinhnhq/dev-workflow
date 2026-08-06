// `dev-workflow check` — the metadata gate.
//
// Runs from the package, never copied into consumers: a vendored validator in
// ten repos is ten copies to update, and the one that lags is the one that
// silently passes. Consumers alias it (`"docs:check": "dev-workflow check"`).
//
// Default mode REPORTS and exits 0; `--strict` fails. A gate that fails a
// hundred times on the day it lands is noise, and noise gets muted — so strict
// is something a repo turns on after its backfill, not before.
//
// The errors ARE the documentation. Nobody reads CONTRIBUTING.md; everybody
// reads the check blocking their PR, so every message says what to add, where,
// and why it matters.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { matchesGlob, readConventions } from "./config.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import {
  diagnoseTaskLine,
  DOC_KINDS,
  LIMITS,
  LOOKS_LIKE_TASK,
  REQUIRED_FRONTMATTER,
  TASK_RE,
} from "./grammar.mjs";

const dim = (s) => `\x1b[90m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue; // dotfiles are tooling, not documents
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (name.toLowerCase().endsWith(".md")) acc.push(full);
  }
  return acc;
}

export function runCheck({ cwd = process.cwd(), strict = false } = {}) {
  const conv = readConventions(cwd);
  const root = join(cwd, conv.docRoot);
  const findings = [];
  const report = (f) => findings.push(f);

  if (!existsSync(root)) {
    console.error(`No ${conv.docRoot}/ directory — nothing to check.`);
    return 0;
  }

  // `<prefix>-<kind>-<slug>`, with the slug optional so a file whose slug WOULD repeat its kind
  // collapses to `<prefix>-retro` instead of the absurd `<prefix>-retro-retro`. The kind segment
  // must be a real kind, which also catches `xx-adrs-0001`-style typos.
  const prefix = conv.idPrefix ? `${conv.idPrefix}-` : "";
  const idPattern = new RegExp(`^${prefix}(${DOC_KINDS.join("|")})(-[a-z0-9.-]+)?$`);
  const seenIds = new Map();

  // ── docs ────────────────────────────────────────────────────────────────
  for (const path of walk(root)) {
    const rel = relative(root, path).split("\\").join("/");
    // readme.md is folder chrome the dashboard already skips; `exempt` is
    // per-project (e.g. read-only vendored reference material).
    if (rel.toLowerCase().endsWith("readme.md")) continue;
    if (conv.exempt.some((g) => matchesGlob(rel, g))) continue;

    const parsed = parseFrontmatter(readFileSync(path, "utf8"));
    if (!parsed) {
      report({
        file: rel,
        problem: "no frontmatter",
        fix: `add at the very top:\n---\nid: ${prefix}<kind>-<slug>\nkind: <${DOC_KINDS.join("|")}>\ntitle: <≤${LIMITS.title} chars>\ndescription: <one sentence, ≤${LIMITS.description} chars>\n---`,
        why: "without it a reader falls back to the H1 — and H1s grow to 130 characters, which no card or digest can show",
      });
      continue;
    }

    const fm = parsed.data;
    for (const key of REQUIRED_FRONTMATTER) {
      if (!fm[key]) {
        report({
          file: rel,
          problem: `frontmatter is missing \`${key}\``,
          fix: `add \`${key}:\` to the frontmatter block`,
          why: "id joins this doc to tasks and events; title and description are what a reader sees before opening it",
        });
      }
    }

    if (fm.kind && !DOC_KINDS.includes(fm.kind)) {
      report({
        file: rel,
        problem: `kind \`${fm.kind}\` is not recognised`,
        fix: `use one of: ${DOC_KINDS.join(" · ")}`,
        why: "kind decides how a doc is routed and rendered",
      });
    }

    // A seeded stub still carrying its placeholders was never authored. Say that,
    // rather than reporting a malformed id — the id is a symptom, not the problem.
    if (fm.id?.includes("<prefix>") || fm.updated === "YYYY-MM-DD") {
      report({
        file: rel,
        problem: "seeded stub, never authored",
        fix: `fill it in and set \`id: ${prefix}doc-<slug>\` + today's date — or delete the file`,
        why: "an unauthored stub advertises a practice nobody follows, which is worse than not having the file",
      });
      continue;
    }

    if (fm.id) {
      const prev = seenIds.get(fm.id);
      if (prev) {
        report({
          file: rel,
          problem: `id \`${fm.id}\` is already used by ${prev}`,
          fix: "mint a new id — ids are permanent, so never reuse one even after a rename",
          why: "a duplicate id makes two docs indistinguishable to every consumer",
        });
      }
      seenIds.set(fm.id, rel);

      if (!idPattern.test(fm.id)) {
        report({
          file: rel,
          problem: `id \`${fm.id}\` doesn't match \`${prefix}<kind>[-<slug>]\``,
          fix: `e.g. ${prefix}adr-0031 · ${prefix}spec-v6-t3 · ${prefix}doc-architecture · ${prefix}retro`,
          why: "a predictable id means a human can guess a URL and a tool can build one",
        });
      } else if (fm.kind && !fm.id.startsWith(`${prefix}${fm.kind}`)) {
        report({
          file: rel,
          problem: `id \`${fm.id}\` disagrees with \`kind: ${fm.kind}\``,
          fix: `either rename the id to ${prefix}${fm.kind}-… or correct the kind`,
          why: "copy-pasting a template and forgetting one of the two is the most common way a doc ends up filed under the wrong kind",
        });
      }
    }

    for (const key of ["title", "description"]) {
      if (fm[key] && fm[key].length > LIMITS[key]) {
        report({
          file: rel,
          problem: `${key} is ${fm[key].length} chars (max ${LIMITS[key]})`,
          fix:
            key === "title"
              ? "shorten it — the long version can stay as the H1"
              : "one sentence; move detail into the body",
          why: "these are concatenated into cards and digests, where length is the budget",
        });
      }
    }
  }

  // ── backlog tasks ───────────────────────────────────────────────────────
  const backlogPath = join(root, conv.backlog);
  const taskIds = new Map();
  let parsedTasks = 0;
  let looksLike = 0;

  if (existsSync(backlogPath)) {
    readFileSync(backlogPath, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (!LOOKS_LIKE_TASK.test(line)) return;
        looksLike++;

        const m = line.match(TASK_RE);
        if (m) {
          parsedTasks++;
          const id = m[2];
          const prev = taskIds.get(id);
          if (prev) {
            report({
              file: conv.backlog,
              line: i + 1,
              problem: `duplicate task id \`${id}\` (also line ${prev})`,
              fix: "give one of them a new id",
              why: "the id is the join key to events, PRs and the done archive — duplicates corrupt all three",
            });
          }
          taskIds.set(id, i + 1);
          return;
        }

        const d = diagnoseTaskLine(line);
        report({
          file: conv.backlog,
          line: i + 1,
          problem: d.problem,
          fix: d.fix,
          why: "a line the parser can't read is invisible to the queue — never scheduled, never reported as skipped",
        });
      });
  }

  // ── output ──────────────────────────────────────────────────────────────
  console.log(bold("\n── dev-workflow check ──────────────────────────\n"));

  for (const f of findings) {
    const where = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`${red("✗")} ${bold(where)} — ${f.problem}`);
    for (const l of f.fix.split("\n")) console.log(`  ${green(l)}`);
    console.log(`  ${dim(f.why)}\n`);
  }

  const docFindings = findings.filter((f) => !f.line).length;
  console.log(
    `${bold("docs")}     ${seenIds.size} with valid ids${docFindings ? yellow(` · ${docFindings} need attention`) : green(" · clean")}`,
  );
  console.log(
    `${bold("tasks")}    ${parsedTasks}/${looksLike} lines parse${
      parsedTasks < looksLike
        ? yellow(` · ${looksLike - parsedTasks} invisible to the queue`)
        : green(" · all visible")
    }`,
  );

  if (findings.length === 0) {
    console.log(green("\n✓ clean\n"));
    return 0;
  }

  console.log(
    strict
      ? red(`\n✗ ${findings.length} finding(s) — failing (strict)\n`)
      : dim(
          `\n${findings.length} finding(s) — reporting only. Pass --strict in CI once backfilled.\n`,
        ),
  );
  return strict ? 1 : 0;
}
