// upgrade: diff cwd files against templates/, prompt to apply each diff.
// Skips files that don't exist locally (those are init's job).

import { existsSync, readdirSync } from "node:fs";
import { chmod, copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { diffFiles, renderDiff } from "../lib/diff-files.mjs";
import { resolveRepos } from "../lib/glob.mjs";

const TEMPLATES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates");

export default async function upgrade(args) {
	let yes = false;
	let dryRun = false;
	let reposGlob = null;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--yes" || arg === "-y") yes = true;
		else if (arg === "--dry-run") dryRun = true;
		else if (arg === "--repos") {
			reposGlob = args[++i];
			if (!reposGlob) {
				console.error("--repos requires a glob value");
				return 1;
			}
		} else {
			console.error(`Unknown argument: ${arg}`);
			return 1;
		}
	}

	// Multi-repo mode is opinionated: per-file prompts across N repos are
	// unusable. Force --yes (apply all) or --dry-run (preview only).
	if (reposGlob && !yes && !dryRun) {
		console.error("--repos requires --yes or --dry-run (interactive per-file prompts don't scale across repos)");
		return 1;
	}

	if (reposGlob) {
		const dirs = resolveRepos(reposGlob).filter((d) => existsSync(join(d, "dev-workflow.md")));
		if (dirs.length === 0) {
			console.log(`(no dev-workflow projects matched ${reposGlob})`);
			return 0;
		}
		let totalUpdated = 0;
		let totalSkipped = 0;
		let totalUnchanged = 0;
		for (const dir of dirs) {
			console.log(`\n=== ${dir} ===`);
			const counts = await upgradeForDir(dir, { yes, dryRun });
			totalUpdated += counts.updated;
			totalSkipped += counts.skipped;
			totalUnchanged += counts.unchanged;
		}
		const verb = dryRun ? "would update" : "updated";
		console.log(`\nSummary: ${verb} ${totalUpdated}, skipped ${totalSkipped}, unchanged ${totalUnchanged} across ${dirs.length} repo${dirs.length === 1 ? "" : "s"}`);
		return 0;
	}

	const counts = await upgradeForDir(process.cwd(), { yes, dryRun });
	const verb = dryRun ? "would update" : "updated";
	console.log(`\n${verb} ${counts.updated}, skipped ${counts.skipped}, unchanged ${counts.unchanged}`);
	return counts.aborted ? 1 : 0;
}

async function upgradeForDir(cwd, { yes, dryRun }) {
	const installed = ["core", ...detectInstalledPresets(cwd)];
	console.log(`detected: ${installed.join(", ")}`);

	const useColor = process.stdout.isTTY;
	const interactive = process.stdin.isTTY && !yes && !dryRun;

	let updated = 0;
	let skipped = 0;
	let unchanged = 0;
	let allYes = yes;
	let skipRest = false;

	for (const presetName of installed) {
		const root = join(TEMPLATES_ROOT, presetName);
		const files = await listFiles(root);

		for (const relPath of files) {
			const templatePath = join(root, relPath);
			const localPath = join(cwd, relPath);
			if (!existsSync(localPath)) continue;

			const result = await diffFiles(localPath, templatePath);
			if (result.identical) {
				unchanged++;
				continue;
			}

			console.log(`\n--- ${relPath} ---`);
			console.log(renderDiff(result.ops, useColor));

			if (dryRun) {
				console.log("(dry-run, not applied)");
				skipped++;
				continue;
			}

			let apply = allYes;
			if (!apply && !skipRest) {
				if (!interactive) {
					console.error("\nrefusing to prompt without a TTY — re-run with --yes or --dry-run");
					return { updated, skipped, unchanged, aborted: true };
				}
				const answer = await prompt("apply? [y]es / [n]o / [a]ll yes / [s]kip rest: ");
				if (answer === "a" || answer === "all") {
					allYes = true;
					apply = true;
				} else if (answer === "s" || answer === "skip") {
					skipRest = true;
				} else if (answer === "y" || answer === "yes") {
					apply = true;
				}
			}

			if (apply) {
				await mkdir(dirname(localPath), { recursive: true });
				await copyFile(templatePath, localPath);
				const srcStat = await stat(templatePath);
				await chmod(localPath, srcStat.mode);
				console.log(`updated: ${relPath}`);
				updated++;
			} else {
				console.log(`skipped: ${relPath}`);
				skipped++;
			}
		}
	}

	return { updated, skipped, unchanged };
}


function detectInstalledPresets(cwd) {
	const presets = readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name !== "core")
		.map((e) => e.name);
	return presets.filter((p) => hasAnyMatchingFile(join(TEMPLATES_ROOT, p), cwd));
}

function hasAnyMatchingFile(presetRoot, cwd) {
	for (const rel of walkSync(presetRoot, presetRoot)) {
		if (existsSync(join(cwd, rel))) return true;
	}
	return false;
}

function walkSync(rootDir, currentDir) {
	const out = [];
	for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
		const p = join(currentDir, entry.name);
		if (entry.isDirectory()) out.push(...walkSync(rootDir, p));
		else if (entry.isFile()) out.push(relative(rootDir, p));
	}
	return out;
}

async function listFiles(root) {
	const out = [];
	await walk(root, root, out);
	return out;
}

async function walk(rootDir, current, out) {
	const entries = await readdir(current, { withFileTypes: true });
	for (const entry of entries) {
		const p = join(current, entry.name);
		if (entry.isDirectory()) await walk(rootDir, p, out);
		else if (entry.isFile()) out.push(relative(rootDir, p));
	}
}

function prompt(q) {
	return new Promise((resolve) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout });
		rl.question(q, (a) => {
			rl.close();
			resolve(a.trim().toLowerCase());
		});
	});
}
