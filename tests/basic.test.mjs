// Basic acceptance tests for the CLI.
// Uses node:test (built-in, no test framework dep).
//
// TODO (next session, T05): implement tests for init + upgrade golden paths.

import { test } from "node:test";

test.todo("init copies core templates into target dir", () => {
	// 1. mkdtemp tmp dir
	// 2. spawn `node bin.mjs init` with cwd = tmp
	// 3. assert dev-workflow.md exists, scripts/release-check.sh exists,
	//    __project__/tasks/README.md exists
});

test.todo("init --preset nextjs also copies preset templates", () => {
	// Same as above, plus: dev-workflow-nextjs.md, biome.json,
	// .github/workflows/ci.yml exist
});

test.todo("init does not overwrite existing files", () => {
	// 1. mkdtemp tmp dir
	// 2. write a dev-workflow.md with custom content
	// 3. spawn init
	// 4. assert dev-workflow.md content unchanged
});

test.todo("upgrade detects drift and prompts", () => {
	// 1. init a tmp dir
	// 2. modify the local dev-workflow.md
	// 3. spawn `upgrade --dry-run`
	// 4. assert exit code 0 and stdout shows the local diff
});

test.todo("--version prints package version", () => {});
