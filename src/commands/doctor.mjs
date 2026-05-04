// doctor: audit the agent's environment (runtime tools) and the project state
// (workflow files + agent-layer manifest). Prints a copy-paste punch list of
// what's missing and exits 1 if any critical runtime tool is absent.
//
// Works without Claude Code installed — that's the thing being checked for.
// Zero npm deps.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { resolveRepos } from "../lib/glob.mjs";

const COLORS = {
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	green: "\x1b[32m",
	dim: "\x1b[2m",
	reset: "\x1b[0m",
};

const SYMBOLS = { ok: "✓", warn: "⚠", crit: "✗" };

const REQUIRED_COMMANDS = ["spec", "plan", "build", "test", "review", "ship", "code-simplify"];

export default async function doctor(args) {
	let fix = false;
	let reposGlob = null;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === "--fix") fix = true;
		else if (a === "--repos") {
			reposGlob = args[++i];
			if (!reposGlob) {
				console.error("--repos requires a glob value");
				return 1;
			}
		} else if (a === "--no-color") {
			// noop; useColor reads isTTY at call time
		} else {
			console.error(`Unknown argument: ${a}`);
			return 1;
		}
	}

	const useColor = process.stdout.isTTY;

	// Runtime checks always run once at the top — they're machine-level,
	// not project-level. Same answer whether we're auditing one repo or fifty.
	const runtime = checkRuntime();

	// Resolve the list of project dirs to audit.
	// - No --repos: just the cwd (single-repo mode, today's behavior).
	// - --repos <glob>: every dir matching the glob that contains dev-workflow.md.
	const projectDirs = reposGlob ? resolveRepos(reposGlob).filter((d) => existsSync(join(d, "dev-workflow.md"))) : [process.cwd()];

	const reportEntries = [];
	for (const dir of projectDirs) {
		const isProject = existsSync(join(dir, "dev-workflow.md"));
		const project = isProject ? checkProject(dir) : null;
		reportEntries.push({ dir, project, isProject });
	}

	printReport(runtime, reportEntries, useColor, { multiRepo: reposGlob !== null, totalMatchedByGlob: reposGlob ? resolveRepos(reposGlob).length : 0 });

	const projectChecks = reportEntries.flatMap((e) => e.project ?? []);
	const criticals = countLevel([runtime, projectChecks], "crit");

	if (fix) {
		await applyFixes(reportEntries);
	}

	return criticals > 0 ? 1 : 0;
}

async function applyFixes(reportEntries) {
	const fixable = reportEntries.filter((e) => e.isProject);
	if (fixable.length === 0) {
		console.log("\n--fix skipped: no dev-workflow projects to fix");
		return;
	}
	const { default: upgrade } = await import("./upgrade.mjs");
	for (const { dir } of fixable) {
		console.log(`\n--- applying fixes in ${dir} ---`);
		const cwdSave = process.cwd();
		process.chdir(dir);
		try {
			await upgrade(["--yes"]);
		} finally {
			process.chdir(cwdSave);
		}
	}
}

// ---------- runtime checks ----------

function checkRuntime() {
	const out = [];

	const nodeMajor = Number(process.versions.node.split(".")[0]);
	if (nodeMajor >= 20) {
		out.push({ name: "node", level: "ok", detail: `v${process.versions.node}` });
	} else {
		out.push({
			name: "node",
			level: "crit",
			detail: `v${process.versions.node} (need ≥20)`,
			fix: "https://nodejs.org/en/download",
		});
	}

	pushTool(out, "git", { level: "crit", fix: "brew install git  (macOS)  |  https://git-scm.com  (other)" });
	pushTool(out, "bun", { level: "warn", fix: "curl -fsSL https://bun.sh/install | bash  (only required if your preset uses Bun)" });
	pushTool(out, "gh", { level: "warn", fix: "brew install gh  (macOS)  |  https://cli.github.com  (other) — required by release-check.sh" });
	pushTool(out, "claude", { level: "warn", fix: "https://docs.claude.com/claude-code/install — Claude Code harness" });

	return out;
}

function pushTool(out, cmd, opts) {
	if (which(cmd)) {
		const v = spawnSync(cmd, ["--version"], { encoding: "utf8" });
		const detail = v.status === 0 && v.stdout ? v.stdout.split("\n")[0].trim() : "installed";
		out.push({ name: cmd, level: "ok", detail });
	} else {
		out.push({ name: cmd, level: opts.level, detail: "not installed", fix: opts.fix });
	}
}

function which(cmd) {
	const finder = process.platform === "win32" ? "where" : "which";
	const r = spawnSync(finder, [cmd], { stdio: "ignore" });
	return r.status === 0;
}

// ---------- project checks ----------

function checkProject(dir) {
	const out = [];

	pushFile(out, dir, "dev-workflow.md", "crit", "run: bunx @vinhnnn/dev-workflow init");
	pushFile(out, dir, "scripts/release-check.sh", "warn", "run: bunx @vinhnnn/dev-workflow upgrade");

	// .claude/commands/ — all 7 expected
	const missing = REQUIRED_COMMANDS.filter((name) => !existsSync(join(dir, ".claude/commands", `${name}.md`)));
	if (missing.length === 0) {
		out.push({ name: ".claude/commands/", level: "ok", detail: "all 7 present" });
	} else {
		out.push({
			name: ".claude/commands/",
			level: "warn",
			detail: `missing: ${missing.join(", ")}`,
			fix: "run: bunx @vinhnnn/dev-workflow upgrade",
		});
	}

	// .claude/settings.json
	pushSettings(out, dir);

	// skills-lock.json
	pushSkillsLock(out, dir);

	return out;
}

