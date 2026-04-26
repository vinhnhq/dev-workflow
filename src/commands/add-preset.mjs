// add-preset: install a stack preset into an already-init'd project.
// Idempotent — re-running with the same preset is a no-op.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { copyTemplates } from "../lib/copy-templates.mjs";

const TEMPLATES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates");

export default async function addPreset(args) {
	let preset = null;
	let force = false;
	let dryRun = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--force") force = true;
		else if (arg === "--dry-run") dryRun = true;
		else if (!arg.startsWith("--") && preset === null) preset = arg;
		else {
			console.error(`Unknown argument: ${arg}`);
			return 1;
		}
	}

	if (!preset) {
		console.error("usage: dev-workflow add-preset <name> [--force] [--dry-run]");
		console.error(`Available presets: ${listPresets().join(", ") || "(none)"}`);
		return 1;
	}

	if (preset === "core") {
		console.error("'core' is installed by `init`, not `add-preset`.");
		return 1;
	}

	const presetDir = join(TEMPLATES_ROOT, preset);
	if (!existsSync(presetDir)) {
		console.error(`Unknown preset: ${preset}`);
		console.error(`Available presets: ${listPresets().join(", ") || "(none)"}`);
		return 1;
	}

	const target = process.cwd();
	const verb = dryRun ? "would create" : "created";
	const { created, skipped } = await copyTemplates(presetDir, target, { force, dryRun });

	console.log(`[${preset}]`);
	for (const f of created) console.log(`  ${verb}: ${f}`);
	for (const f of skipped) console.log(`  skipped (exists): ${f}`);
	console.log(`\n${verb} ${created.length}, skipped ${skipped.length}`);
	if (!dryRun && skipped.length > 0 && !force) {
		console.log("re-run with --force to overwrite existing files");
	}
	return 0;
}

function listPresets() {
	return readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name !== "core")
		.map((e) => e.name);
}
