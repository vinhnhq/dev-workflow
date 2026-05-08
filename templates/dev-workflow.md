# dev-workflow

> Personal conventions for Vinh's projects. Read this when starting or working on one of his projects with Claude Code.

This file is the **only** thing the `@vinhnnn/dev-workflow` package installs. Everything else (folder structure, package.json, configs) is scaffolded by Claude after a short conversation — not by a templated drop.

---

## Claude init protocol

When the user says **"set up the project"**, **"init"**, or similar (or asks Claude to start work in a new repo where this file is present):

1. **Confirm the stack defaults below apply** with one yes/no question, not item-by-item.
2. **Ask only the project-specific questions** in the next section.
3. **Scaffold the chosen layout** in thin steps — don't pre-build folders or files the project doesn't need yet.
4. **Don't re-discuss the defaulted items.** They're listed so we skip them.

### Project-specific questions to ask

- **Domain.** What does the project do? Top 1–3 user-facing features?
- **Modes.** Solo only? Multiplayer? Both? If multiplayer, hot-seat / online same-board / online turn-based?
- **Auth.** Anonymous fine, or does any feature need identity?
- **DB.** Can `localStorage` carry v1, or is persistence required?
- **Realtime infra.** Only if online is in scope: Partykit / Liveblocks / Supabase Realtime / custom socket server — decide at the start of the version that needs it, not in v1.
- **Anything that should override the defaults below?**

### What NOT to ask (defaulted, never re-discuss)

Tooling, conventions, architecture rules, process, quality bar, default scope. All listed below.

---

## Engineering principles

How Claude should work on Vinh's projects, regardless of stack. These bias toward caution over raw speed; for trivial tasks, use judgment. **Apply on every task.**

### 1. Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you wrote 200 lines and it could be 50, rewrite it.

The check: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that **your** changes made unused. Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the request.

### 4. Goal-driven execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Write a test that reproduces it, then make it pass."
- "Refactor X" → "Ensure tests pass before and after."

For multi-step tasks, state a brief plan with verification steps. Strong success criteria let Claude loop independently; weak criteria ("make it work") force constant clarification.

### 5. Spec before code

If the request is outcome-only, ask for the how before writing anything.

- Outcome prompt: "add login", "fix the bug", "make it faster" → ask which files, function signatures, data shapes.
- Spec prompt: "add `validateEmail(input: string): boolean` to `lib/validation.ts`" → proceed.
- AI-generated code passes the same review bar as hand-written: factoring, tests, conventions, PR size. No vibe-coding shortcuts.
- Work in thin slices: one task → test → commit → next. Never batch a sprint and review a wall of changes at the end.

**These principles are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions arrive before implementation rather than after mistakes.

---

## Stack defaults

- **Next.js 15** App Router, `src/` layout
- **React 19** — `<Activity>` and `<ViewTransition>` first-class
- **TypeScript** strict, no `any`, no `as` outside one isolated adapter
- **Tailwind v4** + **shadcn/ui** (commit primitives to `src/lib/ui/`, edit in place, never wrap)
- **Bun** for everything — package manager, runtime, test runner
- **Biome** for lint + format (no ESLint, no Prettier)
- **ts-pattern** — exhaustive `match()` for state transitions
- **purify-ts** — `Maybe` / `Either` for partial functions; no `throw` in `lib/`

If a project genuinely needs a different stack (Python API, Go service, React Native), discuss it — these defaults are for the web frontend case that's most common.

---

## Recommended Claude Code plugins and skills

When Claude is helping set the project up, propose enabling these. Skip any the user declines — they're starters, not requirements. All come from public Anthropic / Vercel / community sources.

### Plugins (enable both)

| Plugin                                     | Why                                                                                                                                                                                            |
|--------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `agent-skills@addy-agent-skills`           | Provides the workflow skills — `spec` / `plan` / `build` / `test` / `review` / `ship` / `code-simplify` — plus debugging, security, code review, TDD, and more. Mirrors the six-phase process in this file. |
| `frontend-design@claude-plugins-official`  | Provides the `frontend-design` skill — distinctive, production-grade UI generation that avoids the generic AI aesthetic. Valuable when scaffolding initial components and pages.               |

### Skill bucket — Web quality (audit time)

