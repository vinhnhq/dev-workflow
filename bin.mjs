#!/usr/bin/env node
// CLI entry. Drops dev-workflow.md (the conventions seed) plus a
// dev-workflow-pipeline/ staging folder (the battle-tested agent pipeline).
// Claude reads the seed, walks the user through project setup, adapts the
// pipeline files into place, then deletes the staging folder.

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(PKG_ROOT, "templates", "dev-workflow.md");
const PIPELINE_SOURCE = join(PKG_ROOT, "templates", "pipeline");
const TARGET_NAME = "dev-workflow.md";
const PIPELINE_TARGET_NAME = "dev-workflow-pipeline";

const HELP = `dev-workflow — conventions seed, managed templates, and the metadata gate

Usage:
  dev-workflow                 Copy dev-workflow.md + dev-workflow-pipeline/ to cwd
  dev-workflow --no-pipeline   Seed only; skip the pipeline staging folder
  dev-workflow --force         Overwrite if either target already exists

  dev-workflow sync            Write/refresh the managed files (templates, workflows)
  dev-workflow sync --check    Report drift without writing — for CI
  dev-workflow sync --force    Discard local edits to managed files

  dev-workflow check           Report metadata + backlog-grammar findings (exit 0)
  dev-workflow check --strict  Fail on any finding — for CI, after backfill

  dev-workflow doctor          Can a new person run this project? (env, tools, guards)
  dev-workflow guard           PreToolUse hook entry — reads stdin, exit 2 blocks

  dev-workflow whatsnew        What changed since this project was set up (writes nothing)
  dev-workflow whatsnew --json Same, structured — hand it to an agent to propose a merge

  dev-workflow --version       Print package version
  dev-workflow --help          Print this help

Three tiers, distinguished by who owns a file AFTER install:
  seed     dev-workflow.md + the pipeline staging folder — yours to adapt, never re-synced
  managed  templates + workflows — the package owns them, tracked by hash in
           dev-workflow-lock.json. A file in .claude/templates/local/ wins and is never touched.
  library  the checker + the grammar — never copied, so N repos cannot hold N drifting copies.
`;

const FLAGS = new Set([
  "--force",
  "--no-pipeline",
  "--help",
  "-h",
  "--version",
  "-v",
  "--check",
  "--strict",
]);
const COMMANDS = new Set(["sync", "check", "doctor", "guard", "whatsnew"]);

async function main(argv) {
  const args = argv.slice(2);
  const command = COMMANDS.has(args[0]) ? args[0] : null;

  if (command === "doctor") {
    const { runDoctor } = await import("./lib/doctor.mjs");
    return runDoctor({ cwd: process.cwd() });
  }

  if (command === "whatsnew") {
    const { default: pkg } = await import("./package.json", { with: { type: "json" } });
    const { runWhatsnew } = await import("./lib/whatsnew.mjs");
    return runWhatsnew({
      cwd: process.cwd(),
      pkgRoot: PKG_ROOT,
      packageVersion: pkg.version,
      json: args.includes("--json"),
    });
  }

  // Hook entry point — reads the PreToolUse payload on stdin, exits 2 to block.
  if (command === "guard") {
    const { runGuard } = await import("./lib/guard.mjs");
    return runGuard({ cwd: process.cwd() });
  }

  if (command === "check") {
    const { runCheck } = await import("./lib/check.mjs");
    return runCheck({ cwd: process.cwd(), strict: args.includes("--strict") });
  }

  if (command === "sync") {
    const { default: pkg } = await import("./package.json", { with: { type: "json" } });
    const { runSync } = await import("./lib/sync.mjs");
    return runSync({
      cwd: process.cwd(),
      pkgRoot: PKG_ROOT,
      force: args.includes("--force"),
      checkOnly: args.includes("--check"),
      packageVersion: pkg.version,
    });
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return 0;
  }

  if (args.includes("--version") || args.includes("-v")) {
    const { default: pkg } = await import("./package.json", {
      with: { type: "json" },
    });
    console.log(pkg.version);
    return 0;
  }

  const unknown = args.find((a) => !FLAGS.has(a));
  if (unknown) {
    console.error(`Unknown argument: ${unknown}`);
    console.error("Run `dev-workflow --help` for usage.");
    return 1;
  }

  const force = args.includes("--force");
  const withPipeline = !args.includes("--no-pipeline");
  const target = resolve(process.cwd(), TARGET_NAME);
  const pipelineTarget = resolve(process.cwd(), PIPELINE_TARGET_NAME);

  if (existsSync(target) && !force) {
    console.error(`${TARGET_NAME} already exists. Pass --force to overwrite.`);
    return 1;
  }
  if (withPipeline && existsSync(pipelineTarget) && !force) {
    console.error(`${PIPELINE_TARGET_NAME}/ already exists. Pass --force to overwrite.`);
    return 1;
  }

  copyFileSync(SOURCE, target);
  console.log(`Wrote ${TARGET_NAME}`);

  if (withPipeline) {
    mkdirSync(pipelineTarget, { recursive: true });
    const files = readdirSync(PIPELINE_SOURCE);
    for (const file of files) {
      copyFileSync(join(PIPELINE_SOURCE, file), join(pipelineTarget, file));
    }
    console.log(`Wrote ${PIPELINE_TARGET_NAME}/ (${files.length} files)`);
  }

  console.log("Open Claude Code here and ask it to set up the project.");
  return 0;
}

main(process.argv).then(
  (code) => process.exit(code ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
