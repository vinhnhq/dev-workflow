// Smoke tests for the CLI. The package's job is "drop the conventions seed
// plus the pipeline staging folder"; these guard that contract.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO_ROOT, "bin.mjs");
const PIPELINE_SOURCE = join(REPO_ROOT, "templates", "pipeline");

function run(args, cwd) {
	return execFileSync("node", [BIN, ...args], {
		cwd,
		encoding: "utf8",
	});
}

function tmp() {
	return mkdtempSync(join(tmpdir(), "dev-workflow-"));
}

test("writes dev-workflow.md into the current directory", () => {
	const dir = tmp();
	run([], dir);
	assert.ok(existsSync(join(dir, "dev-workflow.md")));
	const body = readFileSync(join(dir, "dev-workflow.md"), "utf8");
	assert.match(body, /Claude init protocol/);
});

test("writes the whole pipeline staging folder", () => {
	const dir = tmp();
	run([], dir);
	const expected = readdirSync(PIPELINE_SOURCE).sort();
	const actual = readdirSync(join(dir, "dev-workflow-pipeline")).sort();
	assert.deepEqual(actual, expected);
	assert.ok(expected.length > 0, "pipeline templates must not be empty");
});

test("the seed's init protocol names every pipeline file it ships", () => {
	// The step-4 list is only executable if it matches what lands on disk.
	const seed = readFileSync(join(REPO_ROOT, "templates", "dev-workflow.md"), "utf8");
	for (const file of readdirSync(PIPELINE_SOURCE)) {
		assert.match(seed, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
	}
});

test("--no-pipeline writes the seed only", () => {
	const dir = tmp();
	run(["--no-pipeline"], dir);
	assert.ok(existsSync(join(dir, "dev-workflow.md")));
	assert.ok(!existsSync(join(dir, "dev-workflow-pipeline")));
});

test("refuses to overwrite an existing dev-workflow.md without --force", () => {
	const dir = tmp();
	writeFileSync(join(dir, "dev-workflow.md"), "user content");
	assert.throws(() => run([], dir), /already exists/);
	assert.equal(readFileSync(join(dir, "dev-workflow.md"), "utf8"), "user content");
});

test("refuses to overwrite an existing dev-workflow-pipeline/ without --force", () => {
	const dir = tmp();
	mkdirSync(join(dir, "dev-workflow-pipeline"));
	assert.throws(() => run([], dir), /already exists/);
	// the seed is not written either — the run fails before any copy
	assert.ok(!existsSync(join(dir, "dev-workflow.md")));
});

test("--force overwrites existing targets", () => {
	const dir = tmp();
	writeFileSync(join(dir, "dev-workflow.md"), "user content");
	mkdirSync(join(dir, "dev-workflow-pipeline"));
	run(["--force"], dir);
	const body = readFileSync(join(dir, "dev-workflow.md"), "utf8");
	assert.match(body, /Claude init protocol/);
	assert.ok(readdirSync(join(dir, "dev-workflow-pipeline")).length > 0);
});

test("--version prints the package version", () => {
	const out = run(["--version"], REPO_ROOT).trim();
	const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
	assert.equal(out, pkg.version);
});

test("--help prints usage", () => {
	const out = run(["--help"], REPO_ROOT);
	assert.match(out, /dev-workflow/);
	assert.match(out, /--force/);
	assert.match(out, /--no-pipeline/);
});

test("rejects unknown arguments", () => {
	const dir = tmp();
	assert.throws(() => run(["--bogus"], dir), /Unknown argument/);
});
