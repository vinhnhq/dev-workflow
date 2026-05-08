// Smoke tests for the CLI. The package's whole job is "drop one file";
// these guard that contract.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO_ROOT, "bin.mjs");

function run(args, cwd) {
	return execFileSync("node", [BIN, ...args], {
		cwd,
		encoding: "utf8",
	});
}

test("writes dev-workflow.md into the current directory", () => {
	const dir = mkdtempSync(join(tmpdir(), "dev-workflow-"));
	run([], dir);
	assert.ok(existsSync(join(dir, "dev-workflow.md")));
	const body = readFileSync(join(dir, "dev-workflow.md"), "utf8");
	assert.match(body, /Claude init protocol/);
});

test("refuses to overwrite an existing dev-workflow.md without --force", () => {
	const dir = mkdtempSync(join(tmpdir(), "dev-workflow-"));
	writeFileSync(join(dir, "dev-workflow.md"), "user content");
	assert.throws(() => run([], dir), /already exists/);
	assert.equal(readFileSync(join(dir, "dev-workflow.md"), "utf8"), "user content");
});

test("--force overwrites an existing dev-workflow.md", () => {
	const dir = mkdtempSync(join(tmpdir(), "dev-workflow-"));
	writeFileSync(join(dir, "dev-workflow.md"), "user content");
	run(["--force"], dir);
	const body = readFileSync(join(dir, "dev-workflow.md"), "utf8");
	assert.match(body, /Claude init protocol/);
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
});

test("rejects unknown arguments", () => {
	const dir = mkdtempSync(join(tmpdir(), "dev-workflow-"));
	assert.throws(() => run(["--bogus"], dir), /Unknown argument/);
});
