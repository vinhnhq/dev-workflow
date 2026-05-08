#!/usr/bin/env node
// CLI entry. Drops a single dev-workflow.md into the current directory.
// Claude reads it and walks the user through project setup conversationally.

import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(PKG_ROOT, "templates", "dev-workflow.md");
const TARGET_NAME = "dev-workflow.md";

const HELP = `dev-workflow — drop a single dev-workflow.md into your project

Usage:
  dev-workflow              Copy dev-workflow.md to the current directory
  dev-workflow --force      Overwrite if dev-workflow.md already exists
  dev-workflow --version    Print package version
  dev-workflow --help       Print this help

After install, open Claude Code in this directory and ask it to set up the
project. Claude reads dev-workflow.md, asks the project-specific questions,
and scaffolds from there. No multi-file template, no folder structure to fight.
`;

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

	const force = args.includes("--force");
	const unknown = args.find((a) => !["--force", "--help", "-h"].includes(a));
	if (unknown) {
		console.error(`Unknown argument: ${unknown}`);
		console.error("Run `dev-workflow --help` for usage.");
		return 1;
	}

	const target = resolve(process.cwd(), TARGET_NAME);

	if (existsSync(target) && !force) {
		console.error(`${TARGET_NAME} already exists. Pass --force to overwrite.`);
		return 1;
	}

	copyFileSync(SOURCE, target);
	console.log(`Wrote ${TARGET_NAME}`);
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
