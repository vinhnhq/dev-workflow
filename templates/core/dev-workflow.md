# Development Workflow

A structured, repeatable process for shipping features cleanly — spec before code, tests before merge, gate before release. Copy this doc and the conventions below into any new repo to enforce the same discipline.

**This file is framework-agnostic.** Stack-specific tooling (package manager commands, test runner config, linter setup) lives in preset files: `dev-workflow-<stack>.md`. See [Tooling Presets](#tooling-presets) below.

---

## Kickoff — starting a new project with this workflow

Two ways to apply the workflow to a new repo. Both end up in the same place. Pick whichever fits the moment.

### Option A — Agent-driven (recommended)

1. Create an empty repo, `git init`.
2. Copy `dev-workflow.md` + one preset (e.g. `dev-workflow-nextjs.md`) into the repo root.
3. Open Claude Code in the repo.
4. Paste this prompt:

   > This repo is empty. Init it per `dev-workflow.md` using the Next.js preset (`dev-workflow-nextjs.md`). Run the Quick Setup bootstrap snippet, then the preset's setup checklist. Ask me the manual decisions — don't guess.

5. Answer Claude's questions:
   - Project name + one-line description
   - Device / viewport matrix (Phase 1 requirement)
   - Stack confirmation (or swap — Bun vs pnpm, etc.)
   - Any repo-specific agent rules for AGENTS.md
   - Deploy target (Vercel / Cloudflare / self-hosted)
6. Next prompt: `"Start Sprint 01: <what you're building>"`.

### Option B — Manual

1. Copy the two files into the new repo.
2. Paste the bootstrap snippet from the [Setup](#setup--how-to-bootstrap-a-new-repo) section into your terminal.
3. Follow the preset's setup checklist by hand (install test runner, linter, etc.).
4. Write `AGENTS.md` and `scripts/release-check.sh` manually.
5. Start writing the first spec.

### The bootstrap script serves both

The Quick Setup bootstrap snippet in the [Setup](#setup--how-to-bootstrap-a-new-repo) section is the **same script** whether you run it or Claude runs it. It lives inside this doc on purpose — humans find it by reading, agents find it by reading. One source of truth.

You never need to save the script separately (unless you want `~/bin/bootstrap-workflow` as a shortcut). Copying `dev-workflow.md` into the new repo brings the bootstrap with it.

---

## Pipeline at a Glance

```
SPEC → PLAN → IMPLEMENT → TEST → REVIEW → RELEASE
```

Each phase has a hard entry and exit condition. You don't move forward until the exit condition is met.

---

## Phase 1 — Spec

**Entry:** A feature request or task description exists.  
**Exit:** A written spec with acceptance criteria exists. No code written yet.

### What to produce

A spec document (or inline in `plan.md`) with:
- **Context** — what problem this solves and why now
- **What we're building** — concrete deliverable, not goals
- **Acceptance criteria** — specific, testable, binary (pass/fail)
- **Device / viewport matrix** — which devices and screen sizes must this work on? (see below — ask if missing)
- **Out of scope** — what we are explicitly not doing

### Device / viewport matrix

Every spec for user-facing work must name the target devices/viewports explicitly. Not a default. Agent asks if missing.

Typical shapes:
- **Mobile-first consumer**: iPhone 14, iPhone SE (smallest supported), Pixel 7. Optional desktop.
- **B2B / admin panel**: Desktop Chrome, Desktop Safari, maybe one tablet size. Mobile de-prioritized.
- **Content / marketing site**: one mobile + one desktop minimum, plus any device the target audience skews toward.
- **Responsive anything**: at minimum one narrow (≤375px) + one wide (≥1280px).

This matrix drives Playwright project config, Tailwind breakpoint usage, and the devices tested during QA. Getting this wrong downstream is expensive — pick before coding.

### Rules

- If the request is outcome-only ("add login", "fix the bug"), ask for: which files, function signatures, data shapes. Do not guess.
- If multiple interpretations exist, list them and ask. Do not pick silently.
- If the device/viewport matrix is missing for user-facing work, ask before starting.
- No code until the spec is agreed on.

---

## Phase 2 — Plan

**Entry:** Spec is agreed on.  
**Exit:** `tasks/README.md` updated with new tasks in backlog. Sprint folder created with `plan.md` and `todo.md`.

### File structure

```
__project__/
  tasks/
    README.md                        ← master task board (parsed by release gate)
    sprint-NN-name/                  ← committed work for a cycle
      plan.md                        ← per-task context + acceptance criteria
      todo.md                        ← checkbox list mirroring plan.md tasks
    backlog/                         ← uncommitted work — input to future sprints
      <domain>.md                    ← ongoing topical backlog (e.g. marketing, ops)
      client-waiting.md              ← cross-cutting items blocked on external input
      ideas.md                       ← ad-hoc drop zone for mid-conversation ideas
  docs/
    <domain>.md                      ← implementation reference per domain
    decisions/
      README.md                      ← ADR index
      ADR-NNN-title.md               ← one ADR per significant decision
    knowledge-ownership.md           ← who drove what, per sprint row
  RELEASES.md                        ← append-only release log (written by release gate)
```

Key rule: **`sprint-NN-name/` = committed work. `backlog/` = uncommitted.** Sprint folders are active and tracked by the release gate; backlog files are menus you pull from at sprint planning.

### `tasks/README.md` format

```markdown
# Project Tasks

Status legend: ✓ done · → in progress · · backlog · ↷ stretch · ⏸ blocked

Backlog (not-yet-committed work): [`backlog/`](backlog/)
 - [`backlog/<domain>.md`](backlog/<domain>.md) — ongoing topical tasks
 - [`backlog/client-waiting.md`](backlog/client-waiting.md) — cross-cutting blocked items
 - [`backlog/ideas.md`](backlog/ideas.md) — ad-hoc ideas drop zone

---

## Sprint NN — Name
| # | Task | Status |
|---|------|--------|
| NNN | [Task title](sprint-NN-name/NNN-task-slug.md) | · backlog |
```

Status values and the three-bucket model:

| Status | Bucket | Counts against release gate? |
|--------|--------|------------------------------|
| `· backlog` | **Committed** — planned, you intend to finish this sprint, not started yet | Yes — blocks release until `✓ done` or demoted |
| `→ in progress` | **Committed** — actively being worked | Yes — release waits for `✓ done` |
| `✓ done` | **Committed** — acceptance criteria met | No — satisfies gate |
| `↷ stretch` | **Stretch** — planned and ready, but not committed this cycle. Pick up if capacity allows; otherwise rolls forward visibly | No — ignored by gate |
| `⏸ blocked` | **Blocked** — cannot start until an external dependency clears (client answer, upstream sprint, decision, etc) | No — ignored by gate |

**Why three buckets, not two.** Keeping Stretch and Blocked visible inside the sprint (rather than exiling them to `backlog/` files) means you see the full shape of the sprint at a glance — what you committed to, what you'd grab if you had more time, what's parked on someone else's reply. Burying them in `backlog/` hides the dependency when it actually clears. The release gate stays accurate because only `· backlog` rows count — Stretch and Blocked are noise-free by the glyph.

**Rule of thumb for picking a bucket.** If you would be embarrassed to release the sprint without this task → Committed. If you hope to land it but it's fine if it rolls forward → Stretch. If progress is externally gated → Blocked. When unsure, prefer Stretch over Committed — under-committing and over-delivering beats the reverse every time.

Items inside `backlog/` files are **not counted** by any gate — they are explicitly uncommitted and exist outside the sprint concept.

### `plan.md` format

```markdown
# Plan: <Sprint Name>

## Context
<Why this sprint exists. What the state is before. What changes.>

## Tasks

### Task N: <Title>
**File:** `path/to/file.ts`
**Change:** <What changes and why>
**Acceptance:** <Binary pass/fail criteria>
```

### `todo.md` format

Group tasks by bucket so the sprint's shape is readable at a glance. Committed is the release-blocking set; Stretch is the reach list; Blocked names what's parked on someone else.

```markdown
# Todo: <Sprint Name>

Status legend: ✓ done · → in progress · · backlog · ↷ stretch · ⏸ blocked

## Committed (must finish to release)

- [ ] **T101** · <task title> · ~<effort>
- [ ] **T102** · <task title> · ~<effort>

## Stretch (pick up if capacity allows)

- [ ] ↷ **T103** · <task title> · ~<effort> · <why not committed>

## Blocked (waiting on external dependency)

- [ ] ⏸ **T104** · <task title> · blocked on <who/what> · unblocks when <condition>
```

When a Stretch task gets pulled in mid-sprint, promote it to Committed (remove the `↷`). When a Blocked task's dependency clears, promote to Committed the same way. When a Committed task clearly won't land this cycle, demote to Stretch rather than deleting — the sprint plan's accuracy matters for the release gate to mean something.

### Backlog conventions

Backlog files hold work that isn't ready for a sprint yet — either because it needs client input, or it's ongoing maintenance work, or it's a fresh idea that hasn't been scoped. Three patterns cover most cases. Only create the files you actually need.

#### Pattern 1 — Domain backlog (`<domain>.md`)

Ongoing topical work that spans sprints. Examples: `marketing.md`, `ops.md`, `infra.md`, `content.md`. Use a numbered ID scheme per domain so tasks can be referenced by stable IDs (`M101`, `O203`, etc).

```markdown
# <Domain> Backlog

Status legend: ✓ done · → in progress · · backlog · ↷ stretch · ⏸ blocked

## <Category> — <short name>
| # | Task | Status | Notes |
|---|------|--------|-------|
| X101 | <task description> | · backlog | <blocker, reference, or dependency> |
```

#### Pattern 2 — Client-waiting (or external-waiting)

Cross-cutting checklist of questions/dependencies blocked on people outside the dev team — client, vendor, legal, etc. Each row names what the answer unblocks, so when the answer arrives you know where to propagate it.

```markdown
# Client-Waiting Checklist

Status: ⏸ waiting · ✓ answered · ✗ no longer needed

| # | Question | Status | Unblocks | Source |
|---|----------|--------|----------|--------|
| C01 | <question> | ⏸ waiting | <task IDs this enables> | <where the question came from> |
```

This file is the agenda for every external sync. When an answer arrives, mark the row ✓ and propagate into the operational home of each unblocked task. This file stays lean — it's a status board, not the answer archive.

#### Pattern 3 — Ideas drop zone (`ideas.md`)

Dump ground for mid-conversation ideas that you don't want to lose but aren't ready to evaluate. Keep entries tight — title, source, 1-3 sentences, effort guess, promote/drop verdict.

```markdown
# Ideas Backlog

## <Short title>
**Source:** <when/where it came up>
**Idea:** <1-3 sentences>
**Effort guess:** <small / medium / large>
**Move to:** <sprint folder, domain backlog, or "drop">
```

#### Review cadence

At the start of every sprint, spend 15 minutes scanning each backlog file. For each entry:
- **Promote** into the new sprint if it's ready
- **Leave parked** with a one-line note on why
- **Delete** if it's no longer relevant

Default-delete rule: if an item has been in backlog for 3+ sprints untouched, delete it. The idea will resurface if it still matters. Without this rule, backlog files become rot piles.

---

### ADR format

Create one ADR per significant architectural decision — technology choice, pattern selection, anything you'd want to explain to a future team member.

```markdown
# ADR-NNN — <Decision Title>

**Context:** <What situation forced a decision>  
**Decision:** <What we chose>  
**Alternatives:** <What we considered and rejected, and why>  
**Consequences:** <What this means going forward — costs and benefits>
```

---

## Phase 3 — Implement

**Entry:** Plan is written, tasks are in backlog.  
**Exit:** All tasks in sprint are `✓ done`. All tests pass.

### Rules

- **Thin slices only.** One task → test → commit → next. Never batch a sprint and review a wall of changes at the end.
- **Surgical changes.** Every changed line traces directly to the current task. Do not "improve" adjacent code.
- **When your changes create orphans**, remove imports/variables/functions that your changes made unused. Do not remove pre-existing dead code unless asked.
- **No speculative features.** No abstractions for single-use code. No flexibility that wasn't requested.

### Commit message convention

```
<type>(<scope>): <description>
```

#### Types — grouped by intent

**Documentation and planning (no code impact)**
- `plan` — creating or updating a sprint's `plan.md` / `todo.md` / task rows in `tasks/README.md`
- `docs` — any other project documentation: ADRs, `brief.md`, backlog files, `dev-workflow.md`, `README.md`, SEO/content reference docs

**Code (changes production behavior)**
- `feat` — new user-visible capability
- `fix` — bug fix
- `refactor` — internal restructuring, no behavior change

**Supporting**
- `test` — test-only changes
- `chore` — tooling, deps, version bumps, CI config, release bumps

#### Scope

- **Code changes** (`feat` / `fix` / `refactor` / `test`): `sprint-NN/TN` — sprint number and task ID (e.g. `feat(sprint-03/T301)`)
- **Planning** (`plan`): `sprint-NN` — sprint number only (e.g. `plan(sprint-03)`)
- **Docs** (`docs`): a domain slug — `docs(brief)`, `docs(seo)`, `docs(backlog)`, `docs(decisions)`, `docs(dev-workflow)`
- **Chore**: no scope needed for repo-wide tooling; optional scope for targeted changes (`chore(deps)`, `chore(ci)`)

#### Core rule — one commit = one semantic type

**Never mix docs and code in the same commit.** If a task requires both a plan update and the code that implements it, split into separate commits:

```
1. plan(sprint-03): add T301 buildMetadata helper
2. feat(sprint-03/T301): add buildMetadata helper in src/lib/seo.ts
3. test(sprint-03/T301): verify buildMetadata output per locale
```

Why: reviewers can see at a glance what each commit changed, and reverting docs vs code becomes surgical. Mixed commits muddy `git blame` and make review harder.

#### Examples

**Docs-only commits:**
```
docs(brief): expand company facts with legal names and tax registry data
docs(backlog): add client-waiting items C17-C20 for founding year + address
docs(decisions): add ADR-004 original content over scraped blog
docs(seo): add i18n OG card content reference
docs(dev-workflow): split into framework-agnostic core + Next.js preset
plan(sprint-03): add SEO & marketing foundation sprint
plan(sprint-03): split T305 into schema builders (T305a) and data wiring (T305b)
```

**Code commits:**
```
feat(sprint-03/T301): add buildMetadata helper in src/lib/seo.ts
feat(sprint-03/T303): add sitemap.ts with locale × route combos + hreflang
fix(sprint-03/T302): correct canonical URL for localized routes
refactor(sprint-03/T305a): extract JSON-LD builders into seo/schema.ts
test(sprint-03/T303): verify sitemap.xml hreflang output
```

**Supporting:**
```
chore: bump version to 0.2.0
chore(deps): add next-intl 3.x
chore(ci): add Lighthouse check to release gate
```

### Updating task status

Update `tasks/README.md` as each task completes:
- `· backlog` → `→ in progress` when you start
- `→ in progress` → `✓ done` when the task's acceptance criteria pass

---

### Team mode (when 2+ contributors)

The default workflow above is **solo mode** — direct commits to `dev`, no review gate, no CI between you and the trunk. That's the right shape when team size is 1: zero overhead, zero ceremony.

When a second person joins the codebase, switch to **team mode**. The shape changes from "push to dev directly" to "branch off dev, PR back to dev, CI gates the merge."

#### Daily flow in team mode

```
1. git checkout dev && git pull
2. git checkout -b feat/T401-short-description
3. ... commit work in thin slices, same conventions as solo mode ...
4. git push -u origin feat/T401-short-description
5. gh pr create --base dev --title "feat(sprint-NN/TN): description"
6. CI runs (lint + build + unit tests)
7. Teammate reviews + approves
8. Merge into dev — see "Merge mode" below for which button to click
9. git checkout dev && git pull && git branch -d feat/T401-short-description
```

#### Branch naming convention

```
feat/T401-product-detail-page          new feature
fix/T402-canonical-url-trailing-slash  bug fix
chore/T403-add-ci-workflow             tooling, deps, config
refactor/T404-extract-shared-content   internal restructuring
docs/T405-update-onboarding-section    docs-only
```

The `T<NNN>-` prefix ties the branch back to the sprint task. Skip the prefix only for ad-hoc work that doesn't have a task ID — but most work should have one.

#### Merge mode (which GitHub button to click)

| When merging into | Button | Why |
|-------------------|--------|-----|
| `dev` from a **clean atomic-commit** feature branch | **Rebase and merge** | Preserves your `feat(...)` / `fix(...)` commits on `dev` without merge-commit clutter |
| `dev` from a **messy WIP** feature branch | **Squash and merge** | Throws away `wip` / `try again` / `oops` commits, lands one clean commit |
| `main` from `dev` (release PR) | **Create a merge commit** | Preserves all commits on `main` exactly as built; merge commit marks the release boundary atomically. Never squash or rebase release PRs. |

The release PR rule is non-negotiable. Squashing the release PR destroys the atomic-commit history that the sprint convention worked to produce, and rebasing erases the release-boundary marker (`git revert -m 1 <merge-sha>` becomes impossible).

#### CI gate

The `.github/workflows/ci.yml` workflow runs on every PR to `dev` or `main`:

- **PRs to `dev`**: lint + build + unit tests (~30-60s). Fast feedback for daily flow.
- **PRs to `main`** (release PRs): lint + build + unit tests **plus** Playwright E2E. Full confidence at the release boundary, where the extra ~90s is well-spent.

CI must be green before merge. No exceptions; if it's red, fix the underlying cause rather than re-running until it passes.

#### Branch protection setup checklist (manual, GitHub UI)

Branch protection enforces the team-mode rules at the platform level — without it, anyone can push directly to `dev` and bypass CI/review. Enable when the repo is eligible (GitHub Pro plan or public repo; the free private plan refuses).

**Repository → Settings → Branches → Add branch protection rule**:

```
Branch name pattern: dev
[✓] Require a pull request before merging
    [✓] Require approvals — at least 1
    [✓] Dismiss stale pull request approvals when new commits are pushed
[✓] Require status checks to pass before merging
    [✓] Require branches to be up to date before merging
    Required status checks: "Lint · Build · Unit tests"
[✓] Require linear history   ← optional; pick this if you want rebase-and-merge enforced
[ ] Allow force pushes       ← OFF
[ ] Allow deletions          ← OFF
```

Repeat for `main` with the same rules plus the Playwright check as required:

```
Branch name pattern: main
[✓] (same as above)
    Required status checks: "Lint · Build · Unit tests", "Playwright (PRs to main only)"
```

After enabling, verify by attempting to push directly to `dev` — git should refuse. If it succeeds, the rule isn't applied; check that "Include administrators" is on so it applies to repo owners too.

#### When to switch back to solo mode

Switch back when team size returns to 1. Branch protection on `dev` becomes friction without payoff — every change goes through a PR you'd review against yourself. Disable the rules; keep the CI workflow (it still helps catch local breakage before push). Solo mode + CI is a strictly better solo experience than no-CI solo mode.

---

## Phase 4 — Test

**Entry:** Implementation complete for the task.  
**Exit:** Tests pass (or failing tests are understood and baselined).

### Principles (framework-agnostic)

- **E2E / integration tests over unit tests.** Only write unit tests when the unit has complex isolated logic worth testing in isolation.
- **Device matrix from Phase 1 drives the test runner config.** Do not test a superset for completeness; do not test a subset for speed. Match the spec exactly.
- **Tests live in `__tests__/`** (or the runner's idiomatic dir) at repo root.
- **Tests must be re-runnable locally** without special setup beyond `<pkg-manager> install`.

Actual test runner config (Playwright, Vitest, Jest, pytest, etc.) lives in the stack preset file — see [Tooling Presets](#tooling-presets).

### Known failures

If a test fails by design (an assertion that is intentionally wrong, or a platform constraint), baseline it:

```bash
# In release-check.sh
KNOWN_FAILURES=2  # number of pre-approved failing tests
```

Document each known failure with a comment in the test file explaining why it is expected.

---

## Phase 5 — Review (Knowledge Capture)

**Entry:** Sprint tasks are done and tests pass.  
**Exit:** Docs updated, ADRs finalized, ownership recorded.

### What to update

1. **`docs/<domain>.md`** — update with any patterns, gotchas, or critical rules discovered during the sprint
2. **`docs/decisions/`** — finalize any ADRs drafted during planning
3. **`docs/knowledge-ownership.md`** — record who drove what

### `knowledge-ownership.md` format

```markdown
# Knowledge Ownership

| Sprint | Task | Solution | Owner | Notes |
|--------|------|----------|-------|-------|
| 04 | ViewTransition animations | CSS class toggle | collab | Tried native ViewTransition first — not ready |

Owner values: `you` (developer), `AI` (agent), `collab` (iterated together)
```

---

## Phase 6 — Release

**Entry:** All committed tasks `✓ done`, tests pass, working on `dev` branch.  
**Exit:** `dev` merged to `main` via a reviewed PR. Release logged.

### Branch model

- `dev` — working branch. All development happens here.
- `main` — release-only. Updated exclusively via a PR opened by the release gate script. Never commit directly to `main`.

### Release via PR, not direct merge

The gate script stops at opening a PR — it never merges to `main` itself. The merge is a deliberate human click on GitHub after the PR is reviewed. Rationale:

- **Production preview.** If the platform (Vercel, Netlify, etc.) is wired to auto-deploy `main`, clicking merge *is* the production deploy. A PR exposes a merge-candidate preview so you smoke-test the production build *before* the deploy triggers, not after.
- **Safer rollback.** GitHub's "Revert" button on a merged PR generates a clean reverse-merge commit. Doing that manually under pressure is error-prone.
- **Diff-linked release notes.** The PR body is a permanent, searchable archive of what shipped — complements the terse `RELEASES.md` entry with the actual file-level changes.
- **Cold-reviewer discipline.** Even for a solo project, reading the full diff on a PR (not in your editor) catches things a mid-implementation review misses.

The gate's job is to make the PR ready. The human's job is to click merge.

### Version bump (manual, before running the gate)

1. Update `version` in `package.json`
2. Commit: `chore: bump version to X.Y.Z`

### Release gate script (`scripts/release-check.sh`)

The gate runs sequential checks. Any failure exits non-zero and blocks the release.

```
Gate 1: Sprint status     — grep "^|.*· backlog" in sprint tables of tasks/README.md. FAIL if count > 0.
                             Only "· backlog" rows (Committed, not started) count. "↷ stretch" and "⏸ blocked"
                             rows are ignored by design — see Phase 2 three-bucket model.
Gate 2: Test suite        — run the project's test command (see preset). FAIL if failures > KNOWN_FAILURES.
Gate 3: Sync check        — git fetch origin dev; FAIL if `git rev-list HEAD..origin/dev --count` > 0.
                             Catches "local clone is behind teammates' pushes" before the release PR opens
                             from a stale state. In solo mode this gate is a no-op (you are origin/dev).
Gate 4: Git dirty check   — git status --porcelain. FAIL if working tree is dirty.
Gate 5: Commits ahead     — git rev-list main..HEAD --count. WARN if 0.
Gate 6: Commit list       — print git log main..HEAD --oneline for review.

→ Prompt: "Type YES to proceed with opening the release PR:"

On YES:
  1. Append entry to __project__/tasks/RELEASES.md on dev
  2. git add + commit + push origin dev
  3. gh pr create --base main --head dev --title "release: vX.Y.Z" --body <release notes>
  4. STOP — merge is a human click on GitHub after PR + preview review
```

### `RELEASES.md` entry format (written by gate script)

```markdown
## vX.Y.Z — YYYY-MM-DD

- Commits ahead of main: N (tip: <short SHA>)
- Tests: passed, N known failures
- Merge: see PR on GitHub
```

The PR body duplicates this entry and adds the full commit list so reviewers have sprint-level context alongside the file-level diff.

### Environment escape hatches (for testing the gate script itself)

```bash
SKIP_TESTS=1 bash scripts/release-check.sh      # skip Playwright run
FORCE_PASS=1 bash scripts/release-check.sh      # bypass all gates (test harness only)
```

---

## Agent Behavioral Rules

These apply to any AI agent (Claude Code or similar) working in the repo.

### Core principles

1. **Think before coding** — state assumptions explicitly; ask when unclear; surface tradeoffs before acting
2. **Simplicity first** — minimum code that solves the problem; no speculative features, no single-use abstractions
3. **Surgical changes** — touch only what the request requires; do not refactor adjacent code
4. **Goal-driven execution** — transform every task into verifiable criteria; state a plan before multi-step work
5. **Spec before code** — if the prompt is outcome-only, ask for files, function signatures, data shapes before writing anything

### CLAUDE.md / AGENTS.md setup

In `CLAUDE.md` at the repo root, reference your agent rules:

```markdown
@AGENTS.md
```

In `AGENTS.md`, add repo-specific agent constraints — e.g. framework version caveats, which docs to read before touching a given library.

### `.claude/settings.local.json` (gitignored)

Pre-approve common read-only and dev commands so the agent doesn't prompt on every call:

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm run *)",
      "Bash(bun run *)",
      "Bash(bash *)",
      "Bash(node *)",
      "Bash(npx playwright *)",
      "Bash(curl *)",
      "Write(*)",
      "Edit(*)"
    ]
  }
}
```

Add `.claude/settings.local.json` to `.gitignore` — these are personal overrides, not team config.

---

## Tooling Presets

Stack-specific tooling (package manager, test runner config, linter setup, agent rules) lives in preset files alongside this doc. Pick the one that matches your project's stack.

| Preset | Stack |
|--------|-------|
| [`dev-workflow-nextjs.md`](dev-workflow-nextjs.md) | Next.js 15 App Router + Bun + Playwright + Biome |
| _(add more as needed)_ | Python / Go / React Native / etc. |

### When to create a new preset

Create a new preset file (not an edit to an existing one) when the stack base or tooling choices diverge meaningfully. Naming pattern: `dev-workflow-<stack>.md`.

### What a preset covers

- Package manager commands (`bun run dev`, `pnpm dev`, `uvicorn app:app`, etc.)
- Test runner config (Playwright projects, Vitest config, pytest config)
- Linter + formatter config
- Framework-specific agent rules (append to `AGENTS.md`)
- Stack-specific setup checklist additions

---

## Setup — how to bootstrap a new repo

This section contains the bootstrap snippet referenced by [Kickoff](#kickoff--starting-a-new-project-with-this-workflow) above. Same snippet whether a human runs it or an agent runs it.

Two paths: **(1) run the bootstrap snippet below** to create the framework-agnostic scaffold in ~5 seconds, then do the manual decisions. Or **(2) follow the full manual checklist** further down. The script automates the deterministic parts; the manual parts are kept manual because they are decisions, not rote file creation.

### Quick setup — paste this in a new empty repo

Creates the `__project__/` tree, stubs every convention file with the right headers, adds the `.claude/` permissions, and wires the `.gitignore`.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Framework-agnostic bootstrap. Run from the root of a new empty repo.

mkdir -p __project__/tasks/backlog __project__/docs/decisions .claude

cat > __project__/tasks/README.md <<'EOF'
# Project Tasks

Status legend: ✓ done · → in progress · · backlog · ↷ stretch · ⏸ blocked

Backlog (not-yet-committed work): [`backlog/`](backlog/)
 - [`backlog/ideas.md`](backlog/ideas.md) — ad-hoc ideas drop zone

---

## Sprint 01 — <Name>
| # | Task | Status |
|---|------|--------|
EOF

cat > __project__/tasks/backlog/ideas.md <<'EOF'
# Ideas Backlog

Entry format:

## <Short title>
**Source:** <when/where it came up>
**Idea:** <1-3 sentences>
**Effort guess:** <small / medium / large>
**Move to:** <sprint folder, domain backlog, or "drop">

---

## Entries
_(empty)_
EOF

cat > __project__/tasks/RELEASES.md <<'EOF'
# Releases

Append-only log. Written by `scripts/release-check.sh`.
EOF

cat > __project__/docs/decisions/README.md <<'EOF'
# Architecture Decision Records

| ADR | Title | Status |
|-----|-------|--------|
EOF

cat > __project__/docs/knowledge-ownership.md <<'EOF'
# Knowledge Ownership

| Sprint | Task | Solution | Owner | Notes |
|--------|------|----------|-------|-------|

Owner values: `you` / `AI` / `collab`
EOF

cat > CLAUDE.md <<'EOF'
@AGENTS.md
EOF

cat > AGENTS.md <<'EOF'
# Agent Rules

Follow `dev-workflow.md` pipeline: Spec → Plan → Implement → Test → Review → Release.

## Repo-specific constraints

- <add project-specific rules here after picking a stack preset>
EOF

cat > .claude/settings.local.json <<'EOF'
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(bun run *)",
      "Bash(npm run *)",
      "Bash(pnpm run *)",
      "Bash(bash *)",
      "Bash(node *)",
      "Bash(npx *)",
      "Bash(curl *)",
      "Write(*)",
      "Edit(*)"
    ]
  }
}
EOF

touch .gitignore
grep -qxF '.claude/settings.local.json' .gitignore || echo '.claude/settings.local.json' >> .gitignore

echo ""
echo "✓ Framework-agnostic scaffold created."
echo ""
echo "Next steps (manual — these are decisions, not rote work):"
echo "  1. Agree on device / viewport matrix for the first spec"
echo "  2. Copy dev-workflow.md + pick a dev-workflow-<stack>.md preset into repo root"
echo "  3. Run the preset's setup checklist (package manager, test runner, linter)"
echo "  4. Edit AGENTS.md with repo-specific agent rules"
echo "  5. Write scripts/release-check.sh using the gate pattern in dev-workflow.md"
echo "  6. git init, protect main branch, work from dev"
```

### How to remember it

Three ways to keep this handy, pick whichever fits:

1. **Copy-paste from this doc** — simplest. The snippet travels with `dev-workflow.md`, so if you have the doc you have the bootstrap.
2. **Save as `~/bin/bootstrap-workflow` once**:
   ```bash
   # one-time setup
   mkdir -p ~/bin
   # paste the snippet into ~/bin/bootstrap-workflow, then:
   chmod +x ~/bin/bootstrap-workflow
   # ensure ~/bin is on your PATH

   # then, any time you start a new project:
   cd <new-repo>
   bootstrap-workflow
   ```
3. **Shell function in `.zshrc` / `.bashrc`** — same idea, but lives in your shell config so it follows your dotfiles.

## Manual Checklist — full list

Use this if you prefer step-by-step, or to verify the bootstrap snippet's output.

```
### Framework-agnostic (always)

```
[ ] Agree on device / viewport matrix for this project — write into first spec
[ ] Pick a stack preset (dev-workflow-<stack>.md). If none fits, create one.
[ ] Create __project__/tasks/README.md with status legend header + backlog links section
[ ] Create __project__/tasks/backlog/ directory
[ ] Create __project__/tasks/backlog/ideas.md with the entry format header (empty body)
[ ] Create __project__/tasks/backlog/client-waiting.md (only if external dependencies exist)
[ ] Create __project__/tasks/RELEASES.md (empty — gate script appends to it)
[ ] Create __project__/docs/ directory
[ ] Create __project__/docs/decisions/README.md (ADR index)
[ ] Create __project__/docs/knowledge-ownership.md with table header
[ ] Add CLAUDE.md → @AGENTS.md
[ ] Add AGENTS.md with repo-specific agent constraints
[ ] Create scripts/release-check.sh (see gate pattern above)
[ ] Add .claude/settings.local.json with pre-approved commands
[ ] Add .claude/settings.local.json to .gitignore
[ ] Protect main branch (no direct commits — release script only)
[ ] Work from dev branch from day one
```

### Stack-specific (from preset)

Each preset (`dev-workflow-<stack>.md`) has its own checklist covering package manager install, test runner setup, linter install, and framework-specific agent rules. Run the preset's checklist AFTER the framework-agnostic one above.
```
