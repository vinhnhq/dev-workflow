<!--
Managed by @vinhnnn/dev-workflow — `dev-workflow sync`. Copy to
.claude/templates/local/task.md to own it.

Template: one backlog task. Matches the shared grammar (@vinhnnn/dev-workflow/lib/grammar.mjs)
exactly, so a task written this way is machine-readable the moment it lands.

Marker (exactly ONE, never a checkbox AND a glyph):
  [ ] todo   ·   → in-progress   ·   ⏸ blocked   ·   ↷ stretch   ·   [x] done

Id charset: [A-Za-z0-9_.] — no hyphens. A hyphenated id parses as no id at all, which means the
task is invisible to the queue rather than rejected by it.
-->

- [ ] **AB.1.2** Short imperative title
  - **Stage:** ready · **Autonomy:** [P] · **Owner:** —
  - **Intent:** Why this is worth doing, in one or two sentences. The one field a newcomer cannot
    infer from the code.
  - **Touches:** `src/path/to/file.ts` · `src/db/migrations/NNN` **Must NOT:** the thing an
    over-eager implementer would break
  - **Oracle:** the command or assertion that proves it done — `bun run test:integration` green
  - **Evidence:** `spec.md` §section · `file.ts:31`
  - **Escalate if:** the precondition that means "stop and ask" rather than "push through"

<!--
FIELD NOTES

Stage      idea → specd → ready → building → review → done.
           Derived where possible (an open PR means `review`); typed only when nothing can infer it.

Autonomy   [S] supervised · [P] plan-gated · [D] dark · [T] trivial.
           Doubles as the newcomer ramp: week 1 is [T] only. A section header can set the default
           for every task beneath it.

Owner      Meaningless solo, essential at 4+. Add it from the start so you don't touch every
           ticket later.

Intent     WHY, not what.

Touches /  The blast radius, declared BEFORE work starts. Binding: a diff outside `Touches` aborts
Must NOT   an unattended run rather than asking forgiveness. Also how two people avoid editing the
           same files without discovering it at rebase time.

Oracle     How "done" is proven. MUST be machine-checkable to be eligible for unattended work —
           "when measured" reads as complete, but no agent can ever terminate on it.

Evidence   ≥ 2 pointable refs (file:line · ADR · test · doc). Readiness is DERIVED from these being
           present; nobody sets `ready` by hand.

Escalate   The stop condition. When it fires, an agent comments and drops its claim — it never
if         decides to push through.
-->
