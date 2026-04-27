# Plan: `@vinhnnn/dev-workflow` v1.0.0

This file is the brief for the **next Claude Code session**, opened with cwd = `/Users/vinhn/github.com/dev-workflow/`. Read this top-to-bottom, then start at T01.

## Context

Context lives in another repo's history (`/Users/vinhn/github.com/tkp/`), where this workflow was field-tested across two real releases (v0.2.0 SEO foundation, v0.3.0 team-mode hardening). The conventions are battle-tested; this repo packages them so any new project can install via `bunx @vinhnnn/dev-workflow init` instead of manually copy-pasting files.

The actual workflow conventions are already in `templates/core/dev-workflow.md` and `templates/nextjs/dev-workflow-nextjs.md` — copied verbatim from the source repo. **Don't rewrite them; they are the source of truth.** The work in this repo is the CLI that delivers them.

## Decisions baked in

| Decision | Value | Why |
|----------|-------|-----|
| Package name | `@vinhnnn/dev-workflow` | Scoped under existing npm user `vinhnnn` (the @vinhnhq scope is owned by another npm user) |
| License | MIT | Least friction for adopters |
| Visibility | Public on GitHub | Required for `bunx` install path without auth |
| Initial version | `0.1.0` (pre-release) → `1.0.0` once CLI works | Field-tested elsewhere, but this repo's CLI is unproven |
| Runtime | Node ≥ 20 | `import attributes` for JSON, `node:test` built-in |
| Test runner | `node --test` | No dep — keeps `bunx` install fast |
| CLI deps | None (use `node:fs`, `node:path`, `node:readline`) | Same — fast install matters |

If any of these are wrong, change them in this PLAN.md and `package.json` before starting T02.

## Repo state right now

The previous session scaffolded the file tree:

```
dev-workflow/
├── README.md               draft, includes "status: v0.1.0 scaffolding only"
├── LICENSE                 MIT
├── PLAN.md                 this file
├── package.json            scoped, public, bin set, version 0.1.0
├── bin.mjs                 working CLI dispatcher (--help, --version work; subcommands stub)
├── .gitignore
├── src/
│   ├── commands/
│   │   ├── init.mjs        STUB — prints planned behavior, returns 0
│   │   ├── upgrade.mjs     STUB
│   │   └── add-preset.mjs  STUB
│   └── lib/
│       ├── copy-templates.mjs   STUB (throws "not implemented")
│       └── diff-files.mjs       STUB (throws "not implemented")
├── templates/
│   ├── core/                    ← real content from TKP, copy-don't-rewrite
│   │   ├── dev-workflow.md
│   │   ├── scripts/release-check.sh
│   │   └── __project__/
│   │       ├── tasks/
│   │       │   ├── README.md           empty board template
│   │       │   ├── RELEASES.md         empty
│   │       │   └── backlog/
│   │       │       ├── ideas.md
│   │       │       └── client-waiting.md
│   │       └── docs/decisions/
│   │           └── README.md           ADR index template
│   └── nextjs/                  ← real content from TKP
│       ├── dev-workflow-nextjs.md
│       ├── biome.json
│       └── .github/workflows/ci.yml
├── tests/
│   └── basic.test.mjs       five test.todo() placeholders
└── .github/workflows/
    ├── ci.yml               run `node --test tests/` on PR
    └── publish.yml          npm publish on `v*` tag with provenance
```

**Verify before starting:** `bin.mjs --help` and `bin.mjs --version` should work right now. `bin.mjs init` should print the planned behavior. Test:

```bash
node bin.mjs --help
node bin.mjs --version
node bin.mjs init
```

If any of those fail, fix before T02.

## Tasks (in order)

### T01 — `git init` + first commit + `gh repo create`

```bash
cd /Users/vinhn/github.com/dev-workflow
git init -b dev
git add .
git commit -m "chore: scaffold @vinhnnn/dev-workflow v0.1.0"
gh repo create vinhnhq/dev-workflow --public --source=. --description "Opinionated dev workflow scaffolder"
git push -u origin dev
git checkout -b main && git push -u origin main && git checkout dev
```

**Acceptance:** repo exists at `github.com/vinhnhq/dev-workflow`, both `dev` and `main` branches pushed, dev is the default working branch.

### T02 — Implement `init` command (~30 min)

**File:** `src/commands/init.mjs`

**Behavior:**
1. Parse args: `--preset <name>`, `--force`, `--dry-run`.
2. Resolve template source: `templates/core/` always, `templates/<preset>/` if preset given.
3. Recursively walk source dirs and copy each file to cwd, preserving relative paths.
4. If a target file already exists: skip (warn) unless `--force`.
5. Print summary: `N created, M skipped`.

**Acceptance:**
- `node bin.mjs init` in an empty dir creates `dev-workflow.md`, `scripts/release-check.sh`, `__project__/tasks/README.md`, etc.
- `node bin.mjs init --preset nextjs` additionally creates `dev-workflow-nextjs.md`, `biome.json`, `.github/workflows/ci.yml`.
- Re-running `init` skips existing files and reports them as skipped.
- `--dry-run` prints what would be copied without writing.

