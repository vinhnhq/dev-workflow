// init: copy core (+ optional preset) templates into cwd.
// Skips files that already exist unless --force.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { copyTemplates } from "../lib/copy-templates.mjs";

const TEMPLATES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates");

export default async function init(args) {
	let preset = null;
	let force = false;
	let dryRun = false;
	let noDoctor = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--preset") {
			preset = args[++i];
			if (!preset) {
				console.error("--preset requires a value");
				return 1;
			}
		} else if (arg === "--force") {
			force = true;
		} else if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg === "--no-doctor") {
			noDoctor = true;
		} else {
			console.error(`Unknown argument: ${arg}`);
			return 1;
		}
	}

	const sources = [{ label: "core", dir: join(TEMPLATES_ROOT, "core") }];
	if (preset) {
		const presetDir = join(TEMPLATES_ROOT, preset);
		if (!existsSync(presetDir)) {
			console.error(`Unknown preset: ${preset}`);
			console.error(`Available presets: ${listPresets().join(", ") || "(none)"}`);
			return 1;
		}
		sources.push({ label: preset, dir: presetDir });
	}

	const target = process.cwd();
	let totalCreated = 0;
	let totalSkipped = 0;
	const verb = dryRun ? "would create" : "created";

	for (const { label, dir } of sources) {
		const { created, skipped } = await copyTemplates(dir, target, { force, dryRun });
		console.log(`[${label}]`);
		for (const f of created) console.log(`  ${verb}: ${f}`);
		for (const f of skipped) console.log(`  skipped (exists): ${f}`);
		totalCreated += created.length;
		totalSkipped += skipped.length;
	}

	console.log(`\n${verb} ${totalCreated}, skipped ${totalSkipped}`);
	if (!dryRun && totalSkipped > 0 && !force) {
		console.log("re-run with --force to overwrite existing files");
	}

	// Auto-run doctor so a fresh user immediately sees what's missing on
	// their machine (Claude Code, gh, bun, etc.). Skip on --dry-run since
	// no files were written and doctor would show drift against nothing.
	// Init's return code stays unaffected by doctor's findings — init
	// itself succeeded.
	if (!noDoctor && !dryRun) {
		console.log("\n--- environment check ---");
		const { default: doctor } = await import("./doctor.mjs");
		await doctor([]);
	}

	return 0;
}

function listPresets() {
	return readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name !== "core")
		.map((e) => e.name);
}
