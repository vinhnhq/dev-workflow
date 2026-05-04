// Tests for the doctor subcommand.
// Covers: happy path, critical runtime missing, project drift, --fix, --no-doctor.

import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { cleanupTmpDirs, makeTmp, runCli } from "./_helpers.mjs";

after(cleanupTmpDirs);

test("doctor exits 0 on a fresh init'd project with no critical drift", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	const { code, stdout } = await runCli(["doctor"], dir);
	assert.equal(code, 0);
	assert.match(stdout, /Runtime:/);
	assert.match(stdout, /Project:/);
	assert.match(stdout, /Summary: 0 critical/);
});

test("doctor skips Project section when cwd has no dev-workflow.md", async () => {
	const dir = await makeTmp();
	const { code, stdout } = await runCli(["doctor"], dir);
	// Runtime checks still run; project section is skipped.
	assert.match(stdout, /Runtime:/);
	assert.match(stdout, /cwd is not a dev-workflow project/);
	// Exit code depends on whether host has git etc.; just verify it's defined.
	assert.ok(code === 0 || code === 1);
});

test("doctor exits 1 when critical runtime tool is missing", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	// PATH=/nonexistent makes `which` itself unfindable, so every tool detects
	// as not installed. git is critical → exit 1.
	const { code, stdout } = await runCli(["doctor"], dir, {
		env: "replace",
		envValues: { PATH: "/nonexistent" },
	});
	assert.equal(code, 1, "should exit 1 when git is not findable");
	assert.match(stdout, /git.*not installed/);
});

test("doctor reports drift when .claude/commands/ is incomplete", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	await rm(join(dir, ".claude/commands/spec.md"));
	await rm(join(dir, ".claude/commands/build.md"));
	const { code, stdout } = await runCli(["doctor"], dir);
	// Warnings are non-critical → exit 0.
	assert.equal(code, 0);
	assert.match(stdout, /missing: spec, build/);
});

test("doctor reports warning when skills-lock.json declares unmaterialized skills", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	await writeFile(
		join(dir, "skills-lock.json"),
		`${JSON.stringify(
			{
				version: 1,
				skills: { "fake-skill": { source: "org/repo", sourceType: "github" } },
			},
			null,
			2,
		)}\n`,
	);
	const { code, stdout } = await runCli(["doctor"], dir);
	assert.equal(code, 0);
	assert.match(stdout, /1 of 1 skill\(s\) not materialized/);
	assert.match(stdout, /fake-skill/);
});

test("doctor exits 1 when skills-lock.json is malformed JSON", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	await writeFile(join(dir, "skills-lock.json"), "{ this is not json");
	const { code, stdout } = await runCli(["doctor"], dir);
	assert.equal(code, 1);
	assert.match(stdout, /skills-lock\.json — parse error/);
});

test("doctor --fix runs upgrade and restores drifted template files", async () => {
	const dir = await makeTmp();
	await runCli(["init", "--no-doctor"], dir);
	const original = await readFile(join(dir, "dev-workflow.md"), "utf8");
	await writeFile(join(dir, "dev-workflow.md"), `${original}\nLOCAL_DRIFT_LINE\n`);
	const { code } = await runCli(["doctor", "--fix"], dir);
	assert.equal(code, 0);
	const restored = await readFile(join(dir, "dev-workflow.md"), "utf8");
	assert.equal(restored, original, "drift should be reverted by upgrade");
});

test("init --no-doctor skips the post-init environment-check block", async () => {
	const dir = await makeTmp();
	const { code, stdout } = await runCli(["init", "--no-doctor"], dir);
	assert.equal(code, 0);
	assert.doesNotMatch(stdout, /environment check/);
	assert.doesNotMatch(stdout, /Runtime:/);
	// File creation should still happen.
	assert.ok(existsSync(join(dir, "dev-workflow.md")));
});

test("init without --no-doctor includes the environment-check block", async () => {
	const dir = await makeTmp();
	const { code, stdout } = await runCli(["init"], dir);
	assert.equal(code, 0);
	assert.match(stdout, /environment check/);
	assert.match(stdout, /Runtime:/);
});

test("doctor rejects unknown flag", async () => {
	const dir = await makeTmp();
	const { code, stderr } = await runCli(["doctor", "--bogus"], dir);
	assert.equal(code, 1);
	assert.match(stderr, /Unknown argument: --bogus/);
});
