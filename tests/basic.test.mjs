// Basic acceptance tests for the CLI.
// Uses node:test (built-in, no test framework dep).

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BIN = join(REPO_ROOT, "bin.mjs");

const tmpDirs = [];
async function makeTmp() {
	const dir = await mkdtemp(join(tmpdir(), "dev-workflow-test-"));
	tmpDirs.push(dir);
	return dir;
}

after(async () => {
	for (const dir of tmpDirs) {
		await rm(dir, { recursive: true, force: true });
	}
});

function runCli(args, cwd, opts = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [BIN, ...args], {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, ...(opts.env ?? {}) },
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			stdout += d;
		});
		child.stderr.on("data", (d) => {
			stderr += d;
		});
		child.on("close", (code) => resolve({ code, stdout, stderr }));
		child.on("error", reject);
	});
}

test("init copies core templates into target dir", async () => {
	const dir = await makeTmp();
	const { code } = await runCli(["init"], dir);
	assert.equal(code, 0);
	assert.ok(existsSync(join(dir, "dev-workflow.md")), "dev-workflow.md should exist");
	assert.ok(existsSync(join(dir, "scripts/release-check.sh")), "release-check.sh should exist");
	assert.ok(
		existsSync(join(dir, "__project__/tasks/README.md")),
		"__project__/tasks/README.md should exist",
	);
});

test("init --preset nextjs also copies preset templates", async () => {
	const dir = await makeTmp();
	const { code } = await runCli(["init", "--preset", "nextjs"], dir);
	assert.equal(code, 0);
	assert.ok(existsSync(join(dir, "dev-workflow.md")), "core file should exist");
	assert.ok(existsSync(join(dir, "dev-workflow-nextjs.md")), "preset file should exist");
	assert.ok(existsSync(join(dir, "biome.json")), "biome.json should exist");
	assert.ok(
		existsSync(join(dir, ".github/workflows/ci.yml")),
		"ci.yml should exist",
	);
});

test("init does not overwrite existing files", async () => {
	const dir = await makeTmp();
	const customContent = "CUSTOM USER CONTENT — DO NOT OVERWRITE\n";
	await writeFile(join(dir, "dev-workflow.md"), customContent);
	const { code, stdout } = await runCli(["init"], dir);
	assert.equal(code, 0);
	const after = await readFile(join(dir, "dev-workflow.md"), "utf8");
	assert.equal(after, customContent, "existing file must be preserved");
	assert.match(stdout, /skipped \(exists\): dev-workflow\.md/);
});

test("upgrade detects drift and shows diff in dry-run", async () => {
	const dir = await makeTmp();
	await runCli(["init"], dir);
	const original = await readFile(join(dir, "dev-workflow.md"), "utf8");
	await writeFile(join(dir, "dev-workflow.md"), `${original}\nLOCAL_DRIFT_LINE\n`);
	const { code, stdout } = await runCli(["upgrade", "--dry-run"], dir);
	assert.equal(code, 0);
	assert.match(stdout, /dev-workflow\.md/);
	assert.match(stdout, /LOCAL_DRIFT_LINE/);
	assert.match(stdout, /would update 0, skipped 1/);
	const stillDrifted = await readFile(join(dir, "dev-workflow.md"), "utf8");
	assert.ok(stillDrifted.includes("LOCAL_DRIFT_LINE"), "dry-run must not write");
});

test("upgrade --yes applies all updates", async () => {
	const dir = await makeTmp();
	await runCli(["init"], dir);
	const original = await readFile(join(dir, "dev-workflow.md"), "utf8");
	await writeFile(join(dir, "dev-workflow.md"), `${original}\nLOCAL_DRIFT_LINE\n`);
	const { code, stdout } = await runCli(["upgrade", "--yes"], dir);
	assert.equal(code, 0);
	assert.match(stdout, /updated 1/);
	const restored = await readFile(join(dir, "dev-workflow.md"), "utf8");
	assert.equal(restored, original, "file should match template again");
});

test("add-preset copies only preset files", async () => {
	const dir = await makeTmp();
	await runCli(["init"], dir);
	assert.ok(!existsSync(join(dir, "dev-workflow-nextjs.md")));
	const { code } = await runCli(["add-preset", "nextjs"], dir);
	assert.equal(code, 0);
	assert.ok(existsSync(join(dir, "dev-workflow-nextjs.md")));
	assert.ok(existsSync(join(dir, "biome.json")));
});

test("add-preset rejects unknown preset", async () => {
	const dir = await makeTmp();
	const { code, stderr } = await runCli(["add-preset", "bogus"], dir);
	assert.equal(code, 1);
	assert.match(stderr, /Unknown preset: bogus/);
	assert.match(stderr, /Available presets: nextjs/);
});

test("--version prints package version", async () => {
	const dir = await makeTmp();
	const pkg = JSON.parse(await readFile(join(REPO_ROOT, "package.json"), "utf8"));
	const { code, stdout } = await runCli(["--version"], dir);
	assert.equal(code, 0);
	assert.equal(stdout.trim(), pkg.version);
});

test("--help prints usage", async () => {
	const dir = await makeTmp();
	const { code, stdout } = await runCli(["--help"], dir);
	assert.equal(code, 0);
	assert.match(stdout, /dev-workflow — scaffold/);
	assert.match(stdout, /init \[--preset/);
});
