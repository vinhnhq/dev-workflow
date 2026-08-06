// `whatsnew` is the antidote to the seeded tier's one cost — a consumer never
// receiving improvements to a file they own. Its contract is: report everything,
// write nothing, and never confuse "the stub improved" with "your file is wrong".

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { changelogSince, isOlder } from "../lib/whatsnew.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO_ROOT, "bin.mjs");
const plain = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

function run(args, cwd) {
  try {
    return { code: 0, out: plain(execFileSync("node", [BIN, ...args], { cwd, encoding: "utf8" })) };
  } catch (err) {
    return { code: err.status, out: plain(`${err.stdout ?? ""}${err.stderr ?? ""}`) };
  }
}

const tmp = () => mkdtempSync(join(tmpdir(), "dev-workflow-whatsnew-"));

// ── version ordering ────────────────────────────────────────────────────────
test("prerelease sorts before its release", () => {
  assert.equal(isOlder("3.0.0-beta.0", "3.0.0"), true);
  assert.equal(isOlder("3.0.0", "3.0.0-beta.0"), false);
});

test("numeric parts compare numerically, not as strings", () => {
  assert.equal(isOlder("3.9.0", "3.10.0"), true, "3.9 < 3.10 — string compare would say otherwise");
  assert.equal(isOlder("2.4.1", "3.0.0"), true);
  assert.equal(isOlder("3.0.0", "3.0.0"), false);
});

test("an unknown installed version counts as older than anything", () => {
  assert.equal(isOlder(undefined, "1.0.0"), true);
});

// ── changelog slicing ───────────────────────────────────────────────────────
test("changelog returns only entries newer than the installed version", () => {
  const text = ["# Changelog", "", "## 3.1.0", "- new thing", "", "## 3.0.0", "- old thing"].join(
    "\n",
  );
  const entries = changelogSince(text, "3.0.0");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].version, "3.1.0");
  assert.match(entries[0].lines.join(" "), /new thing/);
});

// ── the command ─────────────────────────────────────────────────────────────
test("whatsnew refuses politely when the project was never synced", () => {
  const r = run(["whatsnew"], tmp());
  assert.equal(r.code, 1);
  assert.match(r.out, /run `dev-workflow sync` first/);
});

test("a freshly synced project is up to date and writes nothing", () => {
  const dir = tmp();
  run(["sync"], dir);
  const before = readFileSync(join(dir, "CLAUDE.md"), "utf8");

  const r = run(["whatsnew"], dir);
  assert.equal(r.code, 0);
  assert.match(r.out, /up to date/);
  assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf8"), before, "whatsnew must never write");
});

test("'up to date' states what was verified — silence must not look like breakage", () => {
  const dir = tmp();
  run(["sync"], dir);
  const out = run(["whatsnew"], dir).out;

  assert.match(out, /verified \d+ managed file\(s\) by content hash/);
  assert.match(out, /\d+ seeded stub\(s\) by provenance/);
  assert.match(out, /package fingerprint matched/);
});

test("an edited seeded file is NOT reported — it is yours, not drift", () => {
  const dir = tmp();
  run(["sync"], dir);
  writeFileSync(join(dir, "CLAUDE.md"), "# entirely rewritten by the project\n");

  const r = run(["whatsnew"], dir);
  assert.doesNotMatch(r.out, /stubs improved upstream/);
  assert.match(r.out, /up to date/);
});

test("a stub that changed upstream is reported, without touching the local file", () => {
  const dir = tmp();
  run(["sync"], dir);

  // Simulate a newer package: the recorded provenance no longer matches the stub.
  const lockPath = join(dir, "dev-workflow-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.seeded["CLAUDE.md"].sourceHash = "sha256:stale";
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));

  const local = readFileSync(join(dir, "CLAUDE.md"), "utf8");
  const r = run(["whatsnew"], dir);
  assert.match(r.out, /stubs improved upstream/);
  assert.match(r.out, /CLAUDE\.md/);
  assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf8"), local, "still untouched");
});

