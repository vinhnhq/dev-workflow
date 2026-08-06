# CLAUDE.md

<!--
SEEDED — yours to own; `sync` never overwrites this file.

THE ONLY FILE THAT COSTS TOKENS IN EVERY SESSION. Everything else in the repo is free until read,
so this one has a budget: ~60 lines, and every line must earn its place against three tests —

  1. NON-DISCOVERABLE   — an agent cannot learn it by reading the code
  2. OPERATIONALLY SIGNIFICANT — it changes what commands get run or what code gets written
  3. NON-OBVIOUS        — it cannot be guessed from convention

Directory listings, stack descriptions, and module overviews fail all three. They are what `ls` and
a grep are for, and putting them here measurably makes agents worse, not better.

The content that belongs here is LANDMINES: the things where being wrong is SILENT — no crash, no
failing test. "`bun test` exits 0 having run nothing" is the archetype: you cannot grep for it,
because you do not know to look.

Everything else gets a POINTER, not a copy. Full rationale: @vinhnnn/dev-workflow →
docs/project-doc-standard.md §4.
-->

## What this is

<!-- Two sentences. What it does and for whom. -->

## Authoritative sources

<!-- Pointers only — never restate what these files say, or you now have two owners of one fact. -->

- **Process** — [`dev-workflow.md`](dev-workflow.md). SPEC → PLAN → BUILD → TEST → REVIEW → RELEASE.
- **Orientation** — `__project__/docs/architecture.md`. Current state, surfaces, where code lives.
- **Decisions** — `__project__/docs/decisions/`. Each ADR's own `status` is the truth.
- **Vocabulary** — `__project__/docs/glossary.md`.
- **Regulated data** — `__project__/docs/security-and-data.md`.
- **Deploy / roll back** — `__project__/docs/runbook.md`.

## Overloaded words

<!--
The 5% of the glossary that must arrive BEFORE anyone knows to look it up: words that mean something
different here than elsewhere. A wrong assumption about these is silent.
Delete this section if the project genuinely has none.
-->

- `<term>` = <what it means here>, **not** <what a reader would assume>

## Commands

```bash
# The ones a session actually runs. Not every script in package.json.
```

## Landmines

<!--
One line each, and each one should trace to a real failure — yours or someone's. If you cannot name
the mistake a line prevents, delete the line.
-->

- <the command that looks right, exits 0, and does nothing>
- <the file that must never be edited, and why>
- <the framework rule nobody would guess>

## Harness

Conventions, templates and gates ship from `@vinhnnn/dev-workflow`, not from this repo.
`.claude/templates/**` is package-managed and hash-tracked in `dev-workflow-lock.json` — do not
hand-edit; copy into `.claude/templates/local/` to own a file deliberately.

```bash
dev-workflow doctor   # can a new person run this? (env, toolchain, guard wiring)
dev-workflow check    # doc metadata gate
dev-workflow sync     # refresh managed files
```
