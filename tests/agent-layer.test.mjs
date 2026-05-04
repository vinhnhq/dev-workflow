// Tests for the agent-layer files shipped by init via templates/core/.
// Covers: init writes them, idempotency, --force overwrite, upgrade drift detection.

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { cleanupTmpDirs, makeTmp, runCli } from "./_helpers.mjs";

after(cleanupTmpDirs);

const COMMANDS = ["spec", "plan", "build", "test", "review", "ship", "code-simplify"];

test("init writes all 7 .claude/commands/*.md files", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	for (const cmd of COMMANDS) {
		assert.ok(
			existsSync(join(dir, ".claude/commands", `${cmd}.md`)),
			`expected .claude/commands/${cmd}.md to exist`,
		);
	}
});

test("init writes .claude/settings.json enabling agent-skills@anthropic", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	const path = join(dir, ".claude/settings.json");
	assert.ok(existsSync(path));
	const json = JSON.parse(await readFile(path, "utf8"));
	assert.equal(json.enabledPlugins?.["agent-skills@anthropic"], true);
});

test("init writes CLAUDE.md skeleton and skills-lock.json", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	assert.ok(existsSync(join(dir, "CLAUDE.md")));
	const lock = JSON.parse(await readFile(join(dir, "skills-lock.json"), "utf8"));
	assert.equal(lock.version, 1);
	assert.deepEqual(lock.skills, {});
});

test("init writes scripts/feature-pr.sh as executable", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	const path = join(dir, "scripts/feature-pr.sh");
	assert.ok(existsSync(path));
	const { mode } = await import("node:fs/promises").then((m) => m.stat(path));
	// Owner-execute bit (0o100 in octal layout for stat.mode)
	assert.ok(mode & 0o100, `feature-pr.sh should be executable; mode=${(mode & 0o777).toString(8)}`);
});

test("re-running init skips existing agent-layer files (idempotent)", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	const customContent = "USER EDIT — do not overwrite\n";
	await writeFile(join(dir, ".claude/commands/spec.md"), customContent);
	const { code, stdout } = await runCli(["init", "--no-doctor"], dir);
	assert.equal(code, 0);
	const after = await readFile(join(dir, ".claude/commands/spec.md"), "utf8");
	assert.equal(after, customContent, "user edit should be preserved");
	assert.match(stdout, /skipped \(exists\): \.claude\/commands\/spec\.md/);
});

test("init --force overwrites existing agent-layer files", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	await writeFile(join(dir, ".claude/commands/spec.md"), "USER EDIT\n");
	const { code } = await runCli(["init", "--force", "--no-doctor"], dir);
	assert.equal(code, 0);
	const restored = await readFile(join(dir, ".claude/commands/spec.md"), "utf8");
	assert.match(restored, /agent-skills:spec-driven-development/);
});

test("upgrade shows diff when .claude/commands/spec.md drifts", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	const original = await readFile(join(dir, ".claude/commands/spec.md"), "utf8");
	await writeFile(join(dir, ".claude/commands/spec.md"), `${original}\nDRIFT\n`);
	const { code, stdout } = await runCli(["upgrade", "--dry-run"], dir);
	assert.equal(code, 0);
	assert.match(stdout, /\.claude\/commands\/spec\.md/);
	assert.match(stdout, /DRIFT/);
	assert.match(stdout, /would update 0, skipped 1/);
});

test("upgrade --yes restores all drifted agent-layer files", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	const original = await readFile(join(dir, ".claude/settings.json"), "utf8");
	await writeFile(join(dir, ".claude/settings.json"), `${original}\n// drift comment\n`);
	const { code } = await runCli(["upgrade", "--yes"], dir);
	assert.equal(code, 0);
	const restored = await readFile(join(dir, ".claude/settings.json"), "utf8");
	assert.equal(restored, original);
});