test("a managed file the project has never seen is listed as new", () => {
  const dir = tmp();
  run(["sync"], dir);
  // Pretend an artifact from a later version is absent locally.
  rmSync(join(dir, ".claude", "skills", "testing-principles", "SKILL.md"));

  const r = run(["whatsnew"], dir);
  assert.match(r.out, /new files/);
  assert.match(r.out, /testing-principles/);
});

test("a file the package no longer ships here is reported as an orphan, not deleted", () => {
  const dir = tmp();
  run(["sync"], dir);

  // A path this project received in an older version, at a location the package
  // has since moved away from.
  const stale = join(dir, ".claude", "templates", "moved-away.md");
  writeFileSync(stale, "# from an older version\n");
  const lockPath = join(dir, "dev-workflow-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.managed[".claude/templates/moved-away.md"] = { hash: "sha256:old" };
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));

  const r = run(["whatsnew"], dir);
  assert.match(r.out, /orphans/);
  assert.match(r.out, /moved-away\.md/);
  assert.ok(existsSync(stale), "whatsnew must not delete anything");
});

test("an orphan survives a sync — syncing must not erase the evidence", () => {
  const dir = tmp();
  run(["sync"], dir);

  const stale = join(dir, ".claude", "templates", "moved-away.md");
  writeFileSync(stale, "# from an older version\n");
  const lockPath = join(dir, "dev-workflow-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.managed[".claude/templates/moved-away.md"] = { hash: "sha256:old" };
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));

  // The hazard: sync rewrites the lock with only current paths. Before `retired`,
  // this single command made the orphan permanently invisible.
  run(["sync"], dir);

  const r = run(["whatsnew"], dir);
  assert.match(r.out, /orphans/);
  assert.match(r.out, /moved-away\.md/);
});

test("a seeded file present without provenance gets it backfilled, marked assumed", () => {
  const dir = tmp();
  run(["sync"], dir);

  // Simulate a project seeded by a version that predates provenance tracking.
  const lockPath = join(dir, "dev-workflow-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  delete lock.seeded["CLAUDE.md"];
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));

  run(["sync"], dir);
  const after = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.match(after.seeded["CLAUDE.md"].sourceHash, /^sha256:/);
  assert.equal(after.seeded["CLAUDE.md"].assumed, true, "we cannot know which stub it came from");
});

test("a package rebuilt at the same version is reported — version equality is not proof", () => {
  const dir = tmp();
  run(["sync"], dir);

  // Same version, different code: the linked-development case, where a version
  // check alone would confidently report "up to date".
  const lockPath = join(dir, "dev-workflow-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.match(lock.packageFingerprint, /^sha256:/, "sync must stamp a fingerprint");
  lock.packageFingerprint = "sha256:built-from-different-code";
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));

  const r = run(["whatsnew"], dir);
  assert.match(r.out, /package rebuilt at the same version/);
  assert.doesNotMatch(r.out, /up to date/);
});

test("a project with no recorded fingerprint is not nagged about it", () => {
  const dir = tmp();
  run(["sync"], dir);
  const lockPath = join(dir, "dev-workflow-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  delete lock.packageFingerprint; // predates the field
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));

  assert.doesNotMatch(run(["whatsnew"], dir).out, /package rebuilt/);
});

test("--json emits the structured form an agent can act on", () => {
  const dir = tmp();
  run(["sync"], dir);
  const r = run(["whatsnew", "--json"], dir);
  const report = JSON.parse(r.out);

  assert.ok("installed" in report);
  assert.ok(Array.isArray(report.newFiles));
  assert.ok(Array.isArray(report.stubsChanged));
  assert.ok(Array.isArray(report.changelog));
});

test("sync records seeded provenance without hash-tracking the destination", () => {
  const dir = tmp();
  run(["sync"], dir);
  const lock = JSON.parse(readFileSync(join(dir, "dev-workflow-lock.json"), "utf8"));

  assert.match(lock.seeded["CLAUDE.md"].sourceHash, /^sha256:/);
  assert.ok(lock.seeded["CLAUDE.md"].packageVersion);
  assert.equal(lock.managed["CLAUDE.md"], undefined, "a seeded file is never managed");
});
