---
description: Five-axis code review — correctness, readability, architecture, security, performance
---

Invoke the `agent-skills:code-review-and-quality` skill.

Review the diff (vs. base branch) across five axes:

1. **Correctness** — does it do what the spec says? Edge cases handled?
2. **Readability** — would a future engineer understand this in 30 seconds?
3. **Architecture** — does it fit existing patterns? Right boundaries?
4. **Security** — input validation, auth, no secrets committed
5. **Performance** — any obvious N+1, unbounded loops, sync work where async fits?

Produce findings as: Critical / Important / Suggestion. Critical and Important must be fixed before merge.
