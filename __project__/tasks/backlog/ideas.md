# Ideas Backlog

Drop zone for ad-hoc ideas that come up during discussions, client calls, or while working on something else. Most will never get picked up — that's fine. The purpose is to get them out of your head so you can focus on current work.

Entry format (keep each entry tight):

```
## <Short title>
**Source:** <when/where it came up>
**Idea:** <1-3 sentences — what and why>
**Effort guess:** <small / medium / large>
**Move to:** <which sprint or backlog if promoted, or "drop" if rejected>
```

Review cadence: scan this file at the start of every sprint. For each entry: promote, leave parked, or delete. If it's been parked for 3+ sprints untouched, delete by default — it will resurface if it still matters.

---

## Entries

## Dogfood release-check.sh + protect main

**Source:** 2026-05-04, end of Sprint 02 — v1.1.0 release flow exposed the gap.
**Idea:** The dev-workflow repo doesn't have its own `scripts/release-check.sh` or `scripts/feature-pr.sh` — it ships them as templates but doesn't use them itself. The v1.1.0 release was promoted via a local merge + direct push to `main`, which technically violates the "Never push to main directly" rule the workflow ships. Two parts to close the gap:

1. Add `scripts/release-check.sh` and `scripts/feature-pr.sh` to the repo's root (use the parametrized versions we just shipped, with `TEST_CMD="node --test tests/*.test.mjs"` baked in)
2. Enable GitHub branch protection on `main` so direct pushes are physically rejected (require PR + status checks + linear history)

After this, future releases must go through the same flow we tell consumers to use. Cleaner story when someone reads the repo.

**Effort guess:** small (~30 min — copy two scripts + one GitHub setting click)
**Move to:** Sprint 03 (the dogfooding sprint)

---

## Convert dev-workflow repo to its own first consumer

**Source:** 2026-05-04, follow-on to the dogfood ticket above.
**Idea:** Beyond just the scripts, run `bunx @vinhnnn/dev-workflow upgrade` against the repo itself to see what drift it has from the templates it ships. Likely findings: missing `.claude/commands/`, missing `CLAUDE.md`, missing `skills-lock.json` at the repo's own root. Either populate them (full dogfood) or document the deliberate divergence (this repo is the *source*, not a *consumer*, of those files).

**Effort guess:** small (~20 min to run, decide, document or apply)
**Move to:** Sprint 03 (alongside the dogfood ticket)

---

_(append new entries below this line)_
