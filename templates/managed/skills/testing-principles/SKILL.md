---
name: testing-principles
description: How to write, size, structure and prune tests — choosing between unit, integration and E2E, preferring fewer longer workflow-style tests, what not to test, treating console output as part of the test contract, and running deletion passes on a bloated suite. Use when writing a test, deciding which flavour it should be, reviewing a test-heavy diff, or when a suite has grown faster than anyone reads it.
---

<!--
Managed by @vinhnnn/dev-workflow — `dev-workflow sync`. Copy to `.claude/templates/local/` to own it.

A SKILL, not always-loaded context: this matters when writing or pruning tests and is noise the rest
of the time. The DESCRIPTION above is the retrieval index — an agent selects this skill by reading
it, so vagueness there means it is never chosen and nothing reports the miss.
See docs/project-doc-standard.md §5.

Distilled from practice that has survived contact with agent-written test suites, where the failure
mode is not too few tests but too many low-signal ones.
-->

# Testing principles

## Choose the flavour first

| Flavour         | Best for                                                       | Avoid for                                   |
| --------------- | -------------------------------------------------------------- | ------------------------------------------- |
| **Unit**        | Pure logic, deciders, derivers, parsers — anything with no I/O | Anything needing a real database or browser |
| **Integration** | Repository and route-handler behaviour against a real database | Pure logic (a unit test proves it faster)   |
| **E2E**         | User-critical happy paths, driven like a real customer         | Edge cases a faster test can cover          |

An edge case tested through the browser is an edge case you will delete in six months because it is
slow and flaky. Push it down a level.

## Fewer, longer tests

Prefer one test that walks a workflow — setup once, then several related actions and assertions —
over many tiny tests that each re-establish the same context. Read them as a manual tester's script.

**Assert intermediate states inside the workflow that produced them**, not in separate cases that
have to rebuild the world first.

## What not to test

- **Anything the type system already guarantees.** With branded types and schema validation at the
  boundary, a test that a function rejects a `string` where a `UserId` is required tests the compiler.
- **Regression tests for bugs unlikely to recur.** A test earns its permanent maintenance cost by
  protecting behaviour that could plausibly break again — not by commemorating a bug.
- **Incidental copy** — hints, descriptions, warning text — unless the wording is the behaviour.
- **Thin passthroughs** already covered by the test of what they call.

## Structure

- Flat files with top-level `test(...)`; avoid deep `describe` nesting.
- **Inline setup per test.** `beforeEach` hides dependencies and makes a test unreadable in isolation.
- Factory functions returning ready-to-use objects beat shared mutable fixtures.
- No shared mutable state between cases.

## Console output is part of the contract

**Unexpected `console.error` / `console.warn` should fail the test.** Without this, warnings
accumulate invisibly and a suite that "passes" is emitting a hundred lines of noise nobody reads —
and an agent can silence a real problem with a log line and a green run.

Where logging _is_ the behaviour under test, assert on it explicitly. Where it is incidental, silence
it by name, so the silencing is visible in the test.

## Offline by default

Unit tests must pass with no network and no credentials. A test that quietly skips when a key is
absent is worse than one that fails — CI stays green while covering nothing.

## Pruning is maintenance

A test suite is code, and nobody has ever read 1,200 tests. **Schedule deletion passes**: duplicate
coverage, dead regression tests, and assertions on constants all cost review time forever and catch
nothing.

Coverage percentage rewards adding a test and never rewards deleting one — so pruning needs a
deliberate pass against these principles, not a metric.
