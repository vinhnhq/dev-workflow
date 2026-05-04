# Learnings — append on the fly

A continuous-improvement journal. Add entries the moment something surprises you (good or bad). Keep each entry tight — 1-3 sentences plus a **Promote?** verdict.

## Format

```
## YYYY-MM-DD · <short, specific title>

<1-3 sentences: what happened, what you learned. Concrete, not abstract.>

**Promote?** <yes / no / later> — <where it should go: ADR, dev-workflow.md, CLAUDE.md, code, or "drop">
```

## Promotion rules (review at start of every sprint)

| If an entry is | Action |
|----------------|--------|
| Marked **Promote? yes** + target exists | Apply it; mark entry **✓ promoted** with link |
| Marked **Promote? yes** but no target yet | Open ADR or doc draft; link from the entry |
| Marked **Promote? no** + >90 days old | Delete |
| Same lesson recurs 3+ times | Force promote — convention is missing |
| Marked **Promote? later** + no movement after 3 sprints | Delete by default |

The file is a buffer, not a destination. Without these rules it becomes a graveyard.

---

## Entries

_(empty — add entries below this line)_
