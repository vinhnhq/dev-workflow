// Smoke tests for templates/pipeline/session-log-upsert.ts — the one piece
// of payload that is a real program rather than a document.
//
// Typechecking proves it compiles. These prove it RUNS, which matters more
// here: both bugs this script has ever shipped were runtime ones a type
// checker cannot see — a formatter-mangled table growing a phantom row on
// every write (io PR #55), and subagent tokens going uncounted (#54). Each
// has a test below.
//
// The script is driven exactly as the SessionEnd hook drives it: a JSON
// payload on stdin, real files on disk, output asserted from done.md. `gh`
// is expected to find no PR (the temp cwd is not a repo), so only the
// done.md path runs — which is the path that corrupts.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(REPO_ROOT, "templates", "pipeline", "session-log-upsert.ts");

/** One assistant turn: 1M in / 1M out, so opus pricing lands on exactly $30. */
const turn = (model, timestamp) =>
	JSON.stringify({
		type: "assistant",
		timestamp,
		message: {
			model,
			usage: { input_tokens: 1e6, output_tokens: 1e6 },
		},
	});

function setup({ done = null, sessionId = "abcd1234efgh" } = {}) {
	const cwd = mkdtempSync(join(tmpdir(), "dw-pipeline-"));
	mkdirSync(join(cwd, "__project__", "tasks"), { recursive: true });
	writeFileSync(
		join(cwd, "__project__", "tasks", "done.md"),
		done ?? "# Done\n\n2026-07-27 · `abc1234` · shipped something\n",
	);

	const transcript = join(cwd, "transcript.jsonl");
	writeFileSync(
		transcript,
		[
			turn("claude-opus-5", "2026-07-27T10:00:00.000Z"),
			turn("claude-opus-5", "2026-07-27T11:30:00.000Z"),
		].join("\n"),
	);

	return { cwd, transcript, sessionId };
}

/** Run the hook the way Claude Code runs it, and return the resulting done.md. */
function run({ cwd, transcript, sessionId }) {
	execFileSync("bun", [SCRIPT], {
		cwd,
		input: JSON.stringify({ transcript_path: transcript, cwd, session_id: sessionId }),
		encoding: "utf8",
		// The script shells out to `gh`; in a non-repo it fails fast and the
		// PR-comment branch is skipped. Keep a ceiling so a hung gh can't hang CI.
		timeout: 60_000,
	});
	return readFileSync(join(cwd, "__project__", "tasks", "done.md"), "utf8");
}

const dataRows = (body) =>
	body
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.startsWith("| ") && !l.includes("---") && !l.includes("ended (UTC)"));

