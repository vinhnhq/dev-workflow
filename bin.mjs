#!/usr/bin/env node
// CLI entry. Drops dev-workflow.md (the conventions seed) plus a
// dev-workflow-pipeline/ staging folder (the battle-tested agent pipeline).
// Claude reads the seed, walks the user through project setup, adapts the
// pipeline files into place, then deletes the staging folder.

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(PKG_ROOT, "templates", "dev-workflow.md");
const PIPELINE_SOURCE = join(PKG_ROOT, "templates", "pipeline");
const TARGET_NAME = "dev-workflow.md";
const PIPELINE_TARGET_NAME = "dev-workflow-pipeline";

const HELP = `dev-workflow — drop the conventions seed into your project

Usage:
  dev-workflow                 Copy dev-workflow.md + dev-workflow-pipeline/ to cwd
  dev-workflow --no-pipeline   Seed only; skip the pipeline staging folder
  dev-workflow --force         Overwrite if either target already exists
  dev-workflow --version       Print package version
  dev-workflow --help          Print this help

After install, open Claude Code in this directory and ask it to set up the
project. Claude reads dev-workflow.md, asks the project-specific questions,
scaffolds from there, and materializes dev-workflow-pipeline/ into .claude/
and .github/ — then removes the staging folder. No rigid structure to fight.
`;

const FLAGS = ["--force", "--no-pipeline", "--help", "-h", "--version", "-v"];

async function main(argv) {
	const args = argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		console.log(HELP);
		return 0;
	}

	if (args.includes("--version") || args.includes("-v")) {
		const { default: pkg } = await import("./package.json", {
			with: { type: "json" },
		});
		console.log(pkg.version);
		return 0;
	}

	const unknown = args.find((a) => !FLAGS.includes(a));
	if (unknown) {
		console.error(`Unknown argument: ${unknown}`);
		console.error("Run `dev-workflow --help` for usage.");
		return 1;
	}

	const force = args.includes("--force");
	const withPipeline = !args.includes("--no-pipeline");
	const target = resolve(process.cwd(), TARGET_NAME);
	const pipelineTarget = resolve(process.cwd(), PIPELINE_TARGET_NAME);

	if (existsSync(target) && !force) {
		console.error(`${TARGET_NAME} already exists. Pass --force to overwrite.`);
		return 1;
	}
	if (withPipeline && existsSync(pipelineTarget) && !force) {
		console.error(`${PIPELINE_TARGET_NAME}/ already exists. Pass --force to overwrite.`);
		return 1;
	}

	copyFileSync(SOURCE, target);
	console.log(`Wrote ${TARGET_NAME}`);

	if (withPipeline) {
		mkdirSync(pipelineTarget, { recursive: true });
		const files = readdirSync(PIPELINE_SOURCE);
		for (const file of files) {
			copyFileSync(join(PIPELINE_SOURCE, file), join(pipelineTarget, file));
		}
		console.log(`Wrote ${PIPELINE_TARGET_NAME}/ (${files.length} files)`);
	}

	console.log("Open Claude Code here and ask it to set up the project.");
	return 0;
}

main(process.argv).then(
	(code) => process.exit(code ?? 0),
	(err) => {
		console.error(err);
		process.exit(1);
	},
);
