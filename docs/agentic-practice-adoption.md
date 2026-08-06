# Agentic practice — adoption pick-list

**What this is.** A synthesis of Addy Osmani's 26 agentic-engineering posts + the Google/Kaggle
_New SDLC With Vibe Coding_ whitepaper, scored against what this package and its consumer projects
already do, and turned into a list you can pick from.

**How to use it.** §4 is the pick-list, written in this package's own backlog grammar — an item you
want moves verbatim into a backlog. §5 is the team curriculum. §6 is what was considered and
rejected, so it does not get re-proposed.

Not shipped to npm (`docs/` is outside `files` in package.json). This is a working document.

_Compiled 2026-08-02._

---

## 1. The spine — six ideas that carry the rest

Teach these six and you have ~90% of the value without handing anyone 27 links.

1. **`Agent = Model + Harness`, roughly 10/90.** Most agent failures are _configuration_ failures,
   so the harness — rule files, tools, sandboxes, hooks, observability — is the engineering surface.
2. **Verification is the bottleneck, not generation.** Autonomy can only expand to the limit of
   verification capacity. Everything else follows from this one.
3. **Three debts, not one.** _Technical_ debt lives in the code; _comprehension_ debt lives in your
   head; _intent_ debt lives in nobody's head. Agents pay down the first, worsen the second, and
   cannot create the third — intent is the one input that must come from a human.
4. **Autonomy is a per-task setting, not a rank.** Chosen by reversibility and detection latency,
   not by how clever the model is.
5. **Agents own the inner loop; engineers own the outer loop.** Quality, answerability,
   accountability. Only people inherit consequences.
6. **The human is single-threaded.** Amdahl's law applies to attention: throughput equals review
   capacity, not agent count.

---

## 2. Already built (do not re-derive)

Shipped or drafted before this document existed, so a future session starts from here:

| Capability                                                                         | Where                                                     |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Six-phase process (SPEC→PLAN→BUILD→TEST→REVIEW→RELEASE)                            | `templates/dev-workflow.md`                               |
| Doc metadata contract (id · kind · title · description)                            | `templates/managed/claude-templates/README.md`            |
| Task grammar + DoR (Intent · Touches · Must NOT · Oracle · Evidence · Escalate if) | `templates/managed/claude-templates/task.md`              |
| One shared grammar for every backlog reader                                        | `lib/grammar.mjs`                                         |
| Metadata gate with teaching errors                                                 | `lib/check.mjs` → `dev-workflow check`                    |
| Three distribution tiers (seed · managed · library) + hash lock                    | `lib/sync.mjs` → `dev-workflow sync`                      |
| Autonomy tiers `[S]/[P]/[D]/[T]`                                                   | task template                                             |
| Lifecycle events derived from git/GitHub, one file per event                       | `templates/managed/workflows/ticket-events.yml`           |
| Eval rubric for non-deterministic features                                         | `infinite-oneness/evals/` (candidate for extraction)      |
| Ship ritual + tier-scaled QA subagent                                              | `infinite-oneness/.claude/skills/ship-review/`            |
| **Day-1 readiness check** (env, toolchain, guard wiring; never prints a value)     | `lib/doctor.mjs` → `dev-workflow doctor`                  |
| **PreToolUse guards** — documented rules become blocked actions                    | `lib/guards.mjs` + `lib/guard.mjs` → `dev-workflow guard` |
| Harness config (env manifest + guard rules), JSON for exactness                    | `.claude/harness.json` — `lib/harness-config.mjs`         |
| Runbook template (deploy · migrate · roll back · who-can-do-what)                  | `templates/managed/claude-templates/runbook.md`           |
| Formatter across the package + payload templates                                   | `.oxfmtrc.json`; `lint` runs `oxfmt --check`              |

**Where tickets now live.** As of 2026-08-05 tickets are owned by Groundwork's database, not
`backlog.md` (groundwork ADR-0010/0011/0012). Consequences for this package: the backlog **grammar
becomes a migration tool** — used once to import an existing repo, never a standing gate — and a new
project never creates a `backlog.md` at all. `dev-workflow check`'s frontmatter half is unaffected;
docs stay in the repo, which is the whole point of the split.