test("writes one session row with cost, tokens and model", () => {
	const ctx = setup();
	const body = run(ctx);

	assert.match(body, /## Session log/);
	assert.match(body, /<!-- claude-session-log -->/);

	const rows = dataRows(body);
	assert.equal(rows.length, 1, `expected exactly one data row, got:\n${rows.join("\n")}`);
	assert.match(rows[0], /`abcd1234`/, "row is keyed by the short session id");
	assert.match(rows[0], /opus-5/, "the claude- prefix is stripped for width");
	// 2 turns x (1M in @ $5 + 1M out @ $25) = $60.00
	assert.match(rows[0], /\$60\.00 \|$/);
	assert.match(rows[0], /1h 30m/, "duration spans first to last timestamp");
	assert.match(body, /\*\*Cumulative est\. cost: \$60\.00\*\*/);

	// The pre-existing content must survive.
	assert.match(body, /shipped something/);
	rmSync(ctx.cwd, { recursive: true, force: true });
});

test("re-running the same session replaces its row instead of appending", () => {
	const ctx = setup();
	run(ctx);
	const body = run(ctx);

	const rows = dataRows(body);
	assert.equal(rows.length, 1, `a session must own exactly one row, got:\n${rows.join("\n")}`);
	assert.match(body, /\*\*Cumulative est\. cost: \$60\.00\*\*/, "cost must not double-count");
	rmSync(ctx.cwd, { recursive: true, force: true });
});

test("a second session adds a row and the cumulative sums both", () => {
	const first = setup();
	run(first);
	const body = run({ ...first, sessionId: "99998888zzzz" });

	assert.equal(dataRows(body).length, 2);
	assert.match(body, /\*\*Cumulative est\. cost: \$120\.00\*\*/);
	rmSync(first.cwd, { recursive: true, force: true });
});

// Regression: infinite-oneness PR #55. A markdown formatter can pull the
// cumulative line into the table as a row; the old implementation then read
// it back as data, so every run added another phantom row and the total
// compounded. The fix rebuilds the section from genuine rows only.
test("a formatter-mangled cumulative line is healed, not read back as data", () => {
	const corrupted = [
		"# Done",
		"",
		"## Session log (auto — SessionEnd hook)",
		"",
		"<!-- claude-session-log -->",
		"### 🤖 Session log",
		"",
		"| ended (UTC) | author | session | duration | models | tokens in/out/cache-read | est. cost |",
		"|---|---|---|---|---|---|---|",
		"| 2026-07-01 09:00 | Someone | `deadbeef` | 0h 30m | opus-5 | 1M/1M/0 | $10.00 |",
		// the formatter absorbed the total into the table:
		"| **Cumulative est. cost: $10.00** _(API-rate estimate; subscription-billed)_ |",
		"",
	].join("\n");

	const ctx = setup({ done: corrupted });
	const body = run(ctx);

	const rows = dataRows(body);
	assert.equal(
		rows.filter((r) => r.includes("Cumulative")).length,
		0,
		`no row may be a cumulative line, got:\n${rows.join("\n")}`,
	);
	assert.equal(rows.length, 2, "the genuine prior row survives, ours is added");
	// $10 carried over + $60 ours — proof the phantom was excluded from the sum.
	assert.match(body, /\*\*Cumulative est\. cost: \$70\.00\*\*/);

	// And it must stay healed across another write.
	const again = run(ctx);
	assert.equal(dataRows(again).length, 2);
	assert.match(again, /\*\*Cumulative est\. cost: \$70\.00\*\*/);
	rmSync(ctx.cwd, { recursive: true, force: true });
});

// Regression: infinite-oneness PR #54. Subagent transcripts live outside the
// main one, under the session's tmp dir. Missing them under-reports every
// session that ran a QA subagent — with the ship ritual, most of them.
test("subagent transcripts are counted and surfaced in the models column", () => {
	const ctx = setup({ sessionId: "5555aaaa6666" });
	const agentDir = `/private/tmp/claude-${process.getuid?.() ?? ""}/${ctx.cwd.replace(/[/.]/g, "-")}/${ctx.sessionId}/tasks`;
	mkdirSync(agentDir, { recursive: true });
	writeFileSync(join(agentDir, "agent-1.output"), turn("claude-haiku-4-5", "2026-07-27T10:15:00.000Z"));

	const body = run(ctx);
	const [row] = dataRows(body);

	assert.match(row, /\(\+1 agents\)/, "the agent count is visible in the row");
	assert.match(row, /haiku-4-5/, "the agent's model is listed");
	// $60 main + haiku 1M in @ $1 + 1M out @ $5 = $66.00
	assert.match(row, /\$66\.00 \|$/, "agent tokens are included in the cost");

	// Duration still comes from the main transcript only.
	assert.match(row, /1h 30m/);

	rmSync(agentDir, { recursive: true, force: true });
	rmSync(ctx.cwd, { recursive: true, force: true });
});

test("a session with no assistant turns writes nothing", () => {
	const ctx = setup();
	writeFileSync(ctx.transcript, JSON.stringify({ type: "user", message: { content: "hi" } }));
	const body = run(ctx);

	assert.ok(!body.includes("Session log"), "an empty session must not create a section");
	assert.match(body, /shipped something/);
	rmSync(ctx.cwd, { recursive: true, force: true });
});

test("a missing transcript is a no-op, not a crash", () => {
	const ctx = setup();
	rmSync(ctx.transcript);
	const body = run(ctx);

	assert.ok(!body.includes("Session log"));
	assert.ok(existsSync(join(ctx.cwd, "__project__", "tasks", "done.md")));
	rmSync(ctx.cwd, { recursive: true, force: true });
});
