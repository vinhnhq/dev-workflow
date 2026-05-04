# <Project Name>

> One-line description of what this project does and who it serves.

## Commands

| Command | Purpose |
|---------|---------|
| _(fill in after stack pick)_ | _(e.g. `bun dev`, `bun test`, `bun build`)_ |

## Non-Obvious Conventions

- _(list conventions a new contributor would not infer from reading the code)_

## Installed Skills

Mirror of `skills-lock.json`. Update both together.

| Skill | Purpose |
|-------|---------|
| _(none yet — add as `skills-lock.json` is populated)_ | |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| _(none yet)_ | | |

## Process

For any non-trivial feature or change, follow `dev-workflow.md` (the canonical process for this repo and all my projects). Stack-specific conventions live in `dev-workflow-<stack>.md` once a preset is added.

```
PROVISION → SPEC → PLAN → IMPLEMENT → TEST → REVIEW → RELEASE
```

Sprint work lives under `__project__/tasks/sprint-NN-<name>/` with three files:
- `plan.md` — objective, scope, locked decisions, acceptance criteria
- `tasks.md` — task checklist (T01..Tn) ticked off during build
- `retro.md` — outcome metrics, process retro, actions

Master index: `__project__/tasks/README.md`.

### Slash commands (from `.claude/commands/`)

| Command | Phase | When to Use |
|---------|-------|-------------|
| `/spec` | Spec | Before writing any code — generate a structured PRD |
| `/plan` | Plan | Break spec into small verifiable tasks |
| `/build` | Implement | Implement one task at a time, thin vertical slices |
| `/test` | Test | TDD — failing test first, then implement |
| `/review` | Review | Five-axis code review before merge |
| `/code-simplify` | Review | Reduce complexity without changing behavior |
| `/ship` | Release | Pre-launch checklist + ship to production |

Trivial changes (typos, config tweaks): lint + typecheck + push. No spec/plan needed.

## Notes

- _(append project-specific notes that don't fit elsewhere — e.g. demo accounts, branch strategy, env-var gotchas)_
