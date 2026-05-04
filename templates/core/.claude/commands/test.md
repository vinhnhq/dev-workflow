---
description: TDD — write a failing test first, then implement to pass
---

Invoke the `agent-skills:test-driven-development` skill.

Use this when adding new behavior or fixing a bug:

1. Write a test that captures the expected behavior (or reproduces the bug)
2. Run it — confirm it fails for the right reason
3. Implement the minimum code to make it pass
4. Run the full suite — confirm no regressions
5. Refactor if needed; tests stay green

For bugs, the failing test is the first artifact. Do not fix until the test is in place.
