# `@vinhnnn/dev-workflow`

A single markdown file. That's the whole package.

`dev-workflow.md` captures the conventions Vinh applies to every web project — stack defaults, architectural rules, process, quality bar — so when starting a new project with Claude Code there's no need to re-derive them. Claude reads the file, asks the project-specific questions (domain, modes, auth, DB), and scaffolds from there.

## Quick start

```bash
cd your-new-project
bunx @vinhnnn/dev-workflow
```

That writes `dev-workflow.md` into the current directory. Then open Claude Code and say:

> Set up the project — read dev-workflow.md and ask me what you need.

Claude will confirm the stack defaults apply, ask about the project's domain and scope, and scaffold a thin starting layout. No multi-file template drop, no rigid structure.

## Commands

```bash
bunx @vinhnnn/dev-workflow            # write dev-workflow.md to cwd
bunx @vinhnnn/dev-workflow --force    # overwrite existing dev-workflow.md
bunx @vinhnnn/dev-workflow --help
bunx @vinhnnn/dev-workflow --version
```

That's all of it.

## Why this is just one file

Earlier versions of this package shipped a multi-file scaffold — `CLAUDE.md` skeleton, `__project__/` folder, `.claude/commands/`, scripts, presets, a `doctor` command, multi-repo audit. It was over-engineered: every project got the same fixed structure even when it didn't need it, and per-project differences were friction rather than features.

The simpler model: ship the conventions, let Claude scaffold the specifics in conversation. A short discussion with Claude is faster than maintaining and overriding a templated drop.

## What's in `dev-workflow.md`

- **Claude init protocol** — explicit instructions for Claude on what to ask vs. what's defaulted.
- **Stack defaults** — Next.js 15 / React 19 / TypeScript / Bun / Biome / Tailwind v4 / shadcn/ui / ts-pattern / purify-ts.
- **Architectural rules** — pure boundary at `src/lib/`, `Maybe`/`Either` instead of `throw`, `ts-pattern.match` exhaustive for state.
- **Default project layout** — `src/`, `__project__/` (three files: `spec.md`, `backlog.md`, `done.md`), `e2e/`.
- **Conventions** — kebab-case filenames, conventional commits, `dev` is trunk and `main` is release-only.
- **Test layering** — `bun test` for unit/component, Playwright for E2E.
- **Default scope** — anonymous-first, no DB in v1, single-player before multiplayer.
- **Quality bar** — `lib/` coverage ≥ 90%, Lighthouse ≥ 90/95.
- **Six-phase process** — spec → plan → build → test → review → release.

## Requirements

Node.js ≥ 20.

## License

MIT
