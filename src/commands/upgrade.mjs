// upgrade: diff cwd files against templates/, prompt to apply each diff.
// Skips files that don't exist locally (those are init's job).
//
// TODO (next session, T03): implement. Hardest piece — needs careful diff UX.

export default function upgrade(args) {
	console.log("upgrade: not yet implemented");
	console.log("args:", args);
	console.log("\nplanned behavior:");
	console.log("  1. Detect installed presets (look for marker files)");
	console.log("  2. For each template file that exists locally:");
	console.log("     - Compute diff between local + template");
	console.log("     - If identical, skip silently");
	console.log("     - If different, show colorized diff + prompt y/n/skip-all");
	console.log("  3. --yes flag applies all without prompting");
	console.log("  4. --dry-run shows diffs without writing");
	console.log("  5. Print summary: N updated, M skipped, K unchanged");
	return 0;
}
