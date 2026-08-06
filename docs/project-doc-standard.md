# The project doc standard — what exists at init, and why

Every project this package seeds gets the same document set. This is the rule for what is in that
set, who authors each file, and — the part that decides whether any of it works — **when each one
reaches an agent's context.**

_Adopted 2026-08-05._

---

## 1. The economics, stated correctly

A misconception worth killing first: **a Markdown file sitting in the repo costs nothing.** Files on
disk are not in context. Only what is _loaded_ is paid for.

| Thing                           | Token cost                                                          |
| ------------------------------- | ------------------------------------------------------------------- |
| `.md` in the repo, never opened | **0**                                                               |
| `CLAUDE.md` (project + user)    | **full text, every session** — the only permanently-paid category   |
| A skill                         | **~1 line** (name + description) always; **body only when invoked** |
| Any file read during a session  | full cost, once, at the moment it is read                           |

So the axis is not _file vs skill_ — it is **always-loaded vs on-demand**. Seeding ten reference docs
is close to free. Adding ten lines to `CLAUDE.md` is not.

The real cost of a seeded-but-empty file is **credibility, not tokens**: it advertises a ritual that
is not happening, and the next reader learns the ritual is theatre.

## 2. Three tiers

| Tier                                                 | Who authors                           | Created           | Sync behaviour                               |
| ---------------------------------------------------- | ------------------------------------- | ----------------- | -------------------------------------------- |
| **Managed** — identical everywhere                   | the package                           | at init           | overwritten on every `sync`, hash-tracked    |
| **Seeded** — must be authored per project            | the project, from a prompt-laden stub | at init           | **copied only if absent**, never overwritten |
| **Grown** — created when the first real entry exists | whoever writes entry #1               | **never at init** | not touched                                  |

**Never seed a file that will sit empty.** `retro.md`, `wrong-log.md`, `done.md` and the ADR folder
are _grown_: they appear the first time someone has something to put in them.

## 3. The init set

```
managed  (package owns — do not hand-edit; hash-tracked)
  .claude/templates/           adr · spec · task · done-entry · ticket-event · README
  .claude/skills/testing-principles/SKILL.md
  .github/workflows/ticket-events.yml
  dev-workflow.md              the six-phase process (laid down by the bare `dev-workflow` command)

seeded  (stub with prompts — empty is a bug, not a default; never overwritten)
  CLAUDE.md                          ≤60 lines, landmines only
  __project__/project.yml            slug + conventions — the keystone
  .claude/harness.json               env manifest + guard rules
  __project__/docs/architecture.md
  __project__/docs/glossary.md
  __project__/docs/security-and-data.md
  __project__/docs/runbook.md

grown  (first use creates it — never at init)
  docs/retro.md · docs/wrong-log.md · docs/decisions/* · tasks/done.md
```

Seven seeded files, four of them one screen each. **If the list grows past this, the next addition
has to argue why it is not a section inside an existing file.**

Two things to note about the shape:

- **`testing-principles` ships as a skill, not a template.** A template is copied to make something;
  this is read when writing tests. That distinction decides the directory, and by §5 it also decides
  that its _description_ is the part that matters most.
- **`dev-style.md` is not yet shipped by the package.** It currently lives per-project and
  hand-maintained, which is the drift the managed tier exists to prevent — tracked as AP.27.

## 4. Routing — the part that decides whether a doc ever helps

A document only works if it is read _at the moment it would prevent a mistake_. Most reference docs
fail that test silently: the reader does not know they need it, so they never open it.

Split every principle into three parts and route them separately:

| Part                                                           | Goes to                | Why                                         |
| -------------------------------------------------------------- | ---------------------- | ------------------------------------------- |
| **The trigger** — 1–2 lines that make someone stop             | `CLAUDE.md`            | Must be known _before_ you know you need it |
| **The body** — the full reference                              | the doc                | Free until read; reached via the trigger    |
| **The enforcement** — rules too important to depend on reading | a check, lint, or hook | 0 tokens, cannot be forgotten               |

### The test

> If being wrong is **silent** — no crash, no failing test — a document alone will not catch it.
> It needs a `CLAUDE.md` line or a check.

Worked examples:

**`security-and-data.md`** — the moment it matters is while writing a log line, and nothing prompts
you to consult a policy first.

- `CLAUDE.md`: _"Regulated data: KYC documents, payment identifiers, PII. Rules in
  `docs/security-and-data.md`; logging rules are enforced."_
- **enforcement**: a lint rule failing on sensitive identifiers inside `console.*` / logger calls
- **advice hook**: fires on edits under the regulated paths
- doc body: classification, retention, who rotates what, and why

**`glossary.md`** — you only consult a glossary when you know you are confused, and the dangerous
case is confident wrongness.

- `CLAUDE.md`: **only the overloaded terms**, where a wrong assumption is silent —
  _"`task` = an Infinity work item, not a ticket · `claim` (oneness) = an argument node, not a lease"_
- doc body: the full vocabulary, reached when naming something new

**The 5% that prevents an error goes in the permanent budget; the 95% that explains it stays a doc.**

## 5. Skills, and why descriptions matter more than bodies

A skill's **name and description are always in context**; the body loads only when invoked. Selection
is **model judgement, not a router** — an agent reads the descriptions and decides.

> **The description _is_ the retrieval index.** A skill with a vague description is never selected,
> and nothing reports that it wasn't.

So a procedure — ship-review, testing principles, a review checklist — belongs in a skill, and its
description deserves as much care as its body. Reference material — glossary, ADRs, runbook — stays a
plain doc reached by a pointer.

## 6. Consequence for `dev-style.md`

Roughly 90% of a project's code-shape rules are universal (FP primitives, branded types, Result over
throws, the Decider calibration) and 10% are project-specific (the money type, the context seam, stack
gotchas). Keeping the whole file per-project reproduces the drift the managed tier exists to prevent.

**Universal → managed. Project deltas → a local section, or `.claude/templates/local/`.**
