// init: copy core (+ optional preset) templates into cwd.
// Skips files that already exist unless --force.
//
// TODO (next session, T02): implement.

export default function init(args) {
	console.log("init: not yet implemented");
	console.log("args:", args);
	console.log("\nplanned behavior:");
	console.log("  1. Resolve --preset flag (default: none, just core)");
	console.log("  2. Walk templates/core/ and copy each file to cwd");
	console.log("  3. If preset given, also walk templates/<preset>/");
	console.log("  4. Skip files that already exist unless --force");
	console.log("  5. Print summary: N created, M skipped");
	return 0;
}
