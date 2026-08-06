// Contract tests for the two new commands. `sync` must be safe to re-run (that is the whole point
// of the managed tier), and `check` must report-not-fail until a repo opts into --strict.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SEEDED } from "../lib/sync.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO_ROOT, "bin.mjs");

function run(args, cwd) {
  try {
    return { out: execFileSync("node", [BIN, ...args], { cwd, encoding: "utf8" }), code: 0 };
  } catch (err) {
    return { out: `${err.stdout ?? ""}${err.stderr ?? ""}`, code: err.status };
  }
}

function tmp() {
  return mkdtempSync(join(tmpdir(), "dev-workflow-sync-"));
}

/** A consumer repo with one conforming doc and one conforming task. */
function seedProject(dir, { idPrefix = "xx" } = {}) {
  mkdirSync(join(dir, "__project__", "tasks"), { recursive: true });
  writeFileSync(
    join(dir, "__project__", "project.yml"),
    `slug: demo\nname: Demo\nconventions:\n  idPrefix: ${idPrefix}\n  exempt: [reference/**]\n`,
  );
  writeFileSync(
    join(dir, "__project__", "architecture.md"),
    `---\nid: ${idPrefix}-doc-architecture\nkind: doc\ntitle: Architecture\ndescription: What this is.\n---\n\n# Architecture\n`,
  );
  // backlog.md lives under the doc root, so it carries frontmatter like any other doc —
  // `kind: tasks` is what marks it as the queue rather than prose.
  writeFileSync(
    join(dir, "__project__", "tasks", "backlog.md"),
    `---\nid: ${idPrefix}-tasks-backlog\nkind: tasks\ntitle: Backlog\ndescription: Open work only.\n---\n\n- [ ] **AB.1** a fine task\n`,
  );
  return dir;
}

test("sync writes the managed files and a lock", () => {
  const dir = tmp();
  const { code } = run(["sync"], dir);
  assert.equal(code, 0);
  assert.ok(existsSync(join(dir, ".claude", "templates", "adr.md")));
  assert.ok(existsSync(join(dir, ".github", "workflows", "ticket-events.yml")));

  const lock = JSON.parse(readFileSync(join(dir, "dev-workflow-lock.json"), "utf8"));
  assert.match(lock.managed[".claude/templates/adr.md"].hash, /^sha256:/);
});

test("sync seeds project-authored stubs when they are absent", () => {
  const dir = tmp();
  run(["sync"], dir);
  assert.ok(existsSync(join(dir, "__project__", "docs", "glossary.md")));
  assert.ok(existsSync(join(dir, "__project__", "docs", "security-and-data.md")));
});

test("a seeded file is NEVER overwritten — not by sync, not by --force", () => {
  const dir = tmp();
  run(["sync"], dir);
  const seeded = join(dir, "__project__", "docs", "glossary.md");
  writeFileSync(seeded, "# our real glossary\n");

  run(["sync"], dir);
  assert.equal(readFileSync(seeded, "utf8"), "# our real glossary\n");

  // --force exists to discard OUR drift in managed files, never the project's own work.
  run(["sync", "--force"], dir);
  assert.equal(readFileSync(seeded, "utf8"), "# our real glossary\n");
});

test("check names an unauthored seeded stub as such, not as a malformed id", () => {
  const dir = seedProject(tmp());
  run(["sync"], dir); // lays down the stubs with <prefix> placeholders
  const { out } = run(["check"], dir);
  assert.match(out, /seeded stub, never authored/);
  assert.match(out, /or delete the file/);
});

test("seeded files are not hash-tracked in the lock", () => {
  const dir = tmp();
  run(["sync"], dir);
  const lock = JSON.parse(readFileSync(join(dir, "dev-workflow-lock.json"), "utf8"));
  assert.equal(lock.managed["__project__/docs/glossary.md"], undefined);
});

test("first adoption refuses to clobber a file the project already had", () => {
  const dir = tmp();
  // An existing repo that happens to have something at a path we manage, and no
  // lock to prove it was ever ours.
  mkdirSync(join(dir, ".claude", "templates"), { recursive: true });
  writeFileSync(join(dir, ".claude", "templates", "adr.md"), "# our own ADR template\n");

  const { out } = run(["sync"], dir);
  assert.match(out, /not ours — refusing to overwrite/);
  assert.equal(
    readFileSync(join(dir, ".claude", "templates", "adr.md"), "utf8"),
    "# our own ADR template\n",
  );

  // --force is the explicit "take it".
  run(["sync", "--force"], dir);
  assert.match(readFileSync(join(dir, ".claude", "templates", "adr.md"), "utf8"), /kind: adr/);
});

