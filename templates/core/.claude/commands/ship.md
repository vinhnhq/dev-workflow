---
description: Run the pre-launch checklist and ship to production
---

Invoke the `agent-skills:shipping-and-launch` skill.

Run the release process per `dev-workflow.md` Phase 6:

1. Quality gates — lint, typecheck, full test suite (the project's `${LINT_CMD}` / `${TYPECHECK_CMD}` / `${TEST_CMD}` if customized)
2. Pre-launch checklist — no console.logs, no TODOs in changed files, no secrets, ADR written if architecture changed
3. Code review — `/review`; fix Critical + Important findings
4. Run `scripts/release-check.sh` — opens release PR `dev` → `main`
5. Review the PR diff + preview URL on GitHub
6. Human merges via "Create a merge commit"

Never push to `main` directly. Never auto-merge.
