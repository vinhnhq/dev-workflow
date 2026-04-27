# `@vinhnnn/dev-workflow`

Opinionated dev workflow scaffolder for solo and small-team projects. Three-bucket sprint planning, PR-based releases, optional stack presets. Zero npm dependencies — installs in milliseconds via `bunx` / `npx`.

## Quick start

```bash
cd your-new-project
bunx @vinhnnn/dev-workflow init --preset nextjs
git add . && git commit -m "chore: scaffold dev-workflow"
```

That's it. Open `dev-workflow.md` and follow Phase 1 (Define).

## Commands

```bash
# Scaffold core conventions into the current directory
bunx @vinhnnn/dev-workflow init

# Same, plus a stack preset
bunx @vinhnnn/dev-workflow init --preset nextjs

# Add a preset to a project that's already init'd
bunx @vinhnnn/dev-workflow add-preset nextjs

# Pull in upstream template improvements (interactive diff per file)
bunx @vinhnnn/dev-workflow upgrade

# Same, but apply everything without prompting
bunx @vinhnnn/dev-workflow upgrade --yes
```

All commands are **idempotent** — re-running never overwrites existing files unless you pass `--force`. `--dry-run` works on every command and shows what would change.

## What gets scaffolded

### Core (always installed)

| File | Purpose |
|------|---------|
| `dev-workflow.md` | Framework-agnostic process doc — six phases from spec to release |
| `scripts/release-check.sh` | Release gate (Gates 1-6); opens a PR via `gh`, never auto-merges |
| `__project__/tasks/README.md` | Three-bucket sprint board template |
| `__project__/tasks/RELEASES.md` | Per-release sprint archive template |
| `__project__/tasks/backlog/` | `ideas.md`, `client-waiting.md` |
| `__project__/docs/decisions/README.md` | ADR index template |

`__project__/` is a literal placeholder directory — rename to your actual project name once scaffolded.

### Next.js preset (`--preset nextjs`)

| File | Purpose |
|------|---------|
| `dev-workflow-nextjs.md` | Stack conventions: Bun, Biome, Playwright |
| `biome.json` | Kebab-case filenames, `.claude/` exclude, Tailwind skip |
| `.github/workflows/ci.yml` | Lint + build + tests on PRs to dev/main; Playwright on PRs to main only |

## Conventions baked in

- **Three-bucket sprints** — Committed (gates the release) / Stretch (ignored) / Blocked (ignored). Defined in Phase 2.
- **Release via PR** — `release-check.sh` opens a PR and stops. The merge is a deliberate human click on GitHub. Defined in Phase 6.
- **`dev` is the trunk; `main` is release-only.** Daily commits land on `dev`; `main` only moves when a release PR merges.
- **Atomic commits.** One semantic type per commit (`feat` / `fix` / `docs` / `plan` / `chore`). Release PRs use "Create a merge commit" to preserve atomic history.

## What this CLI does NOT do

- **Never touches existing files.** `init` and `add-preset` skip existing files unless `--force`. Your work is safe.
- **Never modifies your `package.json`, lockfile, or git config.** It only writes the listed template files.
- **Never installs npm packages.** Templates assume you'll install whatever the preset's docs call for (Biome, Playwright, etc.) yourself.
- **`upgrade` only touches files you already have.** It will not re-create files you deleted on purpose.

## Requirements

- Node.js ≥ 20 (the CLI itself; templates have their own requirements per preset)

## License

MIT
