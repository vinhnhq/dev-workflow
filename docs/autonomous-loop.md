# The autonomous loop — session contract, exit protocol, driver

**Status: designed, not built.** Nothing in this document ships yet. It exists because the design
survives only here — everything else in this package can be reconstructed from a diff, and this
cannot.

_Written 2026-08-06._

---

## 1. The one rule everything else follows from

> **A session must never decide to continue itself.**

A session that keeps going fills its context, and a full context degrades in a specific and dangerous
order: it stops verifying, starts inventing, and reports success. The failure is not that it stops —
it is that it _claims to be done at 30%_ and sounds confident doing it.

So:

> One session = one increment. It writes durable state and **exits**. Something outside starts the
> next one, with a clean context.

Continuity lives in artifacts, never in the conversation. That is the same rule as
`docs/project-doc-standard.md` §4, applied to time instead of to documents.

## 2. Three loops, routinely conflated

| Loop                                     | Where it runs                | Context              | Right for                                              |
| ---------------------------------------- | ---------------------------- | -------------------- | ------------------------------------------------------ |
| The agent's own perceive → act → observe | inside one turn              | —                    | not yours to design                                    |
| **`/loop`, scheduled wake-ups**          | same session, repeated turns | **accumulates**      | polling, watching CI, "did anything become unblocked?" |
| **The driver**                           | a new process per iteration  | **fresh every time** | working a backlog to completion                        |

`/loop` deliberately keeps the conversation warm — excellent for watching something, wrong for
long work, because the context that made iteration 5 unreliable is still there in iteration 6.

**`/loop` may _trigger_ the driver. It must not _be_ the driver.**

## 3. The session contract — `/work-task <id>`

One skill, defining exactly what one session does:

1. **Claim** the ticket. Refuse if it is already claimed, blocked, above the actor's tier ceiling, or
   has no machine-checkable oracle.
2. **Read the handoff** if resuming (§5). Do not re-derive what a previous session established.
3. **One smallest verifiable increment** — not the whole ticket.
4. **Run the oracle.** This is the termination condition. A ticket without one cannot be worked
   unattended, full stop.
5. **Commit at green.** Small, never amend. Context is lossy; commits are not.
6. **Write the handoff**, then **exit with a code** (§4).

Everything already in the harness plugs in here: `Touches` bounds the diff, the PreToolUse guard
blocks the footguns, `dev-workflow check` and the test suite are the gates.

## 4. The exit protocol

The whole interface between the body and the loop is one integer:

```
exit 0    ticket done, oracle passed          → driver marks it, takes the next task
exit 10   progress made, more remains         → driver reruns the SAME task, fresh session
exit 20   blocked / escalate — a human is needed → driver marks blocked, moves on
exit 30   budget or wall-clock exhausted      → driver stops everything
```

This is what lets the driver be genuinely stupid — no output parsing, no judgement:

```bash
while task=$(dev-workflow next-task --tier=dark --unblocked); do
  for attempt in 1 2 3; do          # bounded: a stuck ticket must not loop forever
    claude -p "/work-task $task"
    case $? in
      0)  break ;;                   # done
      10) continue ;;                # fresh session, same task
      *)  break 2 ;;                 # blocked, or fatal
    esac
  done
done
```

**`exit 10` is a judgement the agent makes about its own progress, and agents are optimistic.** Bound
it — three sessions per ticket, then escalate regardless of what the agent claims.

## 5. The handoff file

Not a summary. Summarisation degrades over long runs; a **structured reset** does not — the harness
tears the session down and rebuilds from this, the way a new teammate is onboarded rather than told
a story.

`.claude/state/<ticket-id>.json`:

```json
{
  "ticket": "RK.1",
  "done": ["rank.ts: between() implemented, property test green"],
  "next": "after()/before() — same property-test shape",
  "decisions": ["ranks are strings compared lexicographically (ADR-0002)"],
  "failed": ["numeric midpoints — precision loss at depth 12"],
  "oracle": "bun run test",
  "sessions": 2
}
```

**`failed` is the field people skip and the one that pays.** Without it, session 3 cheerfully retries
what session 2 already disproved, and the loop burns budget rediscovering a dead end.

## 6. Admission — what the driver is allowed to pick

```
ready  ∧  tier ∈ {trivial, dark}  ∧  has a machine-checkable oracle
       ∧  not blocked  ∧  no open PR  ∧  blockers released
```

Not "the next unchecked box." Each clause removes a specific failure:

| Clause            | Prevents                                      |
| ----------------- | --------------------------------------------- |
| tier ceiling      | an agent rewriting the payments path at 3am   |
| oracle exists     | a loop that cannot terminate                  |
| not blocked       | work on a ticket waiting for a human decision |
| no open PR        | duplicate work across restarts                |
| blockers released | building on an unmerged branch                |

**Tier belongs in the token, not the prompt.** A tier written only in a document is advisory, and
advisory controls fail exactly when they are needed.

## 7. Bounds — every one of these is required

| Bound                     | Why                                                           |
| ------------------------- | ------------------------------------------------------------- |
| max 3 sessions per ticket | `exit 10` is self-assessed and optimistic                     |
| wall-clock per session    | a stuck agent is indistinguishable from a slow one            |
| budget ceiling            | a runaway loop is discovered at the monthly bill otherwise    |
| WIP cap                   | **your review is the constraint, not the agent's throughput** |
| lease TTL                 | a crashed session must not hold a ticket forever              |

The WIP cap is the one people drop. An overnight run can produce ten PRs; a person can meaningfully
review perhaps three. Past that you rubber-stamp, which is worse than not running the loop at all.
**An idle robot is correct behaviour.**

## 8. What cannot be automated, and must not be attempted

Tickets whose answer exists only in a human's head — a glossary's overloaded terms, a runbook's
deploy path, a product decision. An agent handed one of these does not fail loudly; it produces
confident, plausible fiction, in exactly the documents that exist to prevent confident, plausible
fiction.

That is what the `[S]` supervised tier is for. **The tier field is the admission filter, not a label.**

## 9. Build order

1. **`/work-task` skill** — the session contract. Everything else is useless without it.
2. **Handoff read/write** — two helpers, ~50 lines.
3. **`dev-workflow next-task`** — reads the queue, applies §6, prints one id.
4. **The driver** — the shell loop above; launchd or CI later.

Steps 1–2 are worth doing **even if the loop is never built**: they make an ordinary human session
resumable, which is the thing that hurts today when a long session compacts.

## 10. Before any of it

A loop's termination condition is its gates. If `lint` or the test suite is broken, every Oracle that
says "gates green" is unverifiable and the loop cannot know it is done. **Fix the gates first** — a
loop over a broken gate is a machine for generating confident, unverified work.
