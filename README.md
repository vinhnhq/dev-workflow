# `@vinhnnn/dev-workflow`

Conventions plus a pipeline you adapt once. That's the whole package.

```bash
cd your-new-project
bunx @vinhnnn/dev-workflow
```

That writes two things:

- **`dev-workflow.md`** — the conventions Vinh applies to every web project: stack defaults, architectural rules, the six-phase process, quality bar. Read it there; this README won't restate it.
- **`dev-workflow-pipeline/`** — the agent pipeline that goes with them: ship-review skill, session-cost hook, work summary, CI gate. Files to adapt, not a framework to depend on.

Then open Claude Code and say:

> Set up the project — read dev-workflow.md and ask me what you need.

Claude confirms the defaults, asks about domain and scope, scaffolds a thin layout, materializes the pipeline into `.claude/` and `.github/`, and deletes the staging folder.

## Commands

```bash
bunx @vinhnnn/dev-workflow                 # seed + pipeline
bunx @vinhnnn/dev-workflow --no-pipeline   # conventions only
bunx @vinhnnn/dev-workflow --force         # overwrite existing targets
bunx @vinhnnn/dev-workflow --help
bunx @vinhnnn/dev-workflow --version
```

## Seeded, then owned

The drop happens **once**. From that moment the project's copy is the truth — edit it, let it diverge, never re-drop it over local changes. The shadcn model, not the dependency model.

The flow back is a **harvest**: at each version-close retro, ask which process lessons generalize and PR those here. The foundation evolves downstream of practice — which is why prescriptions favour principles over named tools, each carrying a dated "current pick" line.

That's also why this isn't a scaffolder. Early versions shipped a full multi-file template with a `doctor` command and multi-repo audit; every project got the same fixed structure whether it fit or not, and per-project differences became friction rather than features. Ship the conventions, keep the few files that earned their keep across projects, let Claude handle the specifics in conversation.

## Requirements

Node.js ≥ 24.

## License

MIT
