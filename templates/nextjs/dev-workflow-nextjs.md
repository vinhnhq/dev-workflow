# Dev Workflow — Next.js Preset

Tooling preset companion to [`dev-workflow.md`](dev-workflow.md). Fills in stack-specific defaults when the project uses Next.js + Bun + Playwright + Biome. If your project uses a different stack, create a parallel preset (`dev-workflow-python.md`, `dev-workflow-go.md`, etc.) rather than editing this one.

Apply this preset AFTER following the framework-agnostic setup in `dev-workflow.md`.

---

## Assumptions

- Next.js 15 App Router + TypeScript (strict)
- React 19 — `<Activity>` and `<ViewTransition>` are first-class
- Bun as package manager, runtime, and test runner (swap to pnpm/npm if preferred — commands stay similar)
- Biome for lint + format (replaces ESLint + Prettier)
- Tailwind v4 + shadcn/ui for UI
- ts-pattern + purify-ts for typed state machines and partial functions
- Playwright for E2E smoke tests

---

## `package.json` scripts baseline

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "playwright test"
  }
}
```

---

## Playwright config

**Do not inherit device defaults.** Fill `projects` from the device/viewport matrix agreed in the spec (Phase 1 of the core workflow). The examples below are commented out on purpose — uncomment and adjust per project.

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "__tests__",

  // Device matrix — fill from spec. Examples (commented — do not inherit blindly):
  projects: [
    // { name: "iPhone 14",       use: { ...devices["iPhone 14"] } },
    // { name: "iPhone SE",       use: { ...devices["iPhone SE"] } },
    // { name: "Pixel 7",         use: { ...devices["Pixel 7"] } },
    // { name: "Desktop Chrome",  use: { ...devices["Desktop Chrome"] } },
    // { name: "Desktop Firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "Desktop Safari",  use: { ...devices["Desktop Safari"] } },
  ],

  webServer: { command: "bun run dev", url: "http://localhost:3000" },
});
```

When filling the matrix, bias toward **2-3 devices max** in CI — the full project list runs locally on demand. Every added device multiplies CI runtime.

---

## Biome config essentials

```json
{
  "formatter": { "indentStyle": "tab" },
  "javascript": { "formatter": { "quoteStyle": "double" } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "useFilenamingConvention": {
          "level": "error",
          "options": { "filenameCases": ["kebab-case"] }
        }
      }
    }
  }
}
```

Tab indent keeps diffs small and accommodates any reader's preferred width. Double quotes match Next.js + TS ecosystem convention. `useFilenamingConvention` is the CI gate that enforces the file naming rule below — see "File naming".

---

## File naming

**Rule:** every source file uses `kebab-case`. Filenames are `xxx-yyy-zzz.tsx`. Exported symbols keep their natural casing — React components stay PascalCase, hooks stay camelCase. **Filenames and exports are different things with different audiences.**

```
// good
src/components/ui/magnetic-link.tsx       →  export function MagneticLink()
src/components/sections/product-range.tsx →  export function ProductRange()
src/lib/build-metadata.ts                 →  export function buildMetadata()

// avoid
src/components/ui/MagneticLink.tsx        ← PascalCase filename
src/components/sections/productRange.tsx  ← camelCase filename
```

**Exceptions (do not rename):**

- **Next.js App Router special files** — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `template.tsx`, `default.tsx`, `middleware.ts`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx`. Next.js reserves these names — case and spelling matter.
- **Dynamic route segments** — `[slug]`, `[...slug]`, `[[...slug]]`. Next.js syntax.
- **Private folder prefix** — `_components/`, `_lib/`. Next.js syntax.
- **Third-party configs** — `next.config.ts`, `tailwind.config.ts`, `playwright.config.ts`, `biome.json`, `tsconfig.json`, etc. Tools dictate their own filenames.

**Enforcement:** the Biome `useFilenamingConvention` rule in the config above catches PascalCase and camelCase filenames on every `bun run lint` and in CI. Docs rot; the lint rule does not.

**macOS note:** the default macOS filesystem is case-insensitive. Renaming `Header.tsx` → `header.tsx` requires a two-step `git mv` (`git mv Header.tsx header.tmp.tsx && git mv header.tmp.tsx header.tsx`) or the rename is silently ignored by git.

---

## Release gate — test step wiring

In `scripts/release-check.sh`, the generic "run test suite" gate from the core workflow becomes:

```bash
Gate 2: Test suite — `bun run test`. FAIL if failures > KNOWN_FAILURES.
```

Known-failure baseline stays in the shell script as the env var `KNOWN_FAILURES=N`.

---

## Next.js-specific agent rules

Append to `AGENTS.md` at repo root:

```markdown
## Next.js specifics