---

## 3. Scorecard against the literature

| Practice                                                | State     | Note                                                        |
| ------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| Harness as a shared, versioned team asset               | **ahead** | The literature recommends it; this package distributes it   |
| Intent-debt paydown (ADRs, specs, write-once docs)      | **ahead** | The debt agents cannot fix — strongest area                 |
| Specification quality as the bottleneck                 | **ahead** | DoR is stricter than the whitepaper's "good spec" checklist |
| Tests **and** evals                                     | have      | Evals added 2026-08-01; search baseline 0.883               |
| Skills with progressive disclosure                      | have      | Skill packs + ship-review                                   |
| Autonomy per task                                       | have      | Missing the selection _criteria_ — see AP.1                 |
| AI first-pass review                                    | have      | Single reviewer only — see AP.11                            |
| External memory over conversational recall              | have      | Missing structured checkpoints — see AP.5                   |
| Backpressure (WIP cap = review capacity)                | have      | Designed, not yet enforced                                  |
| **PR sizing**                                           | **gap**   | Largest divergence; see AP.17                               |
| **Comprehension-debt instrument**                       | **gap**   | Nothing measures it; every other metric looks fine          |
| **Ratchet ritual** (failure → rule → check)             | **gap**   | Mechanism exists, ritual does not                           |
| **Anti-rationalization tables**                         | **gap**   | Skills have steps, no excuse table                          |
| Rule-file discipline (non-discoverable only, ~60 lines) | partial   | Much qualifies as landmines; some is discoverable           |

---

## 4. Pick-list

Backlog grammar, ready to move. Autonomy in brackets, effort as S/M/L.

### Templates — the managed tier

- [ ] **AP.1** Add `Reversibility` and `Detection` to the task template **[T]** _S_
  - **Intent:** Tier is assigned by gut feel today. The literature's criteria are mechanical — how
    fast will we know it went wrong, and how cleanly can we undo it — and those two questions decide
    the tier more reliably than a judgment call does.
  - **Oracle:** the task template carries both fields; the tier section explains how they select S/P/D/T.
- [ ] **AP.2** New `skill.md` template with a mandatory anti-rationalization table **[P]** _M_
  - **Intent:** "The senior-engineering work is exactly what an agent will skip unless you make it
    impossible to skip." A table of excuse → rebuttal pre-empts the plausible shortcut, for agents
    and for tired humans alike.
  - **Oracle:** template exists, synced, and ship-review carries a populated table.
- [ ] **AP.3** PR-contract template — intent · proof · risk tier · **what the AI wrote** · reviewer focus **[T]** _S_
  - **Intent:** Reviewers of agent output are the first humans to see the code and must reconstruct
    missing intent. Declaring it upstream moves that cost to the author.
- [ ] **AP.4** `wrong-log.md` template **[T]** _S_
  - **Intent:** One line every time an agent was plausible and wrong. Cheapest artifact in this
    document; feeds the ratchet, the curriculum, and the rule files.
- [ ] **AP.5** Long-run handoff + checkpoint template **[P]** _M_
  - **Intent:** Long agent runs die on context, not capability; summarisation degrades where a full
    reset from a structured handoff file does not.
  - **Oracle:** a run killed mid-way resumes from the handoff file with no lost decisions.

### Checks — the library tier

- [ ] **AP.6** `dev-workflow check --rules` — audit rule files **[P]** _M_
  - **Intent:** A rule file earns its tokens only if each line is non-discoverable **and**
    operationally significant **and** non-obvious; auto-generated ones measurably cost more without
    helping. Report line count against a budget and flag discoverable content.
  - **Escalate if:** the heuristic can't distinguish a landmine from a description — then it warns,
    never fails.
- [ ] **AP.7** PR-size / one-id-per-PR check **[P]** _M_
  - **Intent:** Enforces AP.17. A PR that cannot be reviewed is one that will be merged unread.
