// Tests for `--repos <glob>` on doctor and upgrade.
// Setup: a parent tmpdir with 3 subdirs — init'd, init'd, and not-a-project.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { cleanupTmpDirs, makeTmp, runCli } from "./_helpers.mjs";

after(cleanupTmpDirs);

async function makeMultiRepoFixture() {
	const parent = await makeTmp("dev-workflow-multi-");
	const a = join(parent, "proj-a");
	const b = join(parent, "proj-b");
	const c = join(parent, "not-a-project");
	await mkdir(a);
	await mkdir(b);
	await mkdir(c);
	await runCli(["init", "--no-doctor"], a);
	await runCli(["init", "--no-doctor"], b);
	// c stays empty — no dev-workflow.md, should be silently skipped
	return { parent, a, b, c };
}

test("doctor --repos audits matching dev-workflow projects, skips others", async () => {
	const { parent } = await makeMultiRepoFixture();
	const { code, stdout } = await runCli(["doctor", "--repos", `${parent}/*`], parent);
	assert.equal(code, 0);
	assert.match(stdout, /2 dev-workflow projects from glob, 1 skipped/);
	assert.match(stdout, /=== .*proj-a ===/);
	assert.match(stdout, /=== .*proj-b ===/);
	assert.doesNotMatch(stdout, /=== .*not-a-project ===/);
	assert.match(stdout, /across 2 repos/);
});

test("doctor --repos with no matches reports cleanly", async () => {
	const empty = await makeTmp("dev-workflow-empty-");
	const { code, stdout } = await runCli(["doctor", "--repos", `${empty}/*`], empty);
	assert.equal(code, 0);
	assert.match(stdout, /0 dev-workflow projects from glob/);
});

test("upgrade --repos requires --yes or --dry-run", async () => {
	const { parent } = await makeMultiRepoFixture();
	const { code, stderr } = await runCli(["upgrade", "--repos", `${parent}/*`], parent);
	assert.equal(code, 1);
	assert.match(stderr, /--repos requires --yes or --dry-run/);
});

test("upgrade --repos --dry-run shows diffs per matching repo, writes nothing", async () => {
	const { parent, a, b } = await makeMultiRepoFixture();
	// drift both projects
	const originalA = await readFile(join(a, "dev-workflow.md"), "utf8");
	await writeFile(join(a, "dev-workflow.md"), `${originalA}\nDRIFT_A\n`);
	const originalB = await readFile(join(b, "dev-workflow.md"), "utf8");
	await writeFile(join(b, "dev-workflow.md"), `${originalB}\nDRIFT_B\n`);

	const { code, stdout } = await runCli(["upgrade", "--repos", `${parent}/*`, "--dry-run"], parent);
	assert.equal(code, 0);
	assert.match(stdout, /=== .*proj-a ===/);
	assert.match(stdout, /=== .*proj-b ===/);
	assert.match(stdout, /DRIFT_A/);
	assert.match(stdout, /DRIFT_B/);
	assert.match(stdout, /Summary: would update 0/);

	// Drift should still be there — dry-run doesn't write.
	const stillA = await readFile(join(a, "dev-workflow.md"), "utf8");
	const stillB = await readFile(join(b, "dev-workflow.md"), "utf8");
	assert.ok(stillA.includes("DRIFT_A"));
	assert.ok(stillB.includes("DRIFT_B"));
});

test("upgrade --repos --yes restores all drifted files across repos", async () => {
	const { parent, a, b } = await makeMultiRepoFixture();
	const originalA = await readFile(join(a, "dev-workflow.md"), "utf8");
	await writeFile(join(a, "dev-workflow.md"), `${originalA}\nDRIFT_A\n`);
	const originalB = await readFile(join(b, "dev-workflow.md"), "utf8");
	await writeFile(join(b, "dev-workflow.md"), `${originalB}\nDRIFT_B\n`);

	const { code, stdout } = await runCli(["upgrade", "--repos", `${parent}/*`, "--yes"], parent);
	assert.equal(code, 0);
	assert.match(stdout, /Summary: updated 2/);

	const restoredA = await readFile(join(a, "dev-workflow.md"), "utf8");
	const restoredB = await readFile(join(b, "dev-workflow.md"), "utf8");
	assert.equal(restoredA, originalA);
	assert.equal(restoredB, originalB);
});

test("doctor --repos --fix runs upgrade per repo (drifted files restored)", async () => {
	const { parent, a, b } = await makeMultiRepoFixture();
	const originalA = await readFile(join(a, ".claude/commands/spec.md"), "utf8");
	await writeFile(join(a, ".claude/commands/spec.md"), `${originalA}\nDRIFT\n`);

	const { code } = await runCli(["doctor", "--repos", `${parent}/*`, "--fix"], parent);
	assert.equal(code, 0);

	const restored = await readFile(join(a, ".claude/commands/spec.md"), "utf8");
	assert.equal(restored, originalA, "drift should be reverted");
	// b was not drifted; should be unchanged.
	assert.ok(existsSync(join(b, ".claude/commands/spec.md")));
});

test("doctor --repos requires a glob value", async () => {
	const dir = await makeTmp();
	const { code, stderr } = await runCli(["doctor", "--repos"], dir);
	assert.equal(code, 1);
	assert.match(stderr, /--repos requires a glob value/);
});
