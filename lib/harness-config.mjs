// `.claude/harness.json` — the harness's own configuration.
//
// Deliberately NOT in project.yml. That file is project *identity* (slug, name,
// stack, highlights) and is read by the portfolio and the ops console; regex
// guard rules and env manifests are tooling, and mixing them pollutes a
// public-facing document with private plumbing.
//
// JSON rather than YAML for one reason: exactness. Guards decide whether a tool
// call is blocked, so a hand-rolled YAML subset silently mis-parsing a rule
// would disable a safeguard without telling anyone. JSON.parse either works or
// throws. It also keeps this package dependency-free.
//
// Shape (every field optional):
// {
//   "environment": {
//     "required": [{ "name": "DATABASE_URL", "why": "...", "where": "..." }],
//     "optional": [{ "name": "ANTHROPIC_API_KEY", "why": "...", "where": "..." }],
//     "commands": ["bun", "node"],
//     "files":    [".env.local"]
//   },
//   "guards": {
//     "blockedCommands":   [{ "pattern": "^bun test(\\s|$)", "message": "..." }],
//     "readOnlyPaths":     ["__project__/reference/**"],
//     "protectedBranches": ["main"]
//   }
// }

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const HARNESS_PATH = join(".claude", "harness.json");

/** Read the config. Returns null when absent; throws only on malformed JSON. */
export function readHarnessConfig(cwd) {
  const path = join(cwd, HARNESS_PATH);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Never throws — for the hook path, where a config error must not wedge the session. */
export function readHarnessConfigSafe(cwd) {
  try {
    return readHarnessConfig(cwd);
  } catch {
    return null;
  }
}

export const EXAMPLE = `{
  "environment": {
    "required": [
      { "name": "DATABASE_URL", "why": "every read; the app 500s without it", "where": "Neon dashboard" }
    ],
    "optional": [
      { "name": "ANTHROPIC_API_KEY", "why": "search + agents degrade silently to UNCONFIGURED", "where": "console.anthropic.com" }
    ],
    "commands": ["bun", "node"],
    "files": [".env.local"]
  },
  "guards": {
    "blockedCommands": [
      { "pattern": "^bun test(\\\\s|$)", "message": "Use 'bun run test' — bare 'bun test' runs Bun's runner, finds 0 files, and exits 0." }
    ],
    "readOnlyPaths": ["__project__/reference/**"],
    "protectedBranches": ["main"]
  }
}`;