Run before shipping a milestone. Lighthouse + skill output should both clear the [Quality bar](#quality-bar).

| Skill                | When to use                                                                                                |
|----------------------|------------------------------------------------------------------------------------------------------------|
| `web-quality-audit`  | Comprehensive sweep covering performance, accessibility, SEO, and best practices. Run before each release. |
| `accessibility`      | WCAG 2.2, keyboard nav, screen-reader support. Run on every shipped mode.                                  |
| `core-web-vitals`    | LCP / INP / CLS optimization. Run when Lighthouse Performance < 90.                                        |
| `performance`        | Load time, bundle size, image optimization. Companion to `core-web-vitals` for non-CWV bottlenecks.        |
| `seo`                | Meta tags, structured data, sitemap. Run when the project is publicly indexable.                           |
| `best-practices`     | Modern security, compatibility, code quality patterns. Worth a pass before each release.                   |

### Skill bucket — React / Next.js (build time)

| Skill                              | When to use                                                                                                          |
|------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `vercel-react-best-practices`      | React 19 / Next 15 performance patterns from Vercel Engineering. Apply when writing or refactoring components.       |
| `vercel-composition-patterns`      | Compound components, render props, context — when designing reusable component APIs.                                 |
| `vercel-react-view-transitions`    | Implementation guide for `<ViewTransition>`, `addTransitionType`, route transitions. Required reading when wiring screen / state animations described in [React 19 features in use](#react-19-features-in-use). |

### Skill bucket — Design and UX

| Skill                       | When to use                                                                                  |
|-----------------------------|----------------------------------------------------------------------------------------------|
| `web-design-guidelines`     | UI / a11y review against the Web Interface Guidelines. Run alongside `accessibility`.        |
| `frontend-design`           | (From the `frontend-design` plugin above.) Use when generating polished initial screens.     |

### Skill bucket — Deploy

| Skill                       | When to use                                                                       |
|-----------------------------|-----------------------------------------------------------------------------------|
| `deploy-to-vercel`          | When the user says "deploy" or "push it live." Default deployment target.         |
| `vercel-cli-with-tokens`    | Token-based Vercel deploys (CI, automation). Use when interactive login isn't viable. |

### Skill bucket — Mobile (optional)

Only relevant if the project is React Native / Expo. Skip for web-only projects.

| Skill                          | When to use                                            |
|--------------------------------|--------------------------------------------------------|
| `vercel-react-native-skills`   | RN / Expo best practices, list performance, native modules. |

### Installation

Plugins are toggled in `.claude/settings.json` (`enabledPlugins`). Skills are pinned in `skills-lock.json` at the project root. Use whatever skill manager Claude Code currently provides — don't fabricate CLI commands. If Claude offers to install all of these in one pass, ask the user which buckets are relevant before bulk-enabling: every loaded skill costs context tokens.

---

## Architectural rules

These are non-negotiable; they keep logic testable and portable.

1. **Pure boundary at `src/lib/`** — no `react`, `next/*`, DOM globals, `fetch`, or `Date.now()`. Time and randomness flow as parameters (`now: number`, `rng: () => number`). Enforce with Biome `noRestrictedImports` against `src/lib/**`.
2. **Functional error types, not exceptions.** Anything that can fail returns `Either<Err, Ok>`. Anything that can be absent returns `Maybe<T>`. No `throw` in `lib/`. UI unwraps with `.caseOf({ Just, Nothing })` / `.caseOf({ Left, Right })` — never `.unsafeCoerce()`.
3. **State transitions through `ts-pattern`.** Reducers use `match([state, event]).with(...).exhaustive()`. Adding a new state or event without handling it fails the type check.
4. **No `any`, no `as`** outside one isolated adapter helper for purify-ts ↔ external libraries.
5. **TDD.** Every change in `lib/` starts with a failing test.

---

## Default project layout

```
src/
  app/           # Next App Router routes + UI
  lib/           # pure logic — no React, no DOM
    ui/          # shadcn primitives
  hooks/         # React glue
__project__/     # docs, specs, tasks (never imported)
e2e/             # Playwright smoke tests
```

### `__project__/` — start with three files

```
__project__/
  spec.md        # what we're building + acceptance criteria
  backlog.md     # TDD-ordered task list
  done.md        # archive, newest first: 2026-MM-DD · sha · description
```

**Promote to a richer layout** (`docs/`, `decisions/`, per-version `specs/v1.md`, `specs/v2.md`) only when one of these is true:

- More than one major version is in flight at once.
- A structural decision needs an ADR (new realtime transport, new auth model, new layer).
- Domain rules or game rules need their own reference doc (longer than ~30 lines).

If none of those apply, three files is enough. Resist the urge to pre-build structure for problems you don't have yet.

---

## Conventions

- **Filenames** — `kebab-case` everywhere. Component identifiers stay PascalCase (`export function Board()` lives in `board.tsx`). Unix-style; never PascalCase or spaces.
- **Imports** — absolute via `@/`, no deep relative paths.
- **Tests** — co-located in `__tests__/` next to source.
- **Commits** — Conventional Commits, atomic, one semantic type per commit (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Small, never amend.
- **Branch model** — `dev` is trunk; `main` is release-only. Daily commits land on `dev`. `main` only moves when a release PR merges.

---

## React 19 features in use

- **`<Activity mode="hidden">`** preserves screen state across navigation without re-mount cost (e.g. a config screen's form when entering the next screen).
- **`<ViewTransition>`** + `addTransitionType('a' | 'b' | 'c')` animates screen and state changes via the View Transitions API.
- **`prefers-reduced-motion: reduce`** shortens transitions to ~50 ms but doesn't remove animations that convey correctness (e.g. a flash on a successful match).

---

## Test layering

| Layer            | Tool                                                | Where                    | Command     |
|------------------|-----------------------------------------------------|--------------------------|-------------|
| Unit / property  | `bun test` (built-in)                               | `src/lib/**/__tests__/`  | `bun test`  |
| Component        | `bun test` + `happy-dom` + `@testing-library/react` | `src/**/__tests__/`      | `bun test`  |
| E2E smoke        | Playwright                                          | `e2e/`                   | `bun e2e`   |

`bun test` is a built-in subcommand, not an npm script. Add only `"e2e": "playwright test"` to `package.json`.

---

## Default scope choices

These are **defaults**, not laws — override per-project if a feature requires it.

- **Auth** — anonymous first; add identity only when a feature requires it.
- **DB** — none in v1; `localStorage` where possible. Defer Postgres / SQLite.
- **Multiplayer** — solo or single-player ships first; online ships in a later version.
- **Deployment** — Vercel by default. If realtime sockets are needed, decide transport at the start of the online version, not in v1.

---

## Quality bar

- `lib/` line coverage ≥ 90%.
- One Playwright smoke test per shipped mode.
- Lighthouse on the main screen: Performance ≥ 90, Accessibility ≥ 95.
- `bun test`, `bun lint`, `bunx tsc --noEmit` all green before any task moves to `done`.

---

## Process — six phases

```
SPEC → PLAN → BUILD → TEST → REVIEW → RELEASE
```

### 1. Spec

Write `__project__/spec.md` before any code. Five sections: Goal · Out of scope · User stories with acceptance criteria · Non-functional · Open questions. If the spec can't be written, the request isn't ready to build.

### 2. Plan

Translate the spec into TDD-ordered tasks in `__project__/backlog.md`. Each task is **red → green → refactor → commit**. Tasks should be small enough to land in one commit.

### 3. Build

Implement one task at a time, vertical slices. Failing test first, then implementation, then refactor if needed. Don't batch multiple tasks into one commit.

### 4. Test

Before a task moves to `done.md`, all three must pass:

```bash
bun test
bun lint
bunx tsc --noEmit
```

### 5. Review

Five-axis review before merging to `main` — correctness, readability, architecture, security, performance. For solo work, do this against your own diff before opening the release PR.

### 6. Release

PR-based, never auto-merge.

```bash
# from dev branch with a clean working tree:
gh pr create --base main --head dev --title "Release vX.Y.Z"
```

The merge is a deliberate human click on GitHub. Tagging on `main` triggers any `npm publish` workflow you have wired up. If you don't have one, push the tag and call it done.

---

## Move tasks from backlog to done

When a task is finished and all gates green:

1. Cut the line from `__project__/backlog.md`.
2. Paste at the **top** of `__project__/done.md` with the date and commit SHA:
   ```
   - 2026-05-08 · `abc1234` · 1.2 findPath: same-row, same-column, one-turn cases
   ```

Newest at top. No further structure unless `done.md` exceeds ~200 lines, then partition by year or version.

---

## When NOT to follow this protocol

- **Trivial changes** (typo fix, config tweak, dependency bump) — just lint, typecheck, push. Don't write a spec for a one-line fix.
- **Throwaway prototypes / spikes** — explicitly mark them as such; skip the spec and write a single `notes.md`. Promote to the full process only when the prototype graduates.
- **Project actively requires a different stack.** Discuss the override; don't fight the defaults.
