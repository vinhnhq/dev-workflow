// `dev-workflow doctor` — can a new person actually run this project?
//
// The failure this exists to prevent is the *silent* one. A missing key rarely
// crashes: search quietly returns UNCONFIGURED, integration tests quietly skip,
// CI stays green, and the newcomer concludes the feature is broken rather than
// unconfigured. `.env.example` lists the names; it never says what breaks
// without each one, which is the only part that helps someone who does not yet
// know what "working" looks like.
//
// Values are NEVER read, printed, or compared — only presence. A doctor that
// echoes a secret into a terminal (or a CI log) is a worse problem than the one
// it diagnoses.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { EXAMPLE, HARNESS_PATH, readHarnessConfig } from "./harness-config.mjs";

const dim = (s) => `\x1b[90m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

/** Which env files a project may define locally, in precedence order. */
const ENV_FILES = [".env.local", ".env.development.local", ".env"];

/**
 * Names present in the environment — from the shell and from local env files.
 *
 * Only NAMES are collected. The parser deliberately stops at the `=`, so no
 * value is ever held in memory.
 */
function presentNames(cwd) {
  const names = new Set(Object.keys(process.env).filter((k) => process.env[k] !== ""));

  for (const file of ENV_FILES) {
    const path = join(cwd, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.?)/);
      if (!m) continue;
      // An empty assignment (`FOO=`) is not configuration, it is a placeholder.
      if (m[2] === "" || m[2] === undefined) continue;
      names.add(m[1]);
    }
  }
  return names;
}

const onPath = (cmd) => {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/**
 * Is the PreToolUse guard actually wired into the harness settings?
 *
 * Matches both the direct binary and the run-a-project-script form, because the
 * script form is what we recommend (see WIRING) — a check that only knew the
 * direct form would report "not wired" on a correctly wired project.
 */
function guardWired(cwd) {
  for (const file of [join(".claude", "settings.json"), join(".claude", "settings.local.json")]) {
    const path = join(cwd, file);
    if (!existsSync(path)) continue;
    try {
      const text = readFileSync(path, "utf8");
      if (/PreToolUse/.test(text) && /(dev-workflow|run)\s+(--silent\s+)?guard/.test(text))
        return true;
    } catch {
      /* unreadable settings is not a guard verdict */
    }
  }
  return false;
}

/**
 * The wiring snippet.
 *
 * Routed through a project script rather than a bare binary, for a reason worth
 * stating: the bin is named `dev-workflow`, but the package is scoped. `npx
 * dev-workflow` therefore resolves to an UNRELATED public package and happily
 * runs it — verified, it exists. A project script pins the invocation to the
 * dependency this project actually installed.
 */
const WIRING = `  package.json → "scripts": { "guard": "dev-workflow guard" }

  .claude/settings.json →
  { "hooks": { "PreToolUse": [ { "matcher": "Bash|Edit|Write|NotebookEdit",
      "hooks": [ { "type": "command", "command": "npm run --silent guard" } ] } ] } }

  (bun projects: "bun run --silent guard")`;

export function runDoctor({ cwd = process.cwd() } = {}) {
  console.log(bold("\n── dev-workflow doctor ─────────────────────────\n"));

  let config;
  try {
    config = readHarnessConfig(cwd);
  } catch (error) {
    console.log(
      `${red("✗")} ${HARNESS_PATH} is not valid JSON — ${(error && error.message) || error}`,
    );
    console.log(dim("  Guards are disabled while this file is malformed.\n"));
    return 1;
  }

  if (!config) {
    console.log(`${yellow("!")} No ${bold(HARNESS_PATH)} — nothing to check yet.\n`);
    console.log(dim("  Create it to declare what this project needs to run:\n"));
    console.log(
      EXAMPLE.split("\n")
        .map((l) => `  ${dim(l)}`)
        .join("\n"),
    );
    console.log();
    return 0;
  }

  const env = config.environment ?? {};
  const present = presentNames(cwd);
  let missingRequired = 0;
  let degraded = 0;

  const line = (mark, name, note) => console.log(`${mark} ${bold(name.padEnd(28))} ${note}`);

  if (env.required?.length) {
    console.log(bold("required"));
    for (const item of env.required) {
      if (present.has(item.name)) {
        line(green("✓"), item.name, dim("set"));
      } else {
        missingRequired++;
        line(red("✗"), item.name, red(item.why ?? "required"));
        if (item.where) console.log(`${" ".repeat(31)}${dim(`→ ${item.where}`)}`);
      }
    }
    console.log();
  }

  if (env.optional?.length) {
    console.log(bold("optional"));
    for (const item of env.optional) {
      if (present.has(item.name)) {
        line(green("✓"), item.name, dim("set"));
      } else {
        degraded++;
        // The important half: what silently degrades, not just that it is unset.
        line(yellow("○"), item.name, yellow(item.why ?? "feature degrades"));
        if (item.where) console.log(`${" ".repeat(31)}${dim(`→ ${item.where}`)}`);
      }
    }
    console.log();
  }

  let missingTools = 0;
  if (env.commands?.length) {
    console.log(bold("toolchain"));
    for (const cmd of env.commands) {
      if (onPath(cmd)) line(green("✓"), cmd, dim("on PATH"));
      else {
        missingTools++;
        line(red("✗"), cmd, red("not on PATH"));
      }
    }
    console.log();
  }

  let missingFiles = 0;
  if (env.files?.length) {
    console.log(bold("files"));
    for (const file of env.files) {
      if (existsSync(join(cwd, file))) line(green("✓"), file, dim("present"));
      else {
        missingFiles++;
        line(red("✗"), file, red("missing"));
      }
    }
    console.log();
  }

  console.log(bold("harness"));
  if (config.guards) {
    const counts = [
      `${config.guards.blockedCommands?.length ?? 0} command rule(s)`,
      `${config.guards.readOnlyPaths?.length ?? 0} read-only path(s)`,
      `${config.guards.protectedBranches?.length ?? 0} protected branch(es)`,
    ].join(" · ");
    line(green("✓"), "guards configured", dim(counts));
    if (guardWired(cwd)) {
      line(green("✓"), "guard hook wired", dim("PreToolUse → dev-workflow guard"));
    } else {
      line(yellow("○"), "guard hook NOT wired", yellow("rules are documented but not enforced"));
      console.log(dim("\n  Wire it:\n"));
      console.log(dim(WIRING));
    }
  } else {
    line(yellow("○"), "no guards", dim("every documented rule is advisory"));
  }
  console.log();

  const blocked = missingRequired + missingTools + missingFiles;
  if (blocked === 0 && degraded === 0) {
    console.log(green("✓ ready\n"));
    return 0;
  }
  if (blocked === 0) {
    console.log(yellow(`✓ runnable · ${degraded} feature(s) degraded\n`));
    return 0;
  }
  console.log(red(`✗ ${blocked} blocker(s) — this project will not run correctly yet\n`));
  return 1;
}