- Next.js version: pin exactly in package.json. Do not suggest an upgrade path without an explicit ask.
- App Router only. No Pages Router fallback.
- Server Components by default. Client components must start with "use client".
- Metadata via the Next.js Metadata API — no manual <head> tags in app/.
- `next/image` for all images, with explicit width/height. AVIF/WebP.
- `next/font` self-hosted, subset aggressively for CJK.
- For i18n, prefer next-intl with localized pathnames (see ADRs).
```

---

## Library defaults

Beyond the bare Next.js + Bun + Biome + Playwright baseline, every new project ships with these libraries unless the project's nature forces a different choice:

| Library          | Use                                                                                          |
|------------------|----------------------------------------------------------------------------------------------|
| **Tailwind v4**  | Styling. Drop to v3 only if a v4 regression blocks the project.                              |
| **shadcn/ui**    | UI primitives. Commit components to `src/lib/ui/`, edit them in place, never wrap.           |
| **ts-pattern**   | Exhaustive `match()` for state machines and discriminated-union dispatch.                    |
| **purify-ts**    | `Maybe` / `Either` for partial functions. No `throw` in `lib/`.                              |

---

## Pure boundary at `src/lib/`

Anything in `src/lib/` is **pure**: no `react`, `next/*`, DOM globals, `fetch`, or `Date.now()`. Time and randomness flow as parameters (`now: number`, `rng: () => number`).

Why this matters more than it looks: pure logic ports to a server runtime (Edge, Workers, Partykit) without rewriting. Discovering the rule mid-project is expensive; setting it day one is free.

Enforce with Biome `noRestrictedImports` against `src/lib/**`.

---

## State machines via `ts-pattern`

State transitions live in pure reducers using `match([state, event]).with(...).exhaustive()`. The exhaustiveness check guarantees that adding a new state or event without handling it fails the type check. Don't hand-roll `switch` statements that drift from the type union.

---

## Functional error types via `purify-ts`

- Anything that can fail returns `Either<Err, Ok>`.
- Anything that can be absent returns `Maybe<T>`.
- UI code unwraps with `.caseOf({ Just, Nothing })` or `.caseOf({ Left, Right })`. Never `.unsafeCoerce()`.

---

## React 19 features in use

- **`<Activity mode="hidden">`** preserves screen state across navigation without re-mount cost (e.g. a config screen's form state when entering the next screen).
- **`<ViewTransition>`** + `addTransitionType('a' | 'b' | 'c')` animates screen and state changes via the View Transitions API; CSS pseudo-elements fork on the type. See the `vercel-react-view-transitions` skill.
- **`prefers-reduced-motion: reduce`** shortens transitions to ~50 ms but does not remove animations that convey correctness (e.g. a flash on a successful match).

---

## Test layering

The preset uses Playwright for E2E. Add a unit/component layer for projects with non-trivial pure logic:

| Layer                | Tool                                                                | Where                       | Command     |
|----------------------|---------------------------------------------------------------------|-----------------------------|-------------|
| Unit / property      | `bun test` (built-in)                                               | `src/lib/**/__tests__/`     | `bun test`  |
| Component            | `bun test` + `happy-dom` + `@testing-library/react`                 | `src/**/__tests__/`         | `bun test`  |
| E2E smoke            | Playwright                                                          | `e2e/`                      | `bun e2e`   |

When adopting the unit layer, add `"e2e": "playwright test"` to `package.json` and remove the `"test"` script — Bun's `bun test` is a built-in subcommand, not an npm script. If a project is E2E-only, keep `"test": "playwright test"` as in the baseline above.

---

## Default scope choices

These are **defaults**, not laws — override per-project if a feature genuinely requires it.

- **Auth** — anonymous play first; add identity only when a feature requires it.
- **DB** — none in v1; `localStorage` where possible. Defer Postgres / SQLite.
- **Multiplayer** — solo or single-player ships first; online ships in a later version. The pure boundary above pays for itself when this happens.
- **Deployment** — Vercel by default. If realtime sockets are needed, decide transport (Partykit, Liveblocks, Supabase Realtime, or Socket.IO on Fly/Render) at the start of the online version, not in v1.

---

## Quality bar

- `lib/` line coverage ≥ 90%.
- One Playwright smoke test per shipped mode.
- Lighthouse on the main screen: Performance ≥ 90, Accessibility ≥ 95.
- `bun test`, `bun lint`, `bunx tsc --noEmit` all green before any task moves to `done`.

---

## Preset setup checklist

Run these AFTER the framework-agnostic Setup Checklist in `dev-workflow.md`.

```
[ ] Answer from Phase 1 spec: which devices/viewports? (e.g. iPhone 14, Desktop Chrome)
[ ] Install Biome: bun add -D @biomejs/biome && bunx biome init
[ ] Install Playwright: bun add -D @playwright/test && bunx playwright install
[ ] Create playwright.config.ts with projects filled from the device matrix above
[ ] Create __tests__/ directory with a sanity smoke test
[ ] Confirm `bun run test` resolves and passes on the empty smoke test
[ ] Confirm `bun run dev` serves on http://localhost:3000
[ ] Confirm `bun run build` completes with zero errors
```

---

## When to branch this preset

Create a new preset file (not an edit to this one) when:

- Stack base changes — Python API, Go service, Rust CLI, React Native app, etc.
- Tooling choice diverges meaningfully — e.g. Vitest instead of Playwright for unit-heavy projects.
- Target platform differs — e.g. Next.js on Cloudflare Pages has different gotchas than on Vercel.

Naming pattern: `dev-workflow-<stack>.md` so future-you spots them at a glance in the repo root.
