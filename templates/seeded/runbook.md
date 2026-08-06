---
id: <prefix>-doc-runbook
kind: doc
title: Runbook — deploy, migrate, roll back
description: How this project reaches production and how to undo it, written for someone who has never done it.
status: active
updated: YYYY-MM-DD
---

<!--
Managed by @vinhnnn/dev-workflow — `dev-workflow sync`. Copy to
.claude/templates/local/runbook.md to own it.

Template for `__project__/docs/runbook.md`.

WHY THIS EXISTS: deploy and rollback procedures live in one person's head by
default, and that is invisible until the day that person is asleep. It is intent
debt with a pager attached — an agent can restore lost comprehension by reading
code, but it cannot reconstruct "we always drain the queue first" from anything.

Fill it in even where the answer is embarrassing ("nobody has tested rollback").
A runbook that admits a gap is useful; one that implies a procedure exists when
it does not is worse than none.
-->

# Runbook

> Written for the person who has **not** done this before, at the hour when it matters. Prefer exact
> commands over description. If a step needs judgement, say who to ask.

## Who can do what

| Action                      | Who    | Needs                 |
| --------------------------- | ------ | --------------------- |
| Merge to the default branch | anyone | green CI + one review |
| Deploy to production        | —      | —                     |
| Run a production migration  | —      | —                     |
| Roll back                   | —      | —                     |
| Rotate a secret             | —      | —                     |

## Deploy

```bash
# exact commands
```

**How you know it worked:** …
**How long it takes:** …

## Migrations

Schema changes are the step that is hardest to undo, so they get their own section.

```bash
# apply
```

- **Is it reversible?** …
- **Does the app tolerate the old schema while deploying?** If not, the migration and the deploy
  cannot be a single step — say so here.
- **Pending, not yet applied:** …

## Roll back

```bash
# exact commands
```

**Last tested:** _(a rollback nobody has ever run is a hypothesis, not a procedure)_

## When something is broken

1. **Stop the bleeding** — roll back or disable the feature before diagnosing.
2. **Capture evidence** — logs, the failing request, the deploy that preceded it. It disappears.
3. **Then** diagnose.

| Symptom | Likely cause | First check |
| ------- | ------------ | ----------- |
|         |              |             |

## Secrets

Where each lives, who can rotate it, and what breaks during rotation. **Never the values.**

| Secret | Lives in | Rotating it breaks |
| ------ | -------- | ------------------ |
|        |          |                    |

## Known manual steps

Anything production needs that no pipeline does. These are the steps that get forgotten, so they
are written here rather than only in a ship note.

- [ ] …