test("sync is idempotent — a second run writes nothing", () => {
  const dir = tmp();
  run(["sync"], dir);
  const { out } = run(["sync"], dir);
  assert.match(out, /0 written/);
  assert.match(out, /in sync/);
});

test("a hand-edited managed file is reported as drift, not silently overwritten", () => {
  const dir = tmp();
  run(["sync"], dir);
  writeFileSync(join(dir, ".claude", "templates", "adr.md"), "# mine now\n");

  const { out } = run(["sync"], dir);
  assert.match(out, /drift/);
  assert.equal(readFileSync(join(dir, ".claude", "templates", "adr.md"), "utf8"), "# mine now\n");
});

test("--force discards a local edit", () => {
  const dir = tmp();
  run(["sync"], dir);
  writeFileSync(join(dir, ".claude", "templates", "adr.md"), "# mine now\n");

  run(["sync", "--force"], dir);
  assert.match(readFileSync(join(dir, ".claude", "templates", "adr.md"), "utf8"), /kind: adr/);
});

test("a file in templates/local/ is never touched", () => {
  const dir = tmp();
  mkdirSync(join(dir, ".claude", "templates", "local"), { recursive: true });
  writeFileSync(join(dir, ".claude", "templates", "local", "adr.md"), "# ours\n");

  const { out } = run(["sync"], dir);
  assert.match(out, /local override/);
  assert.ok(!existsSync(join(dir, ".claude", "templates", "adr.md")));
});

test("check passes clean on a conforming project", () => {
  const dir = seedProject(tmp());
  const { out, code } = run(["check"], dir);
  assert.equal(code, 0);
  assert.match(out, /clean/);
});

test("check reports but exits 0 without --strict, and fails with it", () => {
  const dir = seedProject(tmp());
  writeFileSync(join(dir, "__project__", "orphan.md"), "# no frontmatter here\n");

  const loose = run(["check"], dir);
  assert.equal(loose.code, 0);
  assert.match(loose.out, /no frontmatter/);

  const strict = run(["check", "--strict"], dir);
  assert.equal(strict.code, 1);
  assert.match(strict.out, /failing \(strict\)/);
});

test("check honours the per-project exempt glob", () => {
  const dir = seedProject(tmp());
  mkdirSync(join(dir, "__project__", "reference"), { recursive: true });
  writeFileSync(join(dir, "__project__", "reference", "vendored.md"), "# no frontmatter\n");

  const { out, code } = run(["check"], dir);
  assert.equal(code, 0);
  assert.match(out, /clean/);
});

test("check uses the project's id prefix", () => {
  const dir = seedProject(tmp(), { idPrefix: "gw" });
  const { out } = run(["check"], dir);
  assert.match(out, /clean/);
});

test("an id may collapse to <prefix>-<kind> when the slug would repeat the kind", () => {
  const dir = seedProject(tmp());
  writeFileSync(
    join(dir, "__project__", "retro.md"),
    "---\nid: xx-retro\nkind: retro\ntitle: Retro\ndescription: Lessons only.\n---\n\n# Retro\n",
  );
  const { out, code } = run(["check"], dir);
  assert.equal(code, 0);
  assert.match(out, /clean/);
});

test("the kind segment of an id must be a real kind", () => {
  const dir = seedProject(tmp());
  writeFileSync(
    join(dir, "__project__", "typo.md"),
    "---\nid: xx-adrs-0001\nkind: adr\ntitle: Typo\ndescription: The id says adrs.\n---\n\n# Typo\n",
  );
  const { out } = run(["check"], dir);
  assert.match(out, /doesn't match/);
});

test("an id that disagrees with its kind is reported", () => {
  const dir = seedProject(tmp());
  writeFileSync(
    join(dir, "__project__", "mismatch.md"),
    "---\nid: xx-adr-0001\nkind: spec\ntitle: Mismatch\ndescription: Copy-pasted the wrong template.\n---\n\n# Mismatch\n",
  );
  const { out } = run(["check"], dir);
  assert.match(out, /disagrees with/);
});

test("every seeded doc starts with frontmatter at byte 0", () => {
  // A leading comment pushes the block out of position, `check` sees no
  // frontmatter, and the stub can never satisfy the gate it ships with —
  // 3.0.0 shipped exactly that bug in runbook.md.
  //
  // Scoped to the doc root: CLAUDE.md is a rule file at the repo root that the
  // gate never scans, and it correctly has no frontmatter.
  for (const [from, to] of SEEDED) {
    if (!to.endsWith(".md") || !to.startsWith("__project__/")) continue;
    const body = readFileSync(join(REPO_ROOT, from), "utf8");
    assert.ok(body.startsWith("---\n"), `${from} must start with frontmatter, not a comment`);
  }
});
