# Dev Workflow — Next.js Preset

Tooling preset companion to [`dev-workflow.md`](dev-workflow.md). Fills in stack-specific defaults when the project uses Next.js + Bun + Playwright + Biome. If your project uses a different stack, create a parallel preset (`dev-workflow-python.md`, `dev-workflow-go.md`, etc.) rather than editing this one.

Apply this preset AFTER following the framework-agnostic setup in `dev-workflow.md`.

---

## Assumptions

- Next.js 15 App Router + TypeScript
- Bun as package manager + runner (swap to pnpm/npm if preferred — commands stay similar)
- Playwright for E2E and integration tests
- Biome for lint + format (replaces ESLint + Prettier)
- Tailwind for styling (common but not required)

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
