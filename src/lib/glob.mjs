// Single-level glob resolver. Used by `doctor --repos` and `upgrade --repos`.
//
// Supports `~` expansion (-> homedir) and `*` (any chars) in the LAST path
// segment only. Designed to be tiny and zero-dep — fits the use case
// (`~/github.com/*` etc.) without dragging in a globbing library.

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function resolveRepos(pattern) {
	const expanded = pattern.startsWith("~") ? join(homedir(), pattern.slice(1)) : pattern;
	const lastSlash = expanded.lastIndexOf("/");
	if (lastSlash < 0) return [];
	const parent = expanded.slice(0, lastSlash) || "/";
	const segment = expanded.slice(lastSlash + 1);
	if (!existsSync(parent)) return [];
	const re = new RegExp(`^${segment.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
	return readdirSync(parent, { withFileTypes: true })
		.filter((e) => e.isDirectory() && re.test(e.name))
		.map((e) => join(parent, e.name))
		.sort();
}
