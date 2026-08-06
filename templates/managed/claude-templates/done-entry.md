<!--
Managed by @vinhnnn/dev-workflow — `dev-workflow sync`. Copy to
.claude/templates/local/done-entry.md to own it.

Template: one entry in the done archive. Newest at TOP. This file is the write-once owner of ship
facts — PR, SHA, migrations, gates, features. Backlog, retro, architecture and specs point here
rather than restating.

Written AFTER merge, because the squash SHA does not exist before it. Ideally written by CI from
the merge event rather than by hand: "newest at top" means every concurrent PR touches the same
line, which is the single worst merge-conflict point once more than one person is shipping.

`Closes:` is the join back to task ids. It is what answers "which PR shipped AB.1.2?" without grep
archaeology.
-->

2026-01-31 · `abc1234` · **PR #99 — Short headline of what shipped.** One paragraph, ≤ ~10 lines:
what changed, the migrations, the notable decisions, anything deferred and where it went.
**Closes:** AB.1.1, AB.1.2. **Deferred →** AB.2. **Gates:** N unit + N integration + build + lint
green; coverage a/b/c/d.

<!--
CONVENTIONS

- One entry per shipped PR. Not per commit, not per task.
- Partition by year or version once this file passes ~300 lines.
- Prod follow-ups a human must run (migrations against prod, env vars on the host) go here in bold
  with ⚠ — they are ship facts too, and the ones most often forgotten.
- Never amend a done entry to add a SHA. Follow-up commit, or batch at sprint close.
-->
