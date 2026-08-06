---
id: <prefix>-doc-architecture
kind: doc
title: Architecture & orientation
description: First doc to read — what this is, where it stands, and where the code lives.
status: active
updated: YYYY-MM-DD
---

# Architecture

<!--
SEEDED — yours to own; `sync` never overwrites this file.

The first doc anyone (or any agent) reads. Two rules that keep it useful:

  ONE current-state block, REWRITTEN each time — never a status trail. History belongs in the done
  archive; a doc that accumulates status becomes a doc nobody trusts to be current.

  Point, do not restate. Ship facts live in the done archive, decisions live in ADRs. Repeating them
  here creates a second owner, and the second owner is always the stale one.
-->

## What this is

<!-- Two or three sentences. The problem, for whom, and the shape of the solution. -->

## Current state (YYYY-MM-DD)

<!-- Rewritten, not appended. What is shipped, what is in flight, what is next, what is blocked. -->

- **Shipped:**
- **In flight:**
- **Next:**
- **Open decisions:**

## Surfaces

| Surface | State | What it does |
| ------- | ----- | ------------ |
|         |       |              |

## Stack

<!-- One line. The version table belongs in the ADR that locked it. -->

## Data model

<!-- The three-to-five types someone must hold in their head, and the one non-obvious thing about them. -->

## Where things live

```
src/
```

<!-- Say what is PURE and what does I/O — that boundary is what makes the code testable, and it is
     the thing a newcomer gets wrong first. -->
