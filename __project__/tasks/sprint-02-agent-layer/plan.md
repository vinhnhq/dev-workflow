# Sprint 02 — Agent Layer + Doctor (v1.1.0)

**Status:** in progress (T201 done, branch `sprint-02-agent-layer` open)
**Target release:** `@vinhnnn/dev-workflow@1.1.0`
**Branch model:** atomic commits on feature branch `sprint-02-agent-layer` → manual `gh pr create --base dev` (since `feature-pr.sh` is itself a sprint deliverable — chicken-and-egg) → squash-merge to `dev` → `release-check.sh` opens release PR `dev` → `main` → tag fires npm publish.

---

## Context

`v1.0.0` ships *workflow conventions* (`dev-workflow.md`, sprint scaffold, `release-check.sh`). It does **not** ship the *agent layer* — every consumer (aletheia, tkp, human, puzzle) has rebuilt `.claude/commands/`, `skills-lock.json`, `CLAUDE.md` skeleton, and the `agent-skills` plugin wiring by hand. Net effect: drift across projects, onboarding tax, no single source of truth.

A second gap surfaced in spec review: the scaffold today happily writes files onto a machine that has no Node, no git, no `gh`, no Claude Code, and gives the user no signal. On a fresh environment the scaffold output is dead weight until the surrounding tools are installed. The user's words: *"this scaffolding will be used on any computer ... ready for checking, trying to install, and reporting exactly what they are missing"*.

A third concern surfaced once the multi-project framing was named (the user runs ~10 projects/year and optimizes for cross-project consistency under context-switching): per-repo `doctor` and `upgrade` invocations don't scale. Need a `--repos <glob>` flag so a single command can audit or upgrade every dev-workflow project on disk in one pass.

This sprint closes all three gaps:

- Ship the agent layer in `templates/core/` so every `init` is agent-ready.
- Add a `doctor` subcommand that audits runtime + project state and prints a copy-paste punch list of what's missing.
- Parametrize `release-check.sh` (and ship a sibling `feature-pr.sh`) so they no longer hardcode `bun run test`.
- Add `--repos <glob>` to `doctor` and `upgrade` for cross-project bulk operations.

## What we're building

A v1.1.0 release of `@vinhnnn/dev-workflow` with four additions to the public surface:

1. **Agent-layer files** materialized by `init` into the consumer repo.
2. **`doctor` subcommand** for environment + project checks.
3. **Parametrized `release-check.sh` + new `feature-pr.sh`** in `templates/core/scripts/`.
4. **`--repos <glob>` flag** on `doctor` and `upgrade` for cross-project bulk operations.

## Decisions baked in