- [ ] **AP.8** Ratchet check — every QA finding resolves to rule · check · documented won't-fix **[P]** _L_
  - **Intent:** Turns gates into a system that strengthens itself rather than one that is maintained.
- [ ] **AP.9** Token-count reporting per doc **[T]** _S_
  - **Intent:** Token count is now a documentation metric; agents budget context with it.

### Skills

- [ ] **AP.10** Anti-rationalization table in ship-review **[T]** _S_ — depends on AP.2
- [ ] **AP.11** Second, heterogeneous reviewer **[P]** _M_
  - **Intent:** ~93% of review findings come from exactly one tool; a second reviewer with a
    different model and a different lens catches a disjoint set.
- [ ] **AP.12** `/wrong-log` capture command **[T]** _S_ — depends on AP.4

### Guidance — the seed tier (`dev-workflow.md`)

- [ ] **AP.13** Autonomy levels 0–5 mapped onto `[S]/[P]/[D]/[T]`, with the selection checklist **[T]** _S_
- [ ] **AP.14** Orchestration tax — WIP cap equals review capacity; practical ceiling 3–4 threads **[T]** _S_
- [ ] **AP.15** The three debts, with the detection question for each **[T]** _S_
- [ ] **AP.16** Gate output convention: "success is silent, failures are verbose" **[T]** _S_

### Rituals — no code, highest value per unit effort

- [ ] **AP.17** **One backlog id = one PR.** The single most important item here.
- [ ] **AP.18** Closed-book comprehension drill, monthly — explain a subsystem's failure modes
      without opening it, then check. What you cannot explain is your debt.
- [ ] **AP.19** Track _ship_ and _learn_ as two separate metrics per person.
- [ ] **AP.20** Wrong-log review at every retro → feeds AP.8.

### Elsewhere (not this package)

- [ ] **AP.21** groundwork: `llms.txt`, capability signalling, token counts on digests _M_
  - **Intent:** Groundwork's whole job is serving context to agents; the AEO practices are directly
    on-thesis for it.
- [ ] **AP.22** Extract `evals/` into this package once a second project needs it _M_
  - **Intent:** The rubric is set-valued and already generic; resist extracting before the second
    consumer exists.

### Added 2026-08-05 — consequences of tickets leaving the repo

- [ ] **AP.23** `commit-msg` hook requiring a ticket id, with a `NOTICKET` escape **[P]** _S_
  - **Intent:** Once tickets live in a database the repo stops being self-describing. A ticket id in
    every commit message restores it via `git blame` — line → commit → ticket — at per-line precision
    and with no annotation anyone has to maintain. The escape hatch matters: forbidding untracked work
    makes people lie about it rather than stop doing it; CI files the retroactive ticket instead.
  - **Oracle:** a commit with no id and no `NOTICKET` is rejected locally; CI lists `NOTICKET` commits weekly.
- [ ] **AP.24** Lint for orphaned `TODO(id)` markers **[T]** _S_
  - **Intent:** A ticket reference in code is only correct when it **expires** — `TODO(PF.5.3)` should
    die when PF.5.3 ships. Linting for markers whose ticket is closed turns stale comments into a CI
    finding instead of archaeology. (Permanent rationale belongs in a file header pointing at an ADR;
    ticket ids never belong there — they rot on day one and a file has many tickets over its life.)
- [ ] **AP.26** Add an `advise` verdict to the guard, alongside `block` **[P]** _M_
  - **Intent:** Some rules only matter in one corner of the codebase, and the moment they matter is the
    moment nobody thinks to look them up — data-handling while adding a log line is the worked example.
    A path-matched advice hook injects the reminder when a tool call touches those paths: zero standing
    token cost, fires exactly when relevant, depends on nobody remembering. Blocking is the wrong verb
    for these; informing is the right one.
  - **Touches:** `lib/guards.mjs` (new verdict kind) · `lib/guard.mjs` (exit 0 + stderr) · harness schema
  - **Oracle:** an Edit under a configured `advice.paths` emits the message and **exits 0**; an unmatched
    path stays silent.