function pushFile(out, dir, relPath, level, fix) {
	if (existsSync(join(dir, relPath))) {
		out.push({ name: relPath, level: "ok", detail: "present" });
	} else {
		out.push({ name: relPath, level, detail: "not present", fix });
	}
}

function pushSettings(out, dir) {
	const path = join(dir, ".claude/settings.json");
	if (!existsSync(path)) {
		out.push({ name: ".claude/settings.json", level: "warn", detail: "not present", fix: "run: bunx @vinhnnn/dev-workflow upgrade" });
		return;
	}
	try {
		const s = JSON.parse(readFileSync(path, "utf8"));
		if (s.enabledPlugins?.["agent-skills@anthropic"]) {
			out.push({ name: ".claude/settings.json", level: "ok", detail: "agent-skills@anthropic enabled" });
		} else {
			out.push({
				name: ".claude/settings.json",
				level: "warn",
				detail: "agent-skills@anthropic plugin not enabled",
				fix: 'add to enabledPlugins: { "agent-skills@anthropic": true }',
			});
		}
	} catch (e) {
		out.push({ name: ".claude/settings.json", level: "crit", detail: `parse error: ${e.message}`, fix: "fix the JSON syntax" });
	}
}

function pushSkillsLock(out, dir) {
	const path = join(dir, "skills-lock.json");
	if (!existsSync(path)) {
		out.push({ name: "skills-lock.json", level: "warn", detail: "not present", fix: "run: bunx @vinhnnn/dev-workflow upgrade" });
		return;
	}
	let lock;
	try {
		lock = JSON.parse(readFileSync(path, "utf8"));
	} catch (e) {
		out.push({ name: "skills-lock.json", level: "crit", detail: `parse error: ${e.message}`, fix: "fix the JSON syntax" });
		return;
	}
	if (lock.version !== 1 || typeof lock.skills !== "object" || lock.skills === null) {
		out.push({ name: "skills-lock.json", level: "warn", detail: "schema mismatch (need version: 1, skills: {})", fix: "fix manually" });
		return;
	}
	const names = Object.keys(lock.skills);
	if (names.length === 0) {
		out.push({ name: "skills-lock.json", level: "ok", detail: "valid (no skills declared yet)" });
		return;
	}
	const missingMaterialized = names.filter((n) => !existsSync(join(dir, ".claude/skills", n)));
	if (missingMaterialized.length === 0) {
		out.push({ name: "skills-lock.json", level: "ok", detail: `${names.length} skill(s) declared and materialized` });
	} else {
		out.push({
			name: "skills-lock.json",
			level: "warn",
			detail: `${missingMaterialized.length} of ${names.length} skill(s) not materialized in .claude/skills/: ${missingMaterialized.join(", ")}`,
			fix: "(v1.3) run: bunx @vinhnnn/dev-workflow sync-skills  |  meanwhile: clone each skill repo manually into .claude/skills/<name>/",
		});
	}
}

// ---------- output ----------

function printReport(runtime, reportEntries, useColor, { multiRepo, totalMatchedByGlob }) {
	console.log("\nRuntime:");
	for (const c of runtime) printCheck(c, useColor);

	if (multiRepo) {
		const skipped = totalMatchedByGlob - reportEntries.length;
		console.log(`\nProjects (${reportEntries.length} dev-workflow project${reportEntries.length === 1 ? "" : "s"} from glob${skipped > 0 ? `, ${skipped} skipped — no dev-workflow.md` : ""}):`);
		if (reportEntries.length === 0) {
			console.log("  (none)");
		}
		for (const { dir, project } of reportEntries) {
			console.log(`\n=== ${dir} ===`);
			for (const c of project) printCheck(c, useColor);
		}
	} else {
		const entry = reportEntries[0];
		if (entry?.project) {
			console.log("\nProject:");
			for (const c of entry.project) printCheck(c, useColor);
		} else {
			console.log("\nProject: (skipped — cwd is not a dev-workflow project)");
		}
	}

	const projectChecks = reportEntries.flatMap((e) => e.project ?? []);
	const criticals = countLevel([runtime, projectChecks], "crit");
	const warnings = countLevel([runtime, projectChecks], "warn");
	const reposNote = multiRepo ? ` across ${reportEntries.length} repo${reportEntries.length === 1 ? "" : "s"}` : "";
	console.log(`\nSummary: ${criticals} critical, ${warnings} warning${warnings === 1 ? "" : "s"}${reposNote}`);
}

function printCheck(c, useColor) {
	const colorMap = { ok: COLORS.green, warn: COLORS.yellow, crit: COLORS.red };
	const symbol = SYMBOLS[c.level];
	const colored = useColor ? `${colorMap[c.level]}${symbol}${COLORS.reset}` : symbol;
	console.log(`  ${colored} ${c.name} — ${c.detail}`);
	if (c.fix) {
		const dimmed = useColor ? `${COLORS.dim}fix: ${c.fix}${COLORS.reset}` : `fix: ${c.fix}`;
		console.log(`      ${dimmed}`);
	}
}

function countLevel(groups, level) {
	let n = 0;
	for (const g of groups) {
		if (!g) continue;
		for (const c of g) if (c.level === level) n++;
	}
	return n;
}
