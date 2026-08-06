// `dev-workflow guard` — the PreToolUse hook entry point.
//
// Reads the hook payload on stdin, applies the project's guards, and exits 2 to
// block. Exit 2 + stderr is the stable contract across harness versions: the
// call does not run and the message is handed back to the agent, so it learns
// the rule instead of retrying blindly.
//
// Fails OPEN by design. A guard that crashes must not wedge every tool call in
// the session — a missing guard is a bad day, a jammed session is a worse one.
// Every failure path below returns 0.

import { text } from "node:stream/consumers";

import { evaluateGuard } from "./guards.mjs";
import { readHarnessConfigSafe } from "./harness-config.mjs";

/**
 * Read the hook payload, or give up after two seconds.
 *
 * A race rather than hand-rolled event handling: whichever settles first wins,
 * and there is exactly one resolution path per promise. A timed-out read yields
 * "" — same outcome as partial input, since neither parses as JSON and the
 * guard then fails open.
 */
const readStdin = () =>
  Promise.race([
    text(process.stdin).catch(() => ""),
    new Promise((resolve) => {
      setTimeout(() => resolve(""), 2000); // never hang the tool call
    }),
  ]);

export async function runGuard({ cwd = process.cwd(), stdin } = {}) {
  let payload;
  try {
    payload = JSON.parse(stdin ?? (await readStdin()));
  } catch {
    return 0; // not a hook payload we understand — allow
  }

  const toolName = payload?.tool_name ?? payload?.toolName;
  const input = payload?.tool_input ?? payload?.toolInput ?? {};
  if (!toolName) return 0;

  const config = readHarnessConfigSafe(cwd)?.guards;
  if (!config) return 0; // no guards configured — nothing to enforce

  const verdict = evaluateGuard({ toolName, input }, config);
  if (!verdict) return 0;

  // stderr is what the agent reads. Say what was blocked, why, and what to do.
  process.stderr.write(`Blocked by dev-workflow guard — ${verdict.reason}\n\n${verdict.hint}\n`);
  return 2;
}
