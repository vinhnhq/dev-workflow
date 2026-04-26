// Recursive copy from a template dir into a target dir.
// Used by both init and add-preset commands.

import { chmod, copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";

export async function copyTemplates(sourceDir, targetDir, options = {}) {
	const { force = false, dryRun = false } = options;
	const created = [];
	const skipped = [];

	await walk(sourceDir, sourceDir, targetDir, { force, dryRun, created, skipped });

	return { created, skipped };
}

async function walk(rootSource, currentSource, targetDir, ctx) {
	const entries = await readdir(currentSource, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = join(currentSource, entry.name);

		if (entry.isDirectory()) {
			await walk(rootSource, srcPath, targetDir, ctx);
			continue;
		}

		if (!entry.isFile()) continue;

		const relPath = relative(rootSource, srcPath);
		const targetPath = join(targetDir, relPath);

		if (existsSync(targetPath) && !ctx.force) {
			ctx.skipped.push(relPath);
			continue;
		}

		if (!ctx.dryRun) {
			await mkdir(dirname(targetPath), { recursive: true });
			await copyFile(srcPath, targetPath);
			const srcStat = await stat(srcPath);
			await chmod(targetPath, srcStat.mode);
		}

		ctx.created.push(relPath);
	}
}
