---
description: Implement the next task incrementally — build, test, verify, commit
---

Invoke `agent-skills:incremental-implementation` alongside `agent-skills:test-driven-development`.

Pick the next pending task from `tasks.md`. For each task:

1. Read its acceptance criterion
2. Load relevant context (existing code, types, patterns)
3. Write a failing test (RED)
4. Implement the minimum to pass (GREEN)
5. Run the full test suite — no regressions
6. Run the build — no errors
7. Commit atomically (one semantic type per commit)
8. Tick the box in `tasks.md`

If any step fails, follow `agent-skills:debugging-and-error-recovery`.