- [ ] **AP.27** Split `dev-style.md` — universal → managed, project deltas stay local **[P]** _M_
  - **Intent:** ~90% of it (FP primitives, branded types, Result over throws, Decider calibration) is
    identical in every repo and currently hand-maintained per project — the exact drift the managed tier
    exists to prevent.
- [ ] **AP.28** Console guard in the test setup **[T]** _S_
  - **Intent:** Unexpected `console.error`/`console.warn` should fail a test. Without it, warnings
    accumulate invisibly and an agent can silence a real problem with a log line and a green run.
  - **Oracle:** a test emitting an unexpected warn fails; a named silencer keeps an intentional one green.
- [ ] **AP.29** Scheduled test-suite pruning pass **[P]** _M_
  - **Intent:** infinite-oneness has ~1192 tests, a meaningful share agent-written, never pruned — test-suite
    comprehension debt. Coverage rewards adding a test and never rewards deleting one, so pruning needs a
    deliberate pass against written principles. Precondition: `testing-principles.md` (now shipped).
- [ ] **AP.25** Export every project to plain files on demand _M_
  - **Intent:** Groundwork is now a system of record ([ADR-0010](https://github.com/vinhnhq/groundwork)),
    so it can hold work hostage. Export is what makes that untrue, and it is also the seam for a
    customer who later requires tickets in their own repo.

---

## 5. Team curriculum

Five modules. Run in order; module 4 is continuous.

1. **Ownership** — inner vs outer loop; _you merge it, you own it_. Cognitive surrender and its
   warning signs: defending a design you cannot reconstruct, approving what you did not read,
   rigour declining with fatigue.
2. **Specification** — the DoR field by field, Oracle at the centre. Exercise: write a ticket an
   agent could complete unattended. Most people fail this three times; failing it is the lesson.
3. **Verification** — tests vs evals. Walk a real eval report. Teach the asymmetry: a failing test
   means the code is wrong; a failing eval means the code **or the fixture** is wrong, and you check
   the fixture first.
4. **Judgment drills** _(continuous)_ — the wrong log · construct expectations before reading output
   · read more code than you write · occasionally build something the hard way.
5. **Limits** — the orchestration tax; watch review _quality_, not agent count; know your ceiling
   before you find it by breaking something.

---

## 6. Considered and rejected

| Idea                                  | Why not                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Vibe coding" as a sanctioned mode    | No tier of production work here has "seems to work" as its bar. The `[T]` trivial tier already covers legitimate low-ceremony cases with more precision. |
| Dark factories / maximise parallelism | Reaches unmaintainable comprehension debt in about four months by the literature's own account. The WIP cap already rejects it.                          |
| The 3–10× cost-crossover claim        | Directionally plausible, unverified, and no substitute for the session-cost telemetry already in place.                                                  |
| Factory-model vocabulary              | A restatement of specs + guardrails + review. Adopting the words buys nothing.                                                                           |
| Career/futures material               | Useful for a talk, not for a pipeline.                                                                                                                   |
| Core Web Vitals post                  | Web performance, unrelated to agentic practice.                                                                                                          |

---

## 7. Sources

Whitepaper — _The New SDLC With Vibe Coding_ (Osmani, Saboo, Kartakis; Google/Kaggle, June 2026).

Posts, grouped by what they contribute:

- **Harness & context** — agents-md · agent-harness-engineering · agent-skills · self-improving-agents
- **Loops & orchestration** — loop-engineering · code-agent-orchestra · long-running-agents ·
  own-the-outer-loop · coding-agents-manager
- **Limits** — cognitive-parallel-agents · orchestration-tax
- **Factory / SDLC** — factory-model · software-factories · new-sdlc-vibe-coding · agentic-autonomy-levels · good-spec
- **Debts & judgment** — comprehension-debt · intent-debt · cognitive-surrender · dont-outsource-learning · earning-judgment
- **Review** — agentic-code-review · code-review-ai
- **Adjacent** — agentic-engine-optimization (→ groundwork) · career-advice-age-of-agents · next-two-years

All at `addyosmani.com/blog/<slug>`.