| Decision | Value | Rationale |
|---|---|---|
| Default package manager (presets that touch PM commands) | Bun | Matches puzzle's stated goal (test RSC in a non-Next env, with Bun) and matches aletheia/tkp/human |
| `release-check.sh` Gate 2 command | Env var: `TEST_CMD=${TEST_CMD:-bun run test}` | Lets non-Bun consumers swap without forking the script |
| `feature-pr.sh` location | `templates/core/scripts/` (not preset) | Same env-var approach (`LINT_CMD`, `TYPECHECK_CMD`, `TEST_CMD`) — keeps it stack-agnostic |
| `doctor` enforcement | Advisory-only in v1.1 | Promote to release-gate (Gate 0) only if drift is observed in real use |
| `doctor --fix` scope | Runs `upgrade` only (and `sync-skills` post-v1.3); never installs runtime tools | Hard boundary: scaffold is not a package manager. Prints copy-paste install commands instead. |
| `init` auto-runs `doctor` | Yes, unless `--no-doctor` | Removes the "I have files but now what?" moment on Day 1 |
| `.claude/commands/*.md` content | Generic, just invoke `agent-skills:<skill>` skills | Project-specific tweaks (like aletheia's i18n + `bun lint`) happen post-init |
| `skills-lock.json` shipped state | `{ "version": 1, "skills": {} }` (empty) | v1.1 ships the schema; v1.2 layers preset-specific skills; v1.3 ships the installer |
| `CLAUDE.md` shipped state | Skeleton with empty tables (Commands / Conventions / Installed Skills / Env Vars / Process pointer) | Each project fills its own; scaffold provides the shape |
| Lockfile / npm deps | Zero new deps | Same hill we died on for v1.0 — `bunx` install speed is the value prop |
| Branch model for this sprint | Feature branch `sprint-02-agent-layer` → manual `gh pr create --base dev` → squash merge | `feature-pr.sh` is itself a deliverable in this sprint, so it can't gate this sprint's PR. Future sprints use `feature-pr.sh` once shipped. |
| `--repos <glob>` semantics | Glob matches dirs containing `dev-workflow.md`; non-matches are silently skipped | Avoids accidentally running against unrelated repos under the same parent dir |
| `--repos` aggregation | Per-repo output blocks separated by `=== <relpath> ===`; trailing summary `N repos audited, M with issues` | Readable in a terminal; greppable for CI |

If any of these become wrong during build, update this plan first, then proceed.

## Repo state right now

| Surface | Status |
|---|---|
| `dev` branch | Synced with origin (T201 ✓ done — 23fffb0 pushed 2026-05-04). |
| `sprint-02-agent-layer` branch | Created from `dev`. Sprint commits land here. |
| `main` branch | matches v1.0.0 |
| npm | `@vinhnnn/dev-workflow@1.0.0` published, fully installable |
| Tests | 9 passing (`init` × 3, `upgrade` × 2, `add-preset` × 2, `--version`, `--help`) |
| Templates | `templates/core/`, `templates/nextjs/` — both shipped, both consumed by aletheia/tkp/human |
| `__project__/` in this repo | did not exist before this sprint — Sprint 02 bootstraps it |

## Acceptance criteria for v1.1.0

A user on a fresh machine (no Node, no git, no Claude Code) can:

1. Install Node ≥ 20.
2. Run `bunx @vinhnnn/dev-workflow@1.1.0 init` in an empty dir → 12+ files written, including the new agent-layer files.
3. Read the auto-run `doctor` output → see exactly which runtime tools and project files are missing or misconfigured, with copy-paste install commands.
4. Install the runtime tools `doctor` flagged.
5. Re-run `bunx ... doctor` → all green.
6. Open the project in Claude Code → slash commands `/spec` `/plan` `/build` `/test` `/review` `/ship` `/code-simplify` work via the `agent-skills` plugin.

A user on an already-init'd project can:

1. Run `bunx @vinhnnn/dev-workflow@1.1.0 upgrade` → diffs of every drifted file (including new agent-layer files) presented for ack.
2. Run `bunx ... doctor` standalone → same audit output, same exit codes.

A maintainer can:

1. Run `bun run test` (or `node --test tests/*.test.mjs`) → all tests green, including new ones for `doctor` and agent-layer files.
2. Run `scripts/release-check.sh` → release PR opened on GitHub.
3. Tag `v1.1.0` → `publish.yml` fires → `npm publish` succeeds with provenance.

## Tasks (in order)

### T201 — Push unpushed `dev` commit (~2 min) ✓ DONE 2026-05-04

The local `dev` branch was 1 commit ahead of `origin/dev` (the learnings.md + Phase 5 retro update from 2026-04-27). Pushed cleanly:

```
9918d9d..23fffb0  dev -> dev
```

`sprint-02-agent-layer` branch was then cut from the synced `dev` for the rest of this sprint's work.

### T202 — Phase 0 — Provision in core dev-workflow.md (~15 min)

Edit `templates/core/dev-workflow.md`:
- Update "Pipeline at a Glance" diagram: `PROVISION → SPEC → PLAN → IMPLEMENT → TEST → REVIEW → RELEASE`
- Insert new "Phase 0 — Provision" section before Phase 1
- Section content: entry/exit conditions, what to produce (`bunx ... doctor` output as proof), why this phase exists (drift + onboarding tax + fresh-machine constraint), four rules (every PR adding a tool updates `skills-lock.json`; removing a feature removes its skills; identity-not-version; STOP-and-surface-don't-auto-add)

**Acceptance:**
- Phase 0 reads coherently and references `bunx @vinhnnn/dev-workflow doctor` as the verification step.
- Pipeline diagram updated everywhere it appears in the doc (search for `SPEC →`).
- No content from Phase 1+ is altered.

### T203 — Agent-layer command files (~30 min)

Create `templates/core/.claude/commands/`:
- `spec.md` — invokes `agent-skills:spec-driven-development`
- `plan.md` — invokes `agent-skills:planning-and-task-breakdown`
- `build.md` — invokes `agent-skills:incremental-implementation` + `agent-skills:test-driven-development`
- `test.md` — invokes `agent-skills:test-driven-development`
- `review.md` — invokes `agent-skills:code-review-and-quality`
- `ship.md` — invokes `agent-skills:shipping-and-launch`. Generic version (no `bun lint` etc.) — pointer that consumers customize.
- `code-simplify.md` — invokes `agent-skills:code-simplification`

Each file: YAML frontmatter (`description: <one-line>`) + 5–15 line invocation body. Modeled on aletheia's pattern but stripped of project specifics.

**Acceptance:** all 7 files exist, each ≤ 25 lines, no project-specific terms (no `bun`, no `i18n`, no `pnpm`).

### T204 — `.claude/settings.json` minimal (~5 min)

Create `templates/core/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "agent-skills@anthropic": true
  }
}
```

**Acceptance:** valid JSON, enables only `agent-skills` (other plugins are project decisions).

### T205 — `CLAUDE.md` skeleton (~15 min)

Create `templates/core/CLAUDE.md` with sections:
- Project name + one-line description (placeholder)
- Commands (empty table — `bun dev`, `bun build`, `bun test`)
- Non-Obvious Conventions (placeholder list)
- Installed Skills (empty table, columns: Skill / Purpose)
- Environment Variables (empty table, columns: Variable / Required / Description)
- Process — pointer to `dev-workflow.md` + `dev-workflow-<stack>.md`

**Acceptance:** structure mirrors aletheia's CLAUDE.md sections; all bodies are placeholders, no real content.

### T206 — Empty `skills-lock.json` (~2 min)

Create `templates/core/skills-lock.json`:

```json
{
  "version": 1,
  "skills": {}
}
```

**Acceptance:** parseable JSON with the canonical shape — ready for v1.3's `sync-skills` to consume.

### T207 — Parametrize `release-check.sh` (~15 min)

Edit `templates/core/scripts/release-check.sh`:
- Replace `bun run test` (Gate 2) with `${TEST_CMD:-bun run test}` then `eval "$TEST_CMD"` (or equivalent safe expansion)
- Add a comment explaining the env-var override: `TEST_CMD="pnpm test" bash scripts/release-check.sh`

**Acceptance:**
- `bash scripts/release-check.sh` with no env vars behaves identically to v1.0.0.
- `TEST_CMD="echo fake-test" bash scripts/release-check.sh` runs the echo instead.
- Existing 9 tests still pass (none of them invoke this script — pure manual smoke).

### T208 — `feature-pr.sh` in core (~30 min)

Create `templates/core/scripts/feature-pr.sh` modeled on aletheia's. Pre-PR gates:
- Lint: `${LINT_CMD:-bun run lint}`
- Typecheck: `${TYPECHECK_CMD:-bunx tsc --noEmit}`
- Tests: `${TEST_CMD:-bun run test}`
- Sync check (current branch vs `origin/dev`)
- Clean tree check
- Auto-detect sprint folder from branch name (`sprint-NN-*`)
- Open PR via `gh pr create --base dev`

**Acceptance:**
- Script is `+x` (chmod 0755).
- All command lines respect env-var overrides.
- Includes `FORCE_PASS=1` and per-gate skip env vars matching `release-check.sh` style.
- README documents both scripts side by side.

### T209 — `doctor` subcommand (~90 min, the biggest piece)

Create `src/commands/doctor.mjs`. Behavior:

**Runtime checks (in order):**
- Node ≥ 20 — `process.versions.node`
- git — `git --version` exit 0
- bun — `bun --version` (warn-only if missing — preset may not need it)
- gh — `gh --version` (warn-only if `release-check.sh` not present in cwd)
- claude (Claude Code CLI) — `claude --version` or `which claude`

**Project checks (skip silently if cwd doesn't look like a dev-workflow project — i.e. `dev-workflow.md` absent):**
- `dev-workflow.md` present
- `scripts/release-check.sh` present and executable
- `.claude/commands/` contains all 7 expected files
- `.claude/settings.json` parseable + enables `agent-skills@anthropic`
- `skills-lock.json` parseable + has `version: 1` + `skills` object
- For each skill in `skills-lock.json`, `.claude/skills/<name>/` exists (warn → suggest `sync-skills` post-v1.3, manual clone meanwhile)

**Output:**
- Grouped under "Runtime:" and "Project:" headers
- Symbols: `✓` ok, `⚠` warning (project drift), `✗` critical (runtime missing)
- Each `⚠`/`✗` followed by an indented `fix:` or `install:` line with copy-paste command
- Trailing summary: `N critical, M warnings`

**Exit codes:**
- 0 if all green or warnings only
- 1 if any critical (runtime missing)

**Flags:**
- `--fix` — runs `upgrade` for project drift (post-v1.3, also runs `sync-skills`)
- `--json` — machine-readable output (defer to v1.2 if time-tight)

**Acceptance:**
- Works without Claude Code installed (it's the thing checking for it).
- Zero new npm deps.
- Tests pass (T212).

### T210 — Wire `doctor` into dispatcher (~5 min)

Edit `bin.mjs`:
- Add `doctor: () => import("./src/commands/doctor.mjs")` to `COMMANDS`
- Update `HELP` text to include `dev-workflow doctor` line + `--fix` flag

**Acceptance:**
- `node bin.mjs doctor` runs (returns audit output).
- `node bin.mjs --help` shows `doctor` in the usage list.

### T211 — Auto-run `doctor` after `init` (~10 min)

Edit `src/commands/init.mjs`:
- After successful copy, unless `--no-doctor` is in `args`, dynamic-import `doctor.mjs` and call its default export with `[]`.
- Print a short separator before the doctor block: `\n--- environment check ---\n`
- Init's exit code stays unaffected by doctor's exit (init succeeded; doctor is informational)

**Acceptance:**
- `node bin.mjs init` in tmp dir → copy logs + doctor logs.
- `node bin.mjs init --no-doctor` → only copy logs, no doctor section.

### T212 — Tests for `doctor` (~45 min)

Add to `tests/basic.test.mjs` (or new `tests/doctor.test.mjs` if it grows):
- `doctor` exits 0 on a fresh init'd dir when all runtime tools present
- `doctor` exits 1 when a critical runtime is missing — mock by spawning with `PATH=/nonexistent`
- `doctor` reports drift when `.claude/commands/` is incomplete (delete one file post-init, expect warning)
- `doctor` reports drift when `skills-lock.json` references a skill not present in `.claude/skills/`
- `doctor --fix` runs `upgrade` (verify it restores a deleted file)
- `init --no-doctor` skips the doctor block

**Acceptance:** all new tests pass; total suite count increases from 9 to ~15.

### T213 — Tests for agent-layer files (~20 min)

Add to `tests/basic.test.mjs`:
- `init` writes `.claude/commands/spec.md` (and the other 6)
- `init` writes `.claude/settings.json` with `agent-skills@anthropic: true`
- `init` writes `CLAUDE.md` and `skills-lock.json`
- Re-running `init` skips them (idempotency)
- `init --force` overwrites them
- `upgrade` shows diff when `.claude/commands/spec.md` drifts

**Acceptance:** all new tests pass.

### T214 — Update `README.md` (~20 min)

- Add `doctor` to the Commands section
- Add a "What gets scaffolded" row for the agent layer (`.claude/commands/`, `.claude/settings.json`, `CLAUDE.md`, `skills-lock.json`)
- Document `TEST_CMD` / `LINT_CMD` / `TYPECHECK_CMD` env-var overrides for the scripts
- Add a "Fresh machine setup" section explaining the `init` → auto-`doctor` flow

**Acceptance:** README is internally consistent — every command mentioned exists; every claim about output is true.

### T215 — Bump version (~2 min)

Edit `package.json`: `"version": "1.0.0"` → `"version": "1.1.0"`. Commit: `chore: bump version to 1.1.0`.

### T216 — Release PR (~5 min)

```bash
bash scripts/release-check.sh
```

Gates pass → PR opens `dev` → `main`. Review the diff on GitHub → merge via "Create a merge commit".

### T217 — Tag + publish (~5 min)

```bash
git checkout main && git pull
git tag v1.1.0
git push --tags
```

`publish.yml` fires automatically. Verify:

```bash
npm view @vinhnnn/dev-workflow version    # should print 1.1.0
bunx @vinhnnn/dev-workflow@1.1.0 --version
```

### T219 — `--repos <glob>` flag for `doctor` (~30 min)

Edit `src/commands/doctor.mjs`:
- Parse `--repos <glob>` arg.
- If absent: behave as today (single-repo on `cwd`).
- If present:
  - Resolve glob via `node:fs.glob` (Node 22+) or hand-rolled (Node 20 compat) — pick whichever keeps zero deps.
  - For each matching dir, check it contains `dev-workflow.md`. If not, silently skip.
  - For each qualifying dir: temporarily set the project-root for the existing check functions to that dir and run them.
  - Output format: per-repo block headed by `=== <repo-relpath> ===`, indented same as today; trailing summary `N repos audited, M with issues`.
- Runtime checks (Node, git, bun, gh, claude) run **once at the top**, not per repo — they're machine-level, not project-level.

**Acceptance:**
- `bunx ... doctor --repos '~/github.com/*'` audits every dev-workflow project under `~/github.com/`, reports drift per repo.
- `--repos` plus a glob that matches nothing exits 0 with `0 repos audited`.
- `--repos` plus `--fix` runs the fix per repo (see T220 for `upgrade --repos` which is what `--fix` invokes).

### T220 — `--repos <glob>` flag for `upgrade` (~30 min)

Edit `src/commands/upgrade.mjs`:
- Parse `--repos <glob>` arg.
- If absent: behave as today.
- If present:
  - Resolve glob same way as T219.
  - For each matching dir containing `dev-workflow.md`, run the existing per-file diff/apply loop with that dir as the cwd.
  - Force `--yes` interaction model: in multi-repo mode, prompting per-file across N repos is unusable. Either `--yes` (apply all) or `--dry-run` (show all diffs, write nothing) is required. Error otherwise.
- Output format: `=== <repo-relpath> ===` header per repo; trailing summary `N repos processed, M files updated total`.

**Acceptance:**
- `bunx ... upgrade --repos '~/github.com/*' --yes` updates every dev-workflow project under that glob.
- `bunx ... upgrade --repos '~/github.com/*' --dry-run` shows aggregated diffs without writing.
- `bunx ... upgrade --repos '~/github.com/*'` (no `--yes`, no `--dry-run`) errors with a clear message: "multi-repo mode requires --yes or --dry-run".

### T221 — Tests for `--repos` (~30 min)

Add to `tests/basic.test.mjs` (or `tests/multi-repo.test.mjs` if it gets crowded):
- Setup helper: create 3 tmpdirs under one parent, `init` in 2 of them (3rd is a non-dev-workflow dir).
- `doctor --repos '<parent>/*'` audits the 2 init'd dirs, silently skips the 3rd, exits 0.
- `upgrade --repos '<parent>/*' --dry-run` shows diffs per repo, writes nothing.
- `upgrade --repos '<parent>/*' --yes` after manual drift in both dirs restores both to template state.
- `upgrade --repos '<parent>/*'` (no flag) exits 1 with the expected error message.

**Acceptance:** all 4 new tests pass; total suite count after T212/T213/T221 is ~19.

### T218 — Stretch: puzzle smoke test (↷ stretch)

```bash
cd /Users/vinhn/github.com/101-sliding-puzzle
bunx @vinhnnn/dev-workflow@1.1.0 upgrade --dry-run
```

Expect:
- Diff shown for `dev-workflow.md` (puzzle has the local Phase 0 edit; new template has the upstream Phase 0 — should be similar enough to merge cleanly)
- New files (`.claude/commands/*`, `CLAUDE.md`, `skills-lock.json`, `feature-pr.sh`) listed as "would create"
- `doctor` reports the puzzle-specific drift (no `.claude/skills/` populated, missing `agent-skills` plugin, etc.)

If anything explodes, the issue is the v1.1 design — not the puzzle — and a v1.1.1 hotfix is needed before promoting v1.2 work.

## Three-bucket sprint plan

| Bucket        | Tasks                                                                                          |
|---------------|------------------------------------------------------------------------------------------------|
| **Committed** | T201 ✓, T202, T203, T204, T205, T206, T207, T208, T209, T210, T211, T212, T213, T214, T219, T220, T221, T215, T216, T217 |
| **Stretch**   | T218 (puzzle smoke test — useful but not gating release)                                       |
| **Blocked**   | none                                                                                           |

Build order note: T219/T220/T221 (multi-repo) come **after** the single-repo `doctor`/`upgrade` work (T209–T213) lands but **before** version bump (T215), so v1.1.0 ships with the multi-repo flag in a single coherent release.

## Effort estimate

~6–8 hours focused (was 5–7 before adding `--repos`). Bulk in T209 (`doctor`), T212 (`doctor` tests), and T219/T220 (`--repos`). Everything else is mechanical.

## Notes for future Claude in the build session

- **Stay zero-dep.** Anything from `node:` is fine. Nothing from npm. This is the hill we die on; preserves `bunx` install speed.
- **`doctor` is advisory in v1.1.** Do not wire it into `release-check.sh` Gate 0. That promotion is a v1.2+ decision once we've seen real use.
- **Don't populate `skills-lock.json` with default skills in this sprint.** That's v1.2 work (per-preset overlays). v1.1 ships the empty schema only.
- **Generic command files only.** Resist the urge to copy aletheia's `ship.md` verbatim — its `bun lint` / i18n steps belong in aletheia, not the scaffold.
- **`doctor` checks should be cheap.** Each tool detection = one `spawn` + one timeout (3s). No network calls in v1.1. (`sync-skills` in v1.3 is where git network calls live.)
- **Preserve idempotency.** Every new template file must be skip-on-exist by default. `--force` is the only way to overwrite. `upgrade`'s diff prompt handles the steady-state update path.
- **When in doubt, read aletheia's `.claude/`.** It's the most-evolved consumer; mirror its shape (not its content).
- **Multi-repo mode is opinionated.** `upgrade --repos` requires `--yes` or `--dry-run` — interactive per-file prompts across N repos are unusable. Don't try to make it work; the constraint is intentional.
- **`--repos` glob skips non-dev-workflow dirs silently.** Don't add a "this dir doesn't look like a dev-workflow project" warning per skipped item — would drown the output. Trailing summary names how many were skipped.
- **Runtime checks run once per `doctor --repos` invocation, not per repo.** Node/git/bun/gh/claude are machine-level. Only project checks loop.
