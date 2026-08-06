<!-- Managed by @vinhnnn/dev-workflow. Re-synced by `dev-workflow sync`; local edits are
     detected via dev-workflow-lock.json. To own a file, copy it into
     .claude/templates/local/ — that copy wins and is never touched. -->

# Templates — the metadata contract

## Why these live in `.claude/`, not next to the docs they produce

The dashboard walks your doc root and turns every `.md` into a document. A template placed in
`docs/decisions/` would show up as a fake ADR between the real ones, with placeholder frontmatter
polluting the id namespace. Dotfile directories are skipped, so `.claude/templates/` is excluded for
free — no parser change, no exclusion list.

Discoverability is solved with a **pointer**, not a copy: each folder's `README.md` (already ignored
as folder chrome) links here. One owner for the template, a signpost where the work happens.

These are also **tool inputs** — the generator reads them. If you find yourself copy-pasting one,
that's a missing command, not a missing habit.

## The contract

| Artifact         | Template            | Owner of its metadata                 |
| ---------------- | ------------------- | ------------------------------------- |
| Doc / spec / ADR | `spec.md`, `adr.md` | YAML frontmatter                      |
| Task             | `task.md`           | The backlog block grammar             |
| Ship fact        | `done-entry.md`     | The done archive, write-once          |
| Lifecycle        | `ticket-event.json` | Append-only event files, never edited |

### Frontmatter, every `.md` under the doc root

```yaml
---
id: <prefix>-<kind>-<slug> # prefix comes from project.yml `conventions.idPrefix`
kind: adr | spec | doc | retro | tasks
title: ≤ 60 chars # short. NOT the H1 — the H1 can stay long and prosey
description: ≤ 160 chars # one sentence, what this is, for a card or a digest
status: draft | active | shipped | superseded | deferred
updated: YYYY-MM-DD
---
```

Per-project exemptions (vendored or read-only material) go in `project.yml`:

```yaml
conventions:
  idPrefix: io
  exempt: [reference/**]
```

### The three rules that generate everything else

1. **One owner per fact.** Frontmatter owns machine-readable fields; prose owns rationale. If both
   carry status, one of them is already lying.
2. **Derived, never typed.** Readiness, stage and status are computed from field presence and PR
   state. A hand-maintained status is wrong within a day of a second person joining.
3. **Bold means id.** On a task line, `**...**` is the id and nothing else; the title is plain text
   after it. Where the same slot means both, most task lines silently stop parsing.

## Adoption order

1. `dev-workflow check` — see the gap (reports, exits 0).
2. Backfill docs and task ids.
3. Flip CI to `dev-workflow check --strict`.
4. Only then build the generator, so the convention arrives through a tool rather than a document.
