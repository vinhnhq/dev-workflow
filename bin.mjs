#!/usr/bin/env node
// CLI entry — argv parsing + subcommand dispatch.
// Implementation lives under src/commands/.

import process from "node:process";

const COMMANDS = {
	init: () => import("./src/commands/init.mjs"),
	upgrade: () => import("./src/commands/upgrade.mjs"),
	"add-preset": () => import("./src/commands/add-preset.mjs"),
	doctor: () => import("./src/commands/doctor.mjs"),
};

const HELP = `dev-workflow — scaffold and maintain the dev-workflow convention in any project

Usage:
  dev-workflow init [--preset <name>]    Scaffold workflow files into the current directory
  dev-workflow upgrade                   Diff against latest templates and apply updates
  dev-workflow add-preset <name>         Add a stack preset to an init'd project
  dev-workflow doctor [--fix]            Audit environment + project; print missing pieces
  dev-workflow --version                 Print package version
  dev-workflow --help                    Print this help

Flags:
  --preset <name>     One of: nextjs (more presets to come)
  --dry-run           Show what would change without writing files
  --yes               Apply all upgrades without prompting (upgrade only)
  --no-doctor         Skip the post-init audit (init only)
  --fix               Apply safe fixes for project drift (doctor only)

Examples:
  bunx @vinhnnn/dev-workflow init --preset nextjs
  bunx @vinhnnn/dev-workflow upgrade
  bunx @vinhnnn/dev-workflow doctor
  bunx @vinhnnn/dev-workflow add-preset nextjs
`;

async function main(argv) {
	const args = argv.slice(2);

	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		console.log(HELP);
		return 0;
	}

	if (args[0] === "--version" || args[0] === "-v") {
		const { default: pkg } = await import("./package.json", {
			with: { type: "json" },
		});
		console.log(pkg.version);
		return 0;
	}

	const cmd = args[0];
	if (!(cmd in COMMANDS)) {
		console.error(`Unknown command: ${cmd}`);
		console.error("Run `dev-workflow --help` for usage.");
		return 1;
	}

	const mod = await COMMANDS[cmd]();
	return mod.default(args.slice(1));
}

main(process.argv).then(
	(code) => process.exit(code ?? 0),
	(err) => {
		console.error(err);
		process.exit(1);
	},
);
