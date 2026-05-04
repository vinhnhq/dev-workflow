---
description: Break a spec into small verifiable tasks with acceptance criteria
---

Invoke the `agent-skills:planning-and-task-breakdown` skill.

Read the most recent `plan.md` (or the spec the user just produced).

Break the work into tasks T01..Tn:
- Each task is small enough to complete in one session
- Each task has its own acceptance criterion
- Tasks are ordered by dependency
- Use the three-bucket model: Committed / Stretch / Blocked (see `dev-workflow.md` Phase 2)

Append the breakdown to `tasks.md` in the same sprint folder. Update `__project__/tasks/README.md` master board with the new sprint section.
