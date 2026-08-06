// `dev-workflow sync` — the managed tier.
//
// The package ships three kinds of file, and the difference is who owns them
// AFTER install:
//
//   managed  templates + the events workflow. The PACKAGE owns them. Tracked by
//            hash in dev-workflow-lock.json so a hand-edit is detectable rather
//            than silently overwritten.
//   seeded   stubs the PROJECT must author — glossary, data classification.
//            Copied only when absent and never overwritten (not even by
//            --force, which discards *our* drift, not theirs). A generic
//            glossary written by a package would be wrong, and wrong is worse
//            than empty. Not hash-tracked: there is nothing to compare against.
//   library  the checker and the grammar. Never copied at all; run from the
//            package, so N repos cannot hold N drifting copies.
//
// (`dev-workflow.md` and the pipeline staging folder predate these tiers: copied
// once by the bare `dev-workflow` command, then adapted freely and never re-synced.)
//
// Full rationale, including when each file reaches an agent's context:
// docs/project-doc-standard.md
//
// Escape hatch: a file in `.claude/templates/local/` wins over the managed copy
// and is never touched. Divergence should be deliberate and visible, not a
// merge conflict you rediscover on every sync.

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const LOCK_NAME = "dev-workflow-lock.json";

/** Package-relative source → consumer-relative destination. */
export const MANAGED = [
  ["templates/managed/claude-templates/README.md", ".claude/templates/README.md"],
  ["templates/managed/claude-templates/adr.md", ".claude/templates/adr.md"],
  ["templates/managed/claude-templates/spec.md", ".claude/templates/spec.md"],
  ["templates/managed/claude-templates/task.md", ".claude/templates/task.md"],
  ["templates/managed/claude-templates/done-entry.md", ".claude/templates/done-entry.md"],
  ["templates/managed/claude-templates/ticket-event.json", ".claude/templates/ticket-event.json"],
  // A skill, not a template: it is read when writing tests, not copied to make something.
  [
    "templates/managed/skills/testing-principles/SKILL.md",
    ".claude/skills/testing-principles/SKILL.md",
  ],
  ["templates/managed/workflows/ticket-events.yml", ".github/workflows/ticket-events.yml"],
];

/**
 * Seeded tier — copied ONLY when absent, never overwritten, never hash-tracked.
 *
 * These are stubs the project must author: a glossary or a data-classification the package wrote
 * for you would be generic, wrong, and worse than empty. Once seeded they belong to the consumer,
 * so `sync` must not touch them again — including with `--force`, which exists to discard *our*
 * drift, not theirs.
 */
export const SEEDED = [
  ["templates/seeded/CLAUDE.md", "CLAUDE.md"],
  ["templates/seeded/project.yml", "__project__/project.yml"],
  ["templates/seeded/harness.json", ".claude/harness.json"],
  ["templates/seeded/architecture.md", "__project__/docs/architecture.md"],
  ["templates/seeded/glossary.md", "__project__/docs/glossary.md"],
  ["templates/seeded/security-and-data.md", "__project__/docs/security-and-data.md"],
  ["templates/seeded/runbook.md", "__project__/docs/runbook.md"],
];

const sha256 = (buf) => `sha256:${createHash("sha256").update(buf).digest("hex")}`;

/**
 * A hash over the package's own code — the library tier, which is never copied.
 *
 * Managed and seeded files are verified by comparing content, but BEHAVIOUR has no
 * counterpart in the consumer's repo to hash against: a rewritten `check.mjs`
 * leaves no trace there. Version alone does not cover it either, because during
 * linked development the version never moves while the code changes constantly —
 * so `whatsnew` would report "up to date" against a tool that had been rebuilt
 * underneath it. This fingerprint is what makes that visible.
 */
export function packageFingerprint(pkgRoot) {
  const libDir = join(pkgRoot, "lib");
  const files = existsSync(libDir)
    ? readdirSync(libDir)
        .filter((f) => f.endsWith(".mjs"))
        .toSorted()
        .map((f) => join(libDir, f))
    : [];
  const binPath = join(pkgRoot, "bin.mjs");
  if (existsSync(binPath)) files.push(binPath);

  const h = createHash("sha256");
  for (const f of files) h.update(readFileSync(f));
  return `sha256:${h.digest("hex")}`;
}

function readLock(cwd) {
  const path = join(cwd, LOCK_NAME);
  if (!existsSync(path)) return { version: 1, packageVersion: null, managed: {} };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    // A corrupt lock must not wedge the tool — treat it as absent.
    return { version: 1, packageVersion: null, managed: {} };
  }
}

/** Is this managed file deliberately owned by the consumer instead? */
function localOverride(cwd, dest) {
  const name = dest.split("/").pop();
  return existsSync(join(cwd, ".claude", "templates", "local", name));
}

