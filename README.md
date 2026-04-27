# `@vinhnnn/dev-workflow`

Opinionated dev workflow scaffolder for solo and small-team projects. Three-bucket sprint planning, PR-based releases, optional stack presets.

> **Status:** v0.1.0 — scaffolding only. CLI commands are stubs. See [`PLAN.md`](./PLAN.md) for the implementation roadmap.

## Install + run

```bash
# In any project root
bunx @vinhnnn/dev-workflow init                    # core only
bunx @vinhnnn/dev-workflow init --preset nextjs    # core + Next.js preset

# Later, when you ship a workflow improvement
bunx @vinhnnn/dev-workflow upgrade

# Add a preset to a project that's already init'd
bunx @vinhnnn/dev-workflow add-preset nextjs
```

## What it scaffolds

**Core (always installed):**
- `dev-workflow.md` — framework-agnostic process doc
- `scripts/release-check.sh` — release gate (Gates 1-6, opens PR via `gh`, never auto-merges)
- `__project__/` — task board, sprint folders, backlog dirs, ADR dir

**Next.js preset (`--preset nextjs`):**
- `dev-workflow-nextjs.md` — stack-specific conventions (Bun, Biome, Playwright)
- `biome.json` — kebab-case filenames + `.claude/` exclude + Tailwind CSS skip
- `.github/workflows/ci.yml` — lint + build + tests on PRs to dev/main; Playwright on PRs to main only

## Conventions baked in

- **Three-bucket sprint planning** — Committed (gates the release) / Stretch (ignored) / Blocked (ignored). Documented in Phase 2 of `dev-workflow.md`.
- **Release via PR** — `release-check.sh` opens a PR and stops. The merge is a deliberate human click on GitHub after preview review. Documented in Phase 6.
- **`dev` is the trunk; `main` is release-only.** Daily work commits to `dev` directly in solo mode, or via feature-branch PRs to `dev` in team mode (also documented).
- **Atomic commits.** One semantic type per commit (`feat` / `fix` / `docs` / `plan` / `chore`). Release PRs always merge with "Create a merge commit" to preserve atomic history.

## License

MIT
