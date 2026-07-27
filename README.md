# `@vinhnnn/dev-workflow`

A conventions file and a pipeline you adapt once. That's the whole package.

`dev-workflow.md` captures the conventions Vinh applies to every web project — stack defaults, architectural rules, process, quality bar — so when starting a new project with Claude Code there's no need to re-derive them. `dev-workflow-pipeline/` carries the agent pipeline that goes with them (ship-review skill, session-cost hook, work summary, CI gate) as files to adapt, not as a framework to depend on. Claude reads the conventions, asks the project-specific questions (domain, modes, auth, DB), scaffolds from there, materializes the pipeline into `.claude/` and `.github/`, and deletes the staging folder.

## Quick start

```bash
cd your-new-project
bunx @vinhnnn/dev-workflow
```

That writes `dev-workflow.md` and `dev-workflow-pipeline/` into the current directory. Then open Claude Code and say:

> Set up the project — read dev-workflow.md and ask me what you need.

Claude will confirm the stack defaults apply, ask about the project's domain and scope, scaffold a thin starting layout, and wire the pipeline. No multi-file template drop, no rigid structure.

## Commands

```bash
bunx @vinhnnn/dev-workflow                 # write dev-workflow.md + dev-workflow-pipeline/
bunx @vinhnnn/dev-workflow --no-pipeline   # conventions only
bunx @vinhnnn/dev-workflow --force         # overwrite existing targets
bunx @vinhnnn/dev-workflow --help
bunx @vinhnnn/dev-workflow --version
```

That's all of it.

## Seeded, then owned

The drop happens **once**. From that moment the project's copy is the truth — edit it, let it diverge, never re-drop it over local changes (the shadcn model, not the dependency model). Init stamps a provenance line so you know which version you started from.

The flow back is a **harvest**: at each version-close retro, ask which of the version's process lessons generalize, and PR those to this repo. The foundation evolves downstream of practice. That's why prescriptions here favor principles over named tools — named tools fossilize, so each one carries a dated "current pick" line.

## Why it isn't a scaffolder

Early versions shipped a multi-file scaffold — `CLAUDE.md` skeleton, `__project__/` folder, `.claude/commands/`, scripts, presets, a `doctor` command, multi-repo audit. It was over-engineered: every project got the same fixed structure even when it didn't need it, and per-project differences were friction rather than features.

The simpler model: ship the conventions plus the handful of files that genuinely earned their keep across projects, and let Claude scaffold the specifics in conversation. A short discussion is faster than maintaining and overriding a templated drop.

## What's in the drop

**`dev-workflow.md`**

- **Claude init protocol** — what to ask vs. what's defaulted, and how to materialize the pipeline.
- **Engineering principles** — think before coding, simplicity first, surgical changes, goal-driven execution, spec before code.
- **Stack defaults** — Next.js 16 / React 19 / TypeScript (native compiler) / Bun / Tailwind v4 / shadcn/ui / ts-pattern / purify-ts, with a native type-aware lint+format toolchain and `mise` pinning.
- **Architectural rules** — pure boundary at `src/lib/`, `Maybe`/`Either` instead of `throw`, exhaustive `ts-pattern.match` for state.
- **Default project layout** — `src/`, `__project__/` (three files: `spec.md`, `backlog.md`, `done.md`), `e2e/`, and when to promote to a richer layout.
- **Conventions** — kebab-case filenames, conventional commits, `main` as trunk with squash-merged feature branches and stacked PRs for large features.
- **Test layering** — Vitest unit/integration, Playwright E2E driven like a real customer.
- **Quality bar** — the four gates, `lib/` coverage ≥ 90%, Lighthouse ≥ 90/95, CI running the same gates as the laptop.
- **Six-phase process** — spec → plan → build → test → review → release, with the ship ritual at review.
- **Docs write-once** — one owning file per kind of fact.
- **Brownfield adoption** — audit before gates, ratchet instead of block, strangler-fig per subsystem.

**`dev-workflow-pipeline/`**

| File | Becomes | Does |
|---|---|---|
| `ship-review-SKILL.md` | `.claude/skills/ship-review/SKILL.md` | The pre-PR ritual: gates, risk tiers, adversarial self-review, PR body contract, CI to green, fresh-context QA subagent, console summary. |
| `session-log-upsert.ts` | `.claude/scripts/session-log-upsert.ts` | `SessionEnd` hook — upserts one cost/token row per session into `done.md` and the branch's PR comment. Counts subagents; repairs its own output. |
| `work-summary.ts` | `.claude/scripts/work-summary.ts` | `bun run summary` — branch state, commits ahead, open PRs with check badges, newest ship entry, latest session cost. |
| `claude-settings.json` | merged into `.claude/settings.json` | Registers the `SessionEnd` hook. |
| `ci.yml` | `.github/workflows/ci.yml` | Runs the four gates on every PR; degrades to unit-only when secrets are absent. |

## Requirements

Node.js ≥ 20.

## License

MIT
