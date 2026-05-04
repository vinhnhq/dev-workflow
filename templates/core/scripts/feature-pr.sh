#!/usr/bin/env bash
# Open a PR from the current feature branch into `dev`.
#
# Mirrors scripts/release-check.sh in style: gates pre-flight checks,
# prompts for YES, then pushes + opens the PR. Detects sprint context
# from branch name (sprint-NN-*, feat/sprint-NN-*, etc.) and auto-links
# the sprint folder in the PR body.
#
# Commands are parametrized so any stack works:
#   LINT_CMD        default: bun lint           e.g. "pnpm lint" / "biome check ."
#   TYPECHECK_CMD   default: bunx tsc --noEmit  e.g. "pnpm tsc --noEmit"
#   TEST_CMD        default: bun run test       e.g. "pnpm test" / "uv run pytest"
#
# Skip individual gates with FORCE_PASS=1 / SKIP_TESTS=1 if needed.
set -e

echo "=== Feature → dev PR Gate ==="

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Gate 1: not on a protected branch
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "dev" ]; then
  echo "FAIL: cannot open feature PR from '$BRANCH'"
  echo "  switch to a feature branch first (git checkout -b feat/your-name)"
  exit 1
fi
echo "Branch: $BRANCH"

# Gate 2: working tree clean
echo "Gate 2: working tree clean..."
if [ -n "$(git status --porcelain)" ] && [ "${FORCE_PASS:-0}" != "1" ]; then
  echo "FAIL: working tree is dirty"
  git status --short
  exit 1
fi
echo "PASS"

# Gate 3: sync with origin/dev so the PR isn't built on a stale base
echo "Gate 3: sync with origin/dev..."
if ! git fetch origin dev --quiet 2>/dev/null; then
  if [ "${FORCE_PASS:-0}" != "1" ]; then
    echo "FAIL: could not fetch origin/dev (network or auth)"
    exit 1
  fi
  echo "WARN: could not fetch — skipping (FORCE_PASS=1)"
else
  BEHIND=$(git rev-list HEAD..origin/dev --count 2>/dev/null || echo "0")
  if [ "$BEHIND" -gt 0 ] && [ "${FORCE_PASS:-0}" != "1" ]; then
    echo "FAIL: branch is $BEHIND commits behind origin/dev"
    echo "  rebase or merge dev first: git pull --rebase origin dev"
    exit 1
  fi
fi
echo "PASS"

# Gate 4: lint
echo "Gate 4: lint... (${LINT_CMD:-bun lint})"
if [ "${FORCE_PASS:-0}" != "1" ]; then
  ${LINT_CMD:-bun lint}
fi
echo "PASS"

# Gate 5: typecheck
echo "Gate 5: typecheck... (${TYPECHECK_CMD:-bunx tsc --noEmit})"
if [ "${FORCE_PASS:-0}" != "1" ]; then
  ${TYPECHECK_CMD:-bunx tsc --noEmit}
fi
echo "PASS"

# Gate 6: tests
echo "Gate 6: tests... (${TEST_CMD:-bun run test})"
if [ "${SKIP_TESTS:-0}" != "1" ] && [ "${FORCE_PASS:-0}" != "1" ]; then
  ${TEST_CMD:-bun run test}
  echo "PASS"
else
  echo "SKIPPED"
fi

# Gate 7: commits ahead of dev
AHEAD=$(git rev-list origin/dev..HEAD --count 2>/dev/null || echo "0")
if [ "$AHEAD" -eq 0 ] && [ "${FORCE_PASS:-0}" != "1" ]; then
  echo "FAIL: no commits ahead of origin/dev — nothing to PR"
  exit 1
fi
echo "Gate 7: commits ahead of dev: $AHEAD"

echo ""
echo "Commits to include in PR:"
git log origin/dev..HEAD --oneline
echo ""

read -p "Type YES to push and open PR: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

# Push the branch (idempotent; tracks origin)
git push -u origin "$BRANCH" 2>&1 | tail -3

# Detect sprint context from branch name patterns:
#   sprint-NN-*, spike/sprint-NN-*, feat/sprint-NN-*, fix/sprint-NN-*
SPRINT_LINK=""
if [[ "$BRANCH" =~ sprint-([0-9]+)-([a-z0-9-]+) ]]; then
  SPRINT_NUM="${BASH_REMATCH[1]}"
  SPRINT_SLUG="${BASH_REMATCH[2]}"
  SPRINT_DIR="__project__/tasks/sprint-${SPRINT_NUM}-${SPRINT_SLUG}"
  if [ -d "$SPRINT_DIR" ]; then
    SPRINT_LINK="**Sprint:** [\`${SPRINT_DIR}/\`](${SPRINT_DIR}/) — plan, tasks, retro"$'\n\n'
  fi
fi

# PR title = last commit subject (Conventional Commits compatible)
TITLE=$(git log -1 --format=%s)
COMMIT_LOG=$(git log origin/dev..HEAD --oneline)

PR_BODY="## Summary

${AHEAD} commit$([ "$AHEAD" -gt 1 ] && echo "s") on \`${BRANCH}\` ready for review against \`dev\`.

${SPRINT_LINK}### Commits

\`\`\`
${COMMIT_LOG}
\`\`\`

## Test plan

- [ ] CI green (lint + typecheck + tests)
- [ ] Real-device or preview verification (if applicable)
- [ ] Code review (\`/review\`) before promoting \`dev → main\`

## Merge strategy

**Squash and merge** — collapses all branch commits into one logical point on \`dev\`. Iteration commits (fixes, formatting passes, etc.) shouldn't pollute the dev history. The squash commit should keep this PR's title.

---

Opened automatically by \`scripts/feature-pr.sh\`."

gh pr create \
  --base dev --head "$BRANCH" \
  --title "$TITLE" \
  --body "$PR_BODY"

echo ""
echo "PR opened against dev."
echo "Next: wait for CI, verify the preview, request review."
