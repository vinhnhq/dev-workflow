# Sprint 02 — Tasks Checklist

Mirror of [plan.md](plan.md). Tick each box as it lands. Status updates flow back to [`__project__/tasks/README.md`](../README.md).

**Branch:** `sprint-02-agent-layer` (cut from `dev` at 23fffb0). Merge target: `dev` via `gh pr create --base dev`.

## Committed (must finish to release v1.1.0)

- [x] **T201** — Push unpushed `dev` commit (`learnings.md` + Phase 5 retro) to `origin/dev` (done 2026-05-04)
- [x] **T202** — Add Phase 0 — Provision to `templates/core/dev-workflow.md` + update Pipeline diagram (60543a5)
- [x] **T203** — Create `templates/core/.claude/commands/{spec,plan,build,test,review,ship,code-simplify}.md` (1910a29)
- [x] **T204** — Create `templates/core/.claude/settings.json` (enables `agent-skills@anthropic`) (564ebce)
- [x] **T205** — Create `templates/core/CLAUDE.md` skeleton (5 sections, all empty bodies) (564ebce)
- [x] **T206** — Create `templates/core/skills-lock.json` with `{ "version": 1, "skills": {} }` (564ebce)
- [x] **T207** — Parametrize `templates/core/scripts/release-check.sh` (`TEST_CMD` env var, comment block) (f002e33)
- [x] **T208** — Add `templates/core/scripts/feature-pr.sh` (`LINT_CMD`/`TYPECHECK_CMD`/`TEST_CMD` env vars, `+x` mode) (2d2d752)
- [x] **T209** — Implement `src/commands/doctor.mjs` (runtime + project checks, output, exit codes, `--fix`) (ff0bd12)
- [x] **T210** — Wire `doctor` into `bin.mjs` dispatcher + update `--help` (9741b8a)
- [x] **T211** — Make `init` auto-run `doctor` at end (skip with `--no-doctor`) (9741b8a)
- [x] **T212** — Tests for `doctor` (runtime missing path, drift path, all-green path, `--fix`, `--no-doctor`) (77942a8)
- [x] **T213** — Tests for new init/upgrade behavior on agent-layer files (idempotency, `--force`, drift) (77942a8)
- [x] **T214** — Update `README.md` (doctor command, agent-layer section, env-var docs, fresh-machine flow, multi-repo flow) (24bd099)
- [x] **T219** — Implement `--repos <glob>` flag for `doctor` (multi-repo audit, aggregated output) (351a74c)
- [x] **T220** — Implement `--repos <glob>` flag for `upgrade` (requires `--yes` or `--dry-run` in multi-repo mode) (4653b27)
- [x] **T221** — Tests for `--repos` flag (3-tmpdir fixture, audits/upgrades/skips) (4653b27)
- [ ] **T215** — Bump `package.json` version `1.0.0` → `1.1.0` + commit
- [ ] **T216** — `gh pr create --base dev` to land sprint-02-agent-layer; squash-merge after review; then `bash scripts/release-check.sh` on `dev` → opens release PR `dev` → `main` → human merge
- [ ] **T217** — `git tag v1.1.0 && git push --tags` → `publish.yml` fires → npm publish; verify `npm view ... version` = 1.1.0

## Stretch (nice to have, not gating)

- [ ] **T218** — Smoke-test `bunx @vinhnnn/dev-workflow@1.1.0 upgrade --dry-run` in `/Users/vinhn/github.com/101-sliding-puzzle`. Bonus: `bunx ... doctor --repos '~/github.com/*'` to validate the multi-repo flow against real projects.

## Blocked

(none)

---

## Done? Final check

- [ ] All Committed tasks ticked
- [ ] All tests green (`node --test tests/*.test.mjs`)
- [ ] `bunx @vinhnnn/dev-workflow@1.1.0 --version` → `1.1.0`
- [ ] `__project__/tasks/README.md` Sprint 02 row reflects final status (✓ done across the board)
- [ ] Sprint retro written at `retro.md` (per dev-workflow.md Phase 5)