**Verification:** write the test in `tests/basic.test.mjs` from `test.todo` to a real test that mkdtemps a tmp dir and asserts the expected files appear.

### T03 — Implement `upgrade` command (~1h, hardest piece)

**File:** `src/commands/upgrade.mjs`, `src/lib/diff-files.mjs`

**Behavior:**
1. Detect installed presets: scan cwd for marker files (e.g., presence of `dev-workflow-nextjs.md` indicates the `nextjs` preset is installed).
2. For each template file that has a counterpart in cwd:
   - Compute line-by-line diff.
   - If identical, skip silently.
   - If different, render colorized diff (red `-`, green `+`) to stdout.
   - Prompt: `[y]es / [n]o / [s]kip rest / [a]ll yes`.
3. `--yes` skips all prompts and applies all updates.
4. `--dry-run` prints diffs but never writes.
5. Print summary: `N updated, M skipped, K unchanged`.

**Acceptance:**
- After `init`, modify `dev-workflow.md` locally (drop a paragraph).
- `node bin.mjs upgrade --dry-run` shows the diff (the dropped paragraph as a `+` add).
- `node bin.mjs upgrade --yes` re-applies the template.
- Files not present in templates are never touched.

**Implementation hint:** for the diff, prefer node-builtin `node:util` text comparison or a simple line-by-line LCS. **No npm dependencies** — keeps the package fast to `bunx`.

### T04 — Implement `add-preset` command (~20 min)

**File:** `src/commands/add-preset.mjs`

**Behavior:**
1. Validate preset name: must exist under `templates/<name>/`.
2. Same copy logic as `init` but only the preset's files.
3. Skip-if-exists by default; `--force` to overwrite.
4. Print summary.

**Acceptance:**
- `node bin.mjs add-preset nextjs` in an init'd dir adds the Next.js files.
- `node bin.mjs add-preset bogus` errors with available preset names.

### T05 — Real tests (~30 min)

**File:** `tests/basic.test.mjs`

Convert all five `test.todo()` to real tests. Use `node:fs/promises mkdtemp` for isolation, `child_process spawn` to run `bin.mjs`. `node --test` runs them.

**Acceptance:** `node --test tests/` passes locally and in CI.

### T06 — Polish CI workflows (~10 min)

`.github/workflows/ci.yml` already runs tests. Verify it's green on the first push. `publish.yml` requires `NPM_TOKEN` secret on the repo — add manually:

```bash
gh secret set NPM_TOKEN --body "$NPM_TOKEN_VALUE"
```

(Get a token from npm: `npm token create --read-publish`.)

### T07 — Real README (~20 min)

Replace the "status: scaffolding only" callout. Document:
- The actual install command.
- A `Quick start` section: install + init + commit.
- Per-preset features.
- The "what NOT to copy" guidance.

### T08 — Tag + publish v1.0.0

```bash
# Bump package.json version 0.1.0 → 1.0.0
# Commit: chore: bump version to 1.0.0
git tag v1.0.0
git push --tags
# publish.yml fires, npm publish happens automatically
```

**Acceptance:** `bunx @vinhnnn/dev-workflow@1.0.0 --version` prints `1.0.0` from anywhere.

### T09 — Smoke test from a fresh repo

```bash
mkdir /tmp/test-project && cd /tmp/test-project
bunx @vinhnnn/dev-workflow@latest init --preset nextjs
ls dev-workflow.md dev-workflow-nextjs.md scripts/release-check.sh
```

**Acceptance:** all expected files appear, no errors.

### T10 — Update TKP to use the package (optional but satisfying)

In `~/github.com/tkp/`, run:

```bash
bunx @vinhnnn/dev-workflow upgrade
```

Should report "no changes — local matches templates" since the templates were copied from TKP. If there are diffs, that's a real signal of drift between the two — investigate before applying.

## Three-bucket sprint plan for this work

| Bucket | Tasks |
|--------|-------|
| **Committed** (must finish to release v1.0.0) | T01, T02, T03, T04, T05, T06, T07, T08 |
| **Stretch** | T09 (smoke test from external dir) |
| **Blocked** | none right now — the repo doesn't exist yet, but T01 fixes that |

## Total effort estimate

3-4 focused hours.

## Notes for future Claude in the new session

- **Don't over-engineer the diff library in T03.** A simple line-by-line comparison with red/green output is enough. Skip myers, skip git-diff parity, skip three-way merging. We can ship those in v1.1.0 if anyone asks.
- **Don't add more presets in v1.0.0.** Only `nextjs` ships. Python, Go, etc. are v2.0+ work — gated on someone actually asking for them.
- **The CLI deps stay zero.** Anything from `node:` is fine; nothing from npm. This is a hill worth dying on — `bunx` install speed is half the value prop.
- **When in doubt, read the source repo's `dev-workflow.md`.** It's at `/Users/vinhn/github.com/tkp/dev-workflow.md` and represents the truth this package delivers.
