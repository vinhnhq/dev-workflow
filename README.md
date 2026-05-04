# `@vinhnnn/dev-workflow`

Opinionated dev workflow scaffolder for solo and small-team projects. Three-bucket sprint planning, PR-based releases, optional stack presets, **agent-ready out of the box**. Zero npm dependencies — installs in milliseconds via `bunx` / `npx`.

## Quick start

```bash
cd your-new-project
bunx @vinhnnn/dev-workflow init --preset nextjs
git add . && git commit -m "chore: scaffold dev-workflow"
```

`init` writes the workflow files **and** the agent layer (`.claude/commands/`, `CLAUDE.md`, `skills-lock.json`, `.claude/settings.json`), then immediately runs `doctor` against your machine. You'll see a punch list of any missing tools (Claude Code, `gh`, `bun`, etc.) with copy-paste install commands.

Open `dev-workflow.md` and follow Phase 0 (Provision) → Phase 1 (Spec).

## Commands

```bash
# Scaffold core conventions + agent layer into the current directory
bunx @vinhnnn/dev-workflow init

# Same, plus a stack preset (nextjs is the only one shipped today)
bunx @vinhnnn/dev-workflow init --preset nextjs

# Add a preset to a project that's already init'd
bunx @vinhnnn/dev-workflow add-preset nextjs

# Pull in upstream template improvements (interactive diff per file)
bunx @vinhnnn/dev-workflow upgrade

# Same, but apply everything without prompting
bunx @vinhnnn/dev-workflow upgrade --yes

# Audit environment + project state — prints what's missing
bunx @vinhnnn/dev-workflow doctor

# Audit/upgrade across many repos in one pass (10-project house)
bunx @vinhnnn/dev-workflow doctor --repos '~/github.com/*'
bunx @vinhnnn/dev-workflow upgrade --repos '~/github.com/*' --yes
```

All commands are **idempotent** — re-running never overwrites existing files unless you pass `--force`. `--dry-run` works on `init`, `add-preset`, `upgrade`. `--no-doctor` skips the post-`init` audit.

## What gets scaffolded

### Core (always installed)

| File | Purpose |
|------|---------|
| `dev-workflow.md` | Framework-agnostic process doc — seven phases from provision to release |
| `CLAUDE.md` | Skeleton for project-specific context (Commands / Conventions / Installed Skills / Env Vars / Process) |
| `skills-lock.json` | Empty skill manifest (`{ version: 1, skills: {} }`) — populate as your project pulls in skills |
| `.claude/settings.json` | Enables the `agent-skills@anthropic` plugin (provides the seven workflow skills) |
| `.claude/commands/spec.md` `plan.md` `build.md` `test.md` `review.md` `ship.md` `code-simplify.md` | Repo-local slash commands mapped to dev-workflow phases |
| `scripts/release-check.sh` | Release gate (Gates 1-6); opens a PR via `gh`, never auto-merges. Test command parametrized via `TEST_CMD` |
| `scripts/feature-pr.sh` | Pre-PR gate for feature → dev. Lint/typecheck/test parametrized via `LINT_CMD` / `TYPECHECK_CMD` / `TEST_CMD` |
| `__project__/tasks/README.md` | Three-bucket sprint board template |
| `__project__/tasks/RELEASES.md` | Per-release sprint archive template |
| `__project__/tasks/backlog/` | `ideas.md`, `client-waiting.md` |
| `__project__/docs/decisions/README.md` | ADR index template |
| `__project__/docs/learnings.md` | Continuous append-on-the-fly learning journal (per Phase 5) |

`__project__/` is a literal placeholder directory — rename to your actual project name once scaffolded.

### Next.js preset (`--preset nextjs`)

| File | Purpose |
|------|---------|
| `dev-workflow-nextjs.md` | Stack conventions: Bun, Biome, Playwright |
| `biome.json` | Kebab-case filenames, `.claude/` exclude, Tailwind skip |
| `.github/workflows/ci.yml` | Lint + build + tests on PRs to dev/main; Playwright on PRs to main only |

## Fresh-machine setup

`init` is friendly to a freshly imaged laptop or CI runner. Right after copy, it runs `doctor` and reports anything missing:

