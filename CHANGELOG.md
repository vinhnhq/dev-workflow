# Changelog

Read by `dev-workflow whatsnew`, which prints every entry newer than the version a project was set
up with. Behavioural changes belong here — file changes the tool detects on its own.

Newest first. One `## <version>` heading per release; the lines under it are what a consumer needs
to decide whether to act.

## 3.0.0-beta.0

- **`check`** — doc metadata gate: frontmatter contract (`id` · `kind` · `title` · `description`) and
  the backlog task grammar, with errors that say what to add and why. Reports and exits 0; `--strict`
  fails, and is meant to be turned on _after_ a backfill, not before.
- **`sync`** — three tiers. **Managed** files are package-owned and hash-tracked, so a hand-edit is
  reported as drift instead of being silently overwritten. **Seeded** stubs are copied only when
  absent and never overwritten — not even by `--force`. **Library** code (the checker, the grammar)
  is never copied at all, so N repos cannot hold N drifting copies.
- **`doctor`** — can a new person run this project? Checks required and optional env (naming what
  _silently degrades_ without each one), toolchain, files, and whether the guard hook is wired.
  Never reads or prints a value.
- **`guard`** — a `PreToolUse` hook that turns documented rules into blocked actions: command
  patterns, read-only paths, protected branches, bare force-pushes. Fails **open** by design — a
  broken guard must not wedge a session. Configure in `.claude/harness.json`.
- **`whatsnew`** — this command. What is new since your version, including which seeded stubs have
  improved upstream. `--json` for handing the decision to an agent.
- **Grammar is now shared** (`lib/grammar.mjs`): the repo-side gate and any dashboard parser import
  one definition. It was previously defined twice, and a task line that does not parse is _invisible_
  rather than rejected — nothing reports the loss.
- **Seeded doc set**: `CLAUDE.md`, `project.yml`, `harness.json`, `architecture.md`, `glossary.md`,
  `security-and-data.md`, `runbook.md` — stubs written to be hard to leave empty.
- **`testing-principles` ships as a skill**, not a template: it is read when writing tests, not copied
  to make something.
- **oxfmt** across the package and its payload templates; `lint` now runs `oxfmt --check`.

> **Wiring the guard:** add `"guard": "dev-workflow guard"` to your scripts and point a `PreToolUse`
> hook at `npm run --silent guard`. Do **not** use `npx dev-workflow` — the bin name is unscoped and
> resolves to an unrelated public package.

## 2.4.1

- Conventions seed (`dev-workflow.md`) + the `dev-workflow-pipeline/` staging folder.
