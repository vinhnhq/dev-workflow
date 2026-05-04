---
description: Reduce complexity without changing behavior
---

Invoke the `agent-skills:code-simplification` skill.

For the given code or recently-changed files:

1. Identify abstractions that aren't earning their complexity
2. Identify duplicated logic that could collapse
3. Identify error-handling for impossible scenarios
4. Identify dead code, unused exports, premature configurability

Propose changes that reduce LOC and improve readability **without changing behavior**. All existing tests must still pass.

Touch only what's clearly worth simplifying. Don't refactor adjacent code orthogonal to the simplification.