```
$ bunx @vinhnnn/dev-workflow init
[core]
  created: dev-workflow.md
  ...
created 19, skipped 0

--- environment check ---

Runtime:
  ✓ node — v20.11.0
  ✓ git — 2.45.0
  ✗ gh — not installed
      fix: brew install gh  (macOS)  |  https://cli.github.com  (other)
  ⚠ claude — not installed
      fix: https://docs.claude.com/claude-code/install — Claude Code harness
  ...

Project:
  ✓ dev-workflow.md — present
  ✓ .claude/commands/ — all 7 present
  ...

Summary: 1 critical, 1 warning
```

Install whatever's flagged, re-run `bunx ... doctor`, and you're ready to start Phase 1.

`doctor` itself runs without Claude Code installed — it's the thing checking for it. Suppress the post-init audit with `--no-doctor`.

### What `doctor --fix` does

- Runs `upgrade --yes` to restore drifted template files
- Does **not** install runtime tools (no `brew`, no `sudo`) — prints copy-paste commands instead. Hard boundary: scaffold ≠ package manager.

## Multi-repo workflow

If you maintain many projects on the same conventions, audit and upgrade them all at once:

```bash
# Audit every dev-workflow project under ~/github.com/
bunx @vinhnnn/dev-workflow doctor --repos '~/github.com/*'

# Roll template updates across all of them
bunx @vinhnnn/dev-workflow upgrade --repos '~/github.com/*' --yes
```

`--repos` silently skips dirs that don't contain `dev-workflow.md` — safe against globs that match unrelated projects. `upgrade --repos` requires `--yes` or `--dry-run` (interactive per-file prompts don't scale across N repos).

## Stack overrides for the scripts

Both shell scripts default to a Bun toolchain but accept env-var overrides — no need to fork the script for a different stack:

| Variable | Default | Used by |
|----------|---------|---------|
| `TEST_CMD` | `bun run test` | `release-check.sh` Gate 2, `feature-pr.sh` Gate 6 |
| `LINT_CMD` | `bun lint` | `feature-pr.sh` Gate 4 |
| `TYPECHECK_CMD` | `bunx tsc --noEmit` | `feature-pr.sh` Gate 5 |
| `FORCE_PASS=1` | — | bypasses all gates (escape hatch) |
| `SKIP_TESTS=1` | — | skips Gate 2 / 6 only |

Examples:

```bash
TEST_CMD="pnpm test" bash scripts/release-check.sh
LINT_CMD="biome check ." bash scripts/feature-pr.sh
TEST_CMD="uv run pytest" bash scripts/release-check.sh
```

## Conventions baked in

- **Seven phases.** `PROVISION → SPEC → PLAN → IMPLEMENT → TEST → REVIEW → RELEASE`. Each has hard entry/exit conditions. See `dev-workflow.md`.
- **Three-bucket sprints** — Committed (gates the release) / Stretch (ignored) / Blocked (ignored). Defined in Phase 2.
- **Release via PR** — `release-check.sh` opens a PR and stops. The merge is a deliberate human click on GitHub. Defined in Phase 6.
- **`dev` is the trunk; `main` is release-only.** Daily commits land on `dev`; `main` only moves when a release PR merges.
- **Atomic commits.** One semantic type per commit (`feat` / `fix` / `docs` / `plan` / `chore`). Release PRs use "Create a merge commit" to preserve atomic history.
- **Agent layer is canonical.** Every project gets the same `.claude/commands/`, `CLAUDE.md` skeleton, and `skills-lock.json` shape — no drift across the fleet.

## What this CLI does NOT do

- **Never touches existing files.** `init` and `add-preset` skip existing files unless `--force`. Your work is safe.
- **Never modifies your `package.json`, lockfile, or git config.** It only writes the listed template files.
- **Never installs npm packages or runtime tools.** `doctor` reports what's missing with install commands; you run them. This is intentional — the scaffold is not a package manager.
- **Never auto-merges.** Both `release-check.sh` and `feature-pr.sh` open PRs and stop. The merge is always a human click on GitHub.
- **`upgrade` only touches files you already have.** Run `init --force` to recreate files you deleted on purpose.

## Requirements

- Node.js ≥ 20 (the CLI itself; templates have their own requirements per preset)
- For full functionality after `init`: `git`, `gh`, your stack's package manager (`bun` by default), and Claude Code if you want the slash commands. `doctor` will tell you exactly what's missing.

## License

MIT