const dim = (s) => `\x1b[90m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

export function runSync({
  cwd = process.cwd(),
  pkgRoot,
  force = false,
  checkOnly = false,
  packageVersion,
} = {}) {
  const lock = readLock(cwd);
  // `seeded` records PROVENANCE, not ownership: the hash of the stub a file was
  // seeded from, and the version it came from. The destination is never compared
  // and never overwritten — this only lets `whatsnew` say "the stub you started
  // from has since improved", which is otherwise invisible forever.
  const next = {
    version: 1,
    packageVersion,
    packageFingerprint: packageFingerprint(pkgRoot),
    managed: {},
    seeded: { ...lock.seeded },
    // Paths this project once received as managed that the package no longer ships
    // there. Without carrying them forward, the FIRST sync after a file moves
    // upstream erases the only record that the stale copy was ever ours — and the
    // orphan becomes permanently invisible, which is the exact failure this whole
    // command set exists to prevent.
    retired: { ...lock.retired },
  };
  const drifted = [];
  let written = 0;
  let skipped = 0;

  console.log(bold(`\n── dev-workflow sync ${checkOnly ? "(check)" : ""} ─────────────────────\n`));

  for (const [from, to] of MANAGED) {
    const src = resolve(pkgRoot, from);
    const dest = resolve(cwd, to);
    const srcHash = sha256(readFileSync(src));

    if (localOverride(cwd, to)) {
      console.log(`${dim("skip")}   ${to} ${dim("(local override)")}`);
      skipped++;
      continue;
    }

    if (existsSync(dest)) {
      const destHash = sha256(readFileSync(dest));
      const recorded = lock.managed?.[to]?.hash;

      if (destHash === srcHash) {
        console.log(`${dim("ok")}     ${to}`);
        next.managed[to] = { hash: srcHash };
        continue;
      }
      // Changed on disk relative to what we last wrote → a human edited it.
      if (recorded && destHash !== recorded && !force) {
        drifted.push(to);
        console.log(`${yellow("drift")}  ${to} ${dim("(edited locally)")}`);
        next.managed[to] = { hash: destHash };
        continue;
      }
      // No lock entry, but a different file is already sitting at a path we
      // manage. On first adoption into an existing repo that is somebody's own
      // work, not a stale copy of ours — and we cannot tell the two apart
      // without provenance. Refuse rather than clobber; `--force` is the
      // explicit way to say "take it".
      if (!recorded && !force) {
        drifted.push(to);
        console.log(`${yellow("exists")} ${to} ${dim("(not ours — refusing to overwrite)")}`);
        next.managed[to] = { hash: destHash };
        continue;
      }
    }

    if (checkOnly) {
      console.log(`${yellow("stale")}  ${to} ${dim("(would update)")}`);
      drifted.push(to);
      next.managed[to] = { hash: srcHash };
      continue;
    }

    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    console.log(`${green("write")}  ${to}`);
    next.managed[to] = { hash: srcHash };
    written++;
  }

  // Carry forward anything the old lock claimed that we no longer ship here.
  const currentManaged = new Set(MANAGED.map(([, to]) => to));
  for (const path of Object.keys(lock.managed ?? {})) {
    if (!currentManaged.has(path) && existsSync(resolve(cwd, path))) {
      next.retired[path] = { retiredAt: packageVersion };
    }
  }

  // Seeded tier: present ⇒ leave alone, always. Absent ⇒ lay down the stub once.
  let seeded = 0;
  for (const [from, to] of SEEDED) {
    const dest = resolve(cwd, to);
    if (existsSync(dest)) {
      // A file already here with no provenance predates this tracking (or was written
      // by the project before any sync). Record the CURRENT stub hash so that future
      // upstream improvements are detectable from now on — flagged `assumed`, because
      // we cannot know which stub it actually came from and must not pretend to.
      if (!next.seeded[to]) {
        next.seeded[to] = {
          sourceHash: sha256(readFileSync(resolve(pkgRoot, from))),
          packageVersion,
          assumed: true,
        };
      }
      console.log(`${dim("kept")}   ${to} ${dim("(yours)")}`);
      continue;
    }
    if (checkOnly) {
      console.log(`${yellow("absent")} ${to} ${dim("(would seed)")}`);
      continue;
    }
    const srcPath = resolve(pkgRoot, from);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(srcPath, dest);
    next.seeded[to] = { sourceHash: sha256(readFileSync(srcPath)), packageVersion };
    console.log(`${green("seed")}   ${to} ${dim("← author this; empty is a bug")}`);
    seeded++;
  }

  if (!checkOnly) writeFileSync(join(cwd, LOCK_NAME), `${JSON.stringify(next, null, 2)}\n`);

  console.log(
    `\n${bold("managed")}  ${MANAGED.length} file(s) · ${written} written · ${skipped} local override(s)`,
  );
  console.log(`${bold("seeded")}   ${SEEDED.length} file(s) · ${seeded} newly seeded`);

  if (drifted.length) {
    console.log(red(`\n✗ ${drifted.length} file(s) diverge from the package:`));
    for (const d of drifted) console.log(`  ${d}`);
    console.log(
      dim(
        "\n  `dev-workflow sync --force` discards the local edit, or move the file to\n  .claude/templates/local/ to own it deliberately.\n",
      ),
    );
    return checkOnly ? 1 : 0;
  }

  console.log(green("\n✓ in sync\n"));
  return 0;
}
