// Guard rules — pure evaluation, no I/O.
//
// A rule that lives only in a doc is advisory. Advisory works while one person
// wrote the rules and remembers them; it stops working the day a second person
// (or an agent that skipped the docs) joins. These turn the rules a project has
// already written down into actions that cannot complete.
//
// Deliberately empty by default. Guards are project-specific — blocking
// `bun test` is right in a Vitest repo and wrong in one that uses Bun's runner —
// so a shared package must not impose them. Configure per project in
// `.claude/harness.json`; see `harness-config.mjs` for the shape.
//
// Pure so the interesting part is unit-tested without spawning a hook.
//
// KNOWN LIMIT: rules match the text of a command, so a command that merely
// *mentions* a blocked pattern (a grep for it, a doc edit quoting it) is blocked
// too. Verified the hard way — a rule fired on a test harness that contained the
// string. That is the correct side to err on, but write patterns tightly
// (anchor with ^) and expect the occasional false positive.

/** @typedef {{ pattern: string, message: string }} CommandRule */

/**
 * Decide whether a tool call should be blocked.
 *
 * @param {{ toolName: string, input: Record<string, unknown> }} call
 * @param {{ blockedCommands?: CommandRule[], readOnlyPaths?: string[], protectedBranches?: string[] }} config
 * @returns {{ reason: string, hint: string } | null} null ⇒ allow
 */
export function evaluateGuard(call, config = {}) {
  const { toolName, input } = call;

  if (toolName === "Bash") {
    const command = String(input?.command ?? "");

    for (const rule of config.blockedCommands ?? []) {
      let re;
      try {
        re = new RegExp(rule.pattern);
      } catch {
        continue; // a malformed rule must not wedge every tool call
      }
      if (re.test(command)) {
        return { reason: `blocked command: ${rule.pattern}`, hint: rule.message };
      }
    }

    const branchGuard = guardProtectedBranch(command, config.protectedBranches ?? []);
    if (branchGuard) return branchGuard;

    // A write to a read-only path can also arrive as a shell redirect or rm.
    for (const path of config.readOnlyPaths ?? []) {
      const prefix = globPrefix(path);
      if (!prefix) continue;
      if (
        new RegExp(`(>|>>|\\brm\\b|\\bmv\\b|\\bsed -i\\b)[^|;&]*${escapeRe(prefix)}`).test(command)
      ) {
        return {
          reason: `read-only path: ${path}`,
          hint: `${prefix} is declared read-only in project.yml. Copy what you need elsewhere instead of editing in place.`,
        };
      }
    }
    return null;
  }

  if (toolName === "Edit" || toolName === "Write" || toolName === "NotebookEdit") {
    const file = String(input?.file_path ?? input?.notebook_path ?? "");
    for (const path of config.readOnlyPaths ?? []) {
      if (matchesGlob(file, path)) {
        return {
          reason: `read-only path: ${path}`,
          hint: `This file is declared read-only in project.yml — external or vendored input that must not drift. Change the source, or copy it somewhere you own.`,
        };
      }
    }
  }

  return null;
}

/** `git push origin main`, `git commit` while on a protected branch, etc. */
function guardProtectedBranch(command, branches) {
  if (branches.length === 0) return null;
  const list = branches.map(escapeRe).join("|");

  // Explicit push to a protected ref.
  if (new RegExp(`git\\s+push[^|;&]*\\b(${list})\\b`).test(command)) {
    return {
      reason: "push to a protected branch",
      hint: `Open a PR instead. Protected: ${branches.join(", ")}.`,
    };
  }
  // Force-push anywhere is worth a human deciding.
  if (
    /git\s+push[^|;&]*(--force|(^|\s)-f(\s|$))/.test(command) &&
    !/--force-with-lease/.test(command)
  ) {
    return {
      reason: "force push",
      hint: "Use --force-with-lease, or push a new branch. A bare --force can discard someone else's commits.",
    };
  }
  return null;
}

/** Longest literal prefix of a glob — what a shell command would contain. */
function globPrefix(glob) {
  const star = glob.indexOf("*");
  return (star === -1 ? glob : glob.slice(0, star)).replace(/\/$/, "");
}

/** Prefix + `*` matching only; the same limited dialect `check` uses. */
export function matchesGlob(filePath, glob) {
  const normalized = filePath.split("\\").join("/");
  if (glob.endsWith("/**")) return normalized.includes(glob.slice(0, -3));
  if (glob.endsWith("*")) return normalized.includes(glob.slice(0, -1));
  return normalized.endsWith(glob);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
