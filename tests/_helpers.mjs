// Shared helpers for the test suite. Not picked up by `node --test tests/*.test.mjs`
// because the filename doesn't match `*.test.mjs`.

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const BIN = join(REPO_ROOT, "bin.mjs");

const allTmpDirs = new Set();

export async function makeTmp(prefix = "dev-workflow-test-") {
	const dir = await mkdtemp(join(tmpdir(), prefix));
	allTmpDirs.add(dir);
	return dir;
}

export async function cleanupTmpDirs() {
	for (const dir of allTmpDirs) {
		await rm(dir, { recursive: true, force: true });
	}
	allTmpDirs.clear();
}

// Run the CLI in a child process. Returns { code, stdout, stderr }.
// Use `env` to inject overrides (e.g. PATH=/nonexistent for runtime checks).
export function runCli(args, cwd, opts = {}) {
	return new Promise((resolve, reject) => {
		const env = opts.env === "replace" ? opts.envValues : { ...process.env, ...(opts.env ?? {}) };
		const child = spawn(process.execPath, [BIN, ...args], {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
			env,
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
