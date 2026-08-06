// Guards decide whether a tool call runs, so their failure modes matter more
// than their happy path: a guard that crashes must fail OPEN (never wedge a
// session), and a guard that is configured must actually block.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateGuard } from "../lib/guards.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO_ROOT, "bin.mjs");

const CONFIG = {
  blockedCommands: [{ pattern: "^bun test(\\s|$)", message: "Use 'bun run test'." }],
  readOnlyPaths: ["__project__/reference/**"],
  protectedBranches: ["main"],
};

const bash = (command) => ({ toolName: "Bash", input: { command } });

// ── pure evaluation ─────────────────────────────────────────────────────────
test("blocks a configured command pattern", () => {
  const v = evaluateGuard(bash("bun test"), CONFIG);
  assert.match(v.reason, /blocked command/);
  assert.match(v.hint, /bun run test/);
});

test("does not block the legitimate near-miss", () => {
  assert.equal(evaluateGuard(bash("bun run test"), CONFIG), null);
  assert.equal(evaluateGuard(bash("bun run test:unit"), CONFIG), null);
});

test("blocks writes to a read-only path", () => {
  const v = evaluateGuard(
    { toolName: "Edit", input: { file_path: "/repo/__project__/reference/handoff/04-perf.md" } },
    CONFIG,
  );
  assert.match(v.reason, /read-only/);
});

test("allows writes outside read-only paths", () => {
  const v = evaluateGuard(
    { toolName: "Edit", input: { file_path: "/repo/src/app/page.tsx" } },
    CONFIG,
  );
  assert.equal(v, null);
});

test("catches a shell redirect into a read-only path", () => {
  const v = evaluateGuard(bash("echo x > __project__/reference/workflow.md"), CONFIG);
  assert.match(v.reason, /read-only/);
});

test("blocks a push to a protected branch", () => {
  assert.match(evaluateGuard(bash("git push origin main"), CONFIG).reason, /protected branch/);
});

test("blocks a bare force push but allows --force-with-lease", () => {
  assert.match(
    evaluateGuard(bash("git push --force origin wip/AB.1"), CONFIG).reason,
    /force push/,
  );
  assert.equal(evaluateGuard(bash("git push --force-with-lease origin wip/AB.1"), CONFIG), null);
});

test("a malformed regex is skipped, not fatal", () => {
  const v = evaluateGuard(bash("anything"), { blockedCommands: [{ pattern: "([", message: "x" }] });
  assert.equal(v, null);
});

test("no config means no guards", () => {
  assert.equal(evaluateGuard(bash("bun test"), {}), null);
});

// ── the hook, end to end ────────────────────────────────────────────────────
function tmp(config) {
  const dir = mkdtempSync(join(tmpdir(), "dev-workflow-guard-"));
  if (config !== undefined) {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(join(dir, ".claude", "harness.json"), config);
  }
  return dir;
}

function hook(dir, payload) {
  try {
    execFileSync("node", [BIN, "guard"], {
      cwd: dir,
      input: JSON.stringify(payload),
      encoding: "utf8",
    });
    return { code: 0, stderr: "" };
  } catch (err) {
    return { code: err.status, stderr: err.stderr ?? "" };
  }
}

test("hook exits 2 and explains itself when blocking", () => {
  const dir = tmp(JSON.stringify({ guards: CONFIG }));
  const r = hook(dir, { tool_name: "Bash", tool_input: { command: "bun test" } });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /Blocked by dev-workflow guard/);
  assert.match(r.stderr, /bun run test/);
});

test("hook allows an unmatched call", () => {
  const dir = tmp(JSON.stringify({ guards: CONFIG }));
  assert.equal(hook(dir, { tool_name: "Bash", tool_input: { command: "ls" } }).code, 0);
});

test("hook fails OPEN on malformed config — a bad file must not wedge the session", () => {
  const dir = tmp("{ not json");
  assert.equal(hook(dir, { tool_name: "Bash", tool_input: { command: "bun test" } }).code, 0);
});

test("hook fails OPEN with no config at all", () => {
  const dir = tmp();
  assert.equal(hook(dir, { tool_name: "Bash", tool_input: { command: "bun test" } }).code, 0);
});

test("hook fails OPEN on an unrecognised payload", () => {
  const dir = tmp(JSON.stringify({ guards: CONFIG }));
  assert.equal(hook(dir, { unexpected: true }).code, 0);
});

// ── doctor ──────────────────────────────────────────────────────────────────
/** Colour codes sit between words, so assertions run against stripped output. */
const plain = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

function doctor(dir) {
  try {
    return {
      code: 0,
      out: plain(execFileSync("node", [BIN, "doctor"], { cwd: dir, encoding: "utf8" })),
    };
  } catch (err) {
    return { code: err.status, out: plain(`${err.stdout ?? ""}${err.stderr ?? ""}`) };
  }
}

test("doctor explains the config shape when there is none", () => {
  const r = doctor(tmp());
  assert.equal(r.code, 0);
  assert.match(r.out, /No .claude\/harness.json/);
  assert.match(r.out, /environment/);
});

test("doctor fails on a missing required var and names the consequence", () => {
  const dir = tmp(
    JSON.stringify({
      environment: {
        required: [{ name: "DEFINITELY_UNSET_XYZ", why: "the app 500s", where: "the dashboard" }],
      },
    }),
  );
  const r = doctor(dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /the app 500s/);
  assert.match(r.out, /blocker/);
});

test("doctor treats a missing optional var as degraded, not blocking", () => {
  const dir = tmp(
    JSON.stringify({
      environment: { optional: [{ name: "DEFINITELY_UNSET_XYZ", why: "search degrades" }] },
    }),
  );
  const r = doctor(dir);
  assert.equal(r.code, 0);
  assert.match(r.out, /degraded/);
});

test("doctor reads names from .env.local without needing them exported", () => {
  const dir = tmp(
    JSON.stringify({ environment: { required: [{ name: "FROM_ENV_FILE", why: "x" }] } }),
  );
  writeFileSync(join(dir, ".env.local"), "FROM_ENV_FILE=some-secret-value\n");
  const r = doctor(dir);
  assert.equal(r.code, 0);
  assert.ok(!r.out.includes("some-secret-value"), "doctor must never print a value");
});

test("doctor ignores an empty assignment — a placeholder is not configuration", () => {
  const dir = tmp(
    JSON.stringify({ environment: { required: [{ name: "PLACEHOLDER", why: "x" }] } }),
  );
  writeFileSync(join(dir, ".env.local"), "PLACEHOLDER=\n");
  assert.equal(doctor(dir).code, 1);
});

test("doctor reports when guards are configured but not wired", () => {
  const dir = tmp(JSON.stringify({ guards: CONFIG }));
  const r = doctor(dir);
  assert.match(r.out, /NOT wired/);
  assert.match(r.out, /PreToolUse/);
});

test("doctor sees the guard hook when settings wire it", () => {
  const dir = tmp(JSON.stringify({ guards: CONFIG }));
  writeFileSync(
    join(dir, ".claude", "settings.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "npx dev-workflow guard" }] },
        ],
      },
    }),
  );
  assert.match(doctor(dir).out, /guard hook wired/);
});
