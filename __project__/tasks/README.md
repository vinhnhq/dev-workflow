# Project Tasks — `@vinhnnn/dev-workflow`

Status legend: ✓ done · → in progress · · backlog · ↷ stretch · ⏸ blocked

Backlog (not-yet-committed work): [`backlog/`](backlog/) — none yet; create per topic as needed.

---

## Sprint 02 — Agent Layer + Doctor (v1.1.0)

See [plan.md](sprint-02-agent-layer/plan.md) · [tasks.md](sprint-02-agent-layer/tasks.md)

| #    | Task                                                                            | Status     |
|------|---------------------------------------------------------------------------------|------------|
| T201 | Push unpushed `dev` commit (learnings.md / Phase 5 retro)                       | ✓ done     |
| T202 | Add Phase 0 — Provision to `templates/core/dev-workflow.md`                     | ✓ done     |
| T203 | Add `templates/core/.claude/commands/{spec,plan,build,test,review,ship,code-simplify}.md` | ✓ done     |
| T204 | Add `templates/core/.claude/settings.json` (minimal, agent-skills enabled)      | ✓ done     |
| T205 | Add `templates/core/CLAUDE.md` skeleton                                         | ✓ done     |
| T206 | Add `templates/core/skills-lock.json` (empty `{ skills: {} }`)                  | ✓ done     |
| T207 | Parametrize `templates/core/scripts/release-check.sh` (env-var commands)        | ✓ done     |
| T208 | Add `templates/core/scripts/feature-pr.sh` (parametrized same way)              | ✓ done     |
| T209 | Implement `src/commands/doctor.mjs` (runtime + project checks, `--fix`)         | ✓ done     |
| T210 | Wire `doctor` into `bin.mjs` dispatcher; update `--help`                        | ✓ done     |
| T211 | Hook `init` to call `doctor` at end unless `--no-doctor`                        | ✓ done     |
| T212 | Tests: `doctor` (mocked PATH for runtime; real fs for project checks)           | · backlog  |
| T213 | Tests: agent-layer files via `init` / `init --force` / `upgrade` drift          | · backlog  |
| T214 | Update `README.md` — document `doctor`, agent layer, parametrized scripts       | · backlog  |
| T215 | Bump `package.json` version `1.0.0` → `1.1.0`                                   | · backlog  |
| T216 | Run `scripts/release-check.sh` → opens release PR `dev` → `main`                | · backlog  |
| T217 | Tag `v1.1.0` → `publish.yml` fires → `npm publish` with provenance              | · backlog  |
| T219 | Implement `--repos <glob>` flag for `doctor` (multi-repo audit + aggregated output) | · backlog  |
| T220 | Implement `--repos <glob>` flag for `upgrade` (multi-repo apply, `--yes` aware) | · backlog  |
| T221 | Tests: `--repos` for both commands (multi-tmpdir fixture)                       | · backlog  |
| T218 | Stretch: smoke-test `bunx ...@1.1.0 upgrade` in `101-sliding-puzzle`            | ↷ stretch  |
