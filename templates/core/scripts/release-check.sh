#!/usr/bin/env bash
set -e

KNOWN_FAILURES=${KNOWN_FAILURES:-0}

echo "=== Release Gate ==="

# Gate 1: Sprint status
# Only "· backlog" rows (Committed, not-started) count against release.
# "↷ stretch" and "⏸ blocked" rows are ignored by design — see the
# three-bucket model in dev-workflow.md Phase 2. Since this grep matches
# the exact string "· backlog", stretch and blocked rows are auto-excluded.
echo "Gate 1: Sprint status..."
BACKLOG_COUNT=$(grep -c "^|.*· backlog" __project__/tasks/README.md || true)
if [ "$BACKLOG_COUNT" -gt 0 ] && [ "${FORCE_PASS:-0}" != "1" ]; then
  echo "FAIL: $BACKLOG_COUNT committed tasks still · backlog"
  echo "  (demote to ↷ stretch or ⏸ blocked if they won't land this release)"
  exit 1
fi
echo "PASS"

# Gate 2: Tests
# The test command is parametrized — defaults to `bun run test` to match
# the most common stack, but any project can override:
#   TEST_CMD="pnpm test"        bash scripts/release-check.sh
#   TEST_CMD="npm test"         bash scripts/release-check.sh
#   TEST_CMD="uv run pytest"    bash scripts/release-check.sh
# Skip entirely with SKIP_TESTS=1 or FORCE_PASS=1.
if [ "${SKIP_TESTS:-0}" != "1" ] && [ "${FORCE_PASS:-0}" != "1" ]; then
  echo "Gate 2: Running tests... (${TEST_CMD:-bun run test})"
  ${TEST_CMD:-bun run test}
  echo "PASS"
else
  echo "Gate 2: SKIPPED"
fi

# Gate 3: Sync check (local dev vs origin/dev)
# In team mode, your local dev may be behind teammates' pushes. Releasing
# from a stale local clone misses their work. Fetch origin/dev and fail
# loudly if local is behind.
echo "Gate 3: Sync check (local dev vs origin/dev)..."
if ! git fetch origin dev --quiet 2>/dev/null; then
  if [ "${FORCE_PASS:-0}" != "1" ]; then
    echo "FAIL: could not fetch origin/dev (network or auth issue)"
    exit 1
  fi
  echo "WARN: could not fetch origin/dev — skipping (FORCE_PASS=1)"
else
  BEHIND=$(git rev-list HEAD..origin/dev --count 2>/dev/null || echo "0")
  if [ "$BEHIND" -gt 0 ] && [ "${FORCE_PASS:-0}" != "1" ]; then
    echo "FAIL: local dev is behind origin/dev by $BEHIND commits"
    echo "  run 'git pull origin dev' to sync, then re-run the release gate"
    exit 1
  fi
fi
echo "PASS"

# Gate 4: Git dirty check
echo "Gate 4: Git dirty check..."
if [ -n "$(git status --porcelain)" ] && [ "${FORCE_PASS:-0}" != "1" ]; then
  echo "FAIL: Working tree is dirty"
  git status --short
  exit 1
fi
echo "PASS"

# Gate 5: Commits ahead
echo "Gate 5: Commits ahead of main..."
AHEAD=$(git rev-list main..HEAD --count 2>/dev/null || echo "0")
if [ "$AHEAD" -eq 0 ]; then
  echo "WARN: No commits ahead of main"
fi
echo "Commits ahead: $AHEAD"

# Gate 6: Commit list
echo "Gate 6: Commits to merge:"
git log main..HEAD --oneline 2>/dev/null || echo "(none)"

echo ""
read -p "Type YES to proceed with opening the release PR: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Release aborted."
  exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
DATE=$(date +%Y-%m-%d)
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_LOG=$(git log main..HEAD --oneline 2>/dev/null || echo "(none)")

# Append to RELEASES.md
RELEASE_ENTRY="
## v${VERSION} — ${DATE}

- Commits ahead of main: ${AHEAD} (tip: ${COMMIT_SHA})
- Tests: passed, ${KNOWN_FAILURES} known failures
- Merge: see PR on GitHub
"
echo "$RELEASE_ENTRY" >> __project__/tasks/RELEASES.md

git add __project__/tasks/RELEASES.md
git commit -m "chore: release v${VERSION}"
git push origin dev

# Open the release PR. The merge is a deliberate human click on GitHub
# after reviewing the Vercel preview and diff — the script never merges
# to main directly. See dev-workflow.md Phase 6 for rationale.
PR_BODY="## Release v${VERSION}
${RELEASE_ENTRY}
### Commits

\`\`\`
${COMMIT_LOG}
\`\`\`

---

Opened automatically by \`scripts/release-check.sh\` after local gates passed.
Review the Vercel preview (if wired), then merge via \"Create a merge commit\"."

gh pr create \
  --base main --head dev \
  --title "release: v${VERSION}" \
  --body "$PR_BODY"

echo ""
echo "Opened release PR for v${VERSION}."
echo "Next: review the PR diff + Vercel preview, then merge via the GitHub UI."
