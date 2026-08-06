---
id: <prefix>-adr-0000
kind: adr
title: Short decision name, ≤ 60 chars
description: One sentence stating the decision itself, not the topic, ≤ 160 chars.
status: proposed # proposed | accepted | deferred | superseded
updated: YYYY-MM-DD
deciders: []
supersedes: [] # ids, e.g. [<prefix>-adr-0011]
extends: []
---

# ADR-0000 — Full decision title

<!--
Managed by @vinhnnn/dev-workflow — `dev-workflow sync`. Copy to
.claude/templates/local/adr.md to own it.

`description` states the DECISION, not the subject. "Debate visibility" names a topic;
"Conversation-born debates are private to the owning project's creator and capital investors" is a
decision someone can act on without opening the file.

If your ADRs already carry a prose Status/Date/Deciders bullet block, pick ONE owner — frontmatter
or the bullets, never both. Two owners for one fact means one of them is stale and you cannot tell
which by looking.
-->

## Context

The forces at play. What is true today that makes this decision necessary. Cite `file:line`, a
measurement, or a source doc — a context section with no evidence is an opinion section.

## Decision

The thing we are doing, stated so a reader can act on it without reading the rest.

## Consequences

**Accepted:** what gets worse, and why that is the right trade.
**Enabled:** what becomes possible that was not.
**Revisit when:** the concrete signal that should reopen this — not "if it becomes a problem".

## Alternatives considered

One paragraph each, with the reason it lost. Future-you re-proposes these; this section is what
stops the re-litigation.
