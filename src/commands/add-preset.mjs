// add-preset: install a stack preset into an already-init'd project.
// Idempotent — re-running with the same preset is a no-op.
//
// TODO (next session, T04): implement.

export default function addPreset(args) {
	console.log("add-preset: not yet implemented");
	console.log("args:", args);
	console.log("\nplanned behavior:");
	console.log("  1. Validate preset name (must exist under templates/<name>/)");
	console.log("  2. Walk templates/<name>/ and copy each file to cwd");
	console.log("  3. Skip files that already exist (warn — user must decide)");
	console.log("  4. Print summary: N created, M skipped");
	return 0;
}
