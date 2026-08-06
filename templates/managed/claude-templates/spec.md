---
id: <prefix>-spec-v0-example
kind: spec
title: Short name, ≤ 60 chars
description: One sentence on what this version delivers, ≤ 160 chars, for cards and digests.
status: draft # draft | active | shipped
updated: YYYY-MM-DD
tasks: [AB.1, AB.2] # the backlog ids this spec drives — the join to the task half
---

# v0.0 — Long descriptive title is fine here

<!--
Managed by @vinhnnn/dev-workflow — `dev-workflow sync`. Copy to
.claude/templates/local/spec.md to own it.

The H1 stays as prosey as you like: `title` above is what a card shows, the H1 is what a reader
sees. They are allowed to differ, and past a certain length they must.

STATUS LIVES IN FRONTMATTER, NOT PROSE. Long "Status: ✅ Shipped (PR #47 → sha, gates, coverage…)"
paragraphs duplicate the done archive, which is the write-once owner of ship facts. Link to it
instead of restating it.

Specs freeze at intent. Never add an "as-built" section — that is the archive's job.
-->

## Goal

What this version delivers, and for whom. Two or three sentences.

## Out of scope

The things a reader will assume are included and are not. This section prevents more rework than
the Goal does.

## Stories + acceptance criteria

- **AC-1** …
- **AC-2** …

## Non-functional

Performance, a11y, i18n, security constraints that apply to the whole slice.

## Open questions

Numbered, so a decision record or a customer answer can close one by reference. A spec with open
questions is still shippable — a spec that hides them is not.
