// Compute and render a line-by-line diff between two files.
// Used by the upgrade command. No npm deps — keeps `bunx` install fast.

import { readFile } from "node:fs/promises";

export async function diffFiles(localPath, templatePath) {
	const [local, template] = await Promise.all([
		readFile(localPath, "utf8"),
		readFile(templatePath, "utf8"),
	]);
	if (local === template) return { identical: true, ops: [] };
	const ops = computeDiff(local.split("\n"), template.split("\n"));
	return { identical: false, ops };
}

// Longest-common-subsequence diff. O(m*n) — fine for template-sized files.
function computeDiff(a, b) {
	const m = a.length;
	const n = b.length;
	const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
	for (let i = 0; i < m; i++) {
		for (let j = 0; j < n; j++) {
			if (a[i] === b[j]) dp[i + 1][j + 1] = dp[i][j] + 1;
			else dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}
	const ops = [];
	let i = m;
	let j = n;
	while (i > 0 && j > 0) {
		if (a[i - 1] === b[j - 1]) {
			ops.push({ type: "context", line: a[i - 1] });
			i--;
			j--;
		} else if (dp[i - 1][j] >= dp[i][j - 1]) {
			ops.push({ type: "delete", line: a[i - 1] });
			i--;
		} else {
			ops.push({ type: "add", line: b[j - 1] });
			j--;
		}
	}
	while (i > 0) ops.push({ type: "delete", line: a[--i] });
	while (j > 0) ops.push({ type: "add", line: b[--j] });
	return ops.reverse();
}

export function renderDiff(ops, useColor = true, contextLines = 3) {
	const RED = useColor ? "\x1b[31m" : "";
	const GREEN = useColor ? "\x1b[32m" : "";
	const DIM = useColor ? "\x1b[2m" : "";
	const RESET = useColor ? "\x1b[0m" : "";

	// Collapse long runs of unchanged context — show only `contextLines` around any change.
	const keep = new Array(ops.length).fill(false);
	for (let i = 0; i < ops.length; i++) {
		if (ops[i].type !== "context") {
			for (let k = Math.max(0, i - contextLines); k <= Math.min(ops.length - 1, i + contextLines); k++) {
				keep[k] = true;
			}
		}
	}

	const out = [];
	let lastKept = -1;
	for (let i = 0; i < ops.length; i++) {
		if (!keep[i]) continue;
		if (lastKept !== -1 && i - lastKept > 1) out.push(`${DIM}  ⋯${RESET}`);
		const op = ops[i];
		if (op.type === "delete") out.push(`${RED}- ${op.line}${RESET}`);
		else if (op.type === "add") out.push(`${GREEN}+ ${op.line}${RESET}`);
		else out.push(`${DIM}  ${op.line}${RESET}`);
		lastKept = i;
	}
	return out.join("\n");
}
