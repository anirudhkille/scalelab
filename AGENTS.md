# AGENTS.md

ScaleLab is a local-first system-design stress-testing playground. The player builds an architecture, runs simulated traffic through it, and learns from the first component that fails.

## Stack

- React 19 + Vite 8 + TypeScript 7 (strict)
- Tailwind CSS v4
- shadcn/ui with Base UI (`@base-ui/react`), style `base-nova`
- Zustand + Immer, Zod 4
- React Router v8
- Vitest + Testing Library + jsdom
- oxlint + Prettier

## Commands

Use **bun** (the environment has no pnpm).

```bash
bun install
bun run dev
bun run build
bun run typecheck
bun run lint
bun run format
bun run test
bun run test:e2e
```

Run `bun run format`, `bun run typecheck`, `bun run lint`, and `bun run test` before claiming a milestone is complete. Run `bun run test:e2e` when the workspace main flow changes; install the browser once with `bunx playwright install chromium`.

## Source layout

- `.github/workflows/ci.yml` — PR gate: lint, typecheck, Vitest, build, and Playwright smoke.
- `e2e/` — Playwright smoke tests for the main workspace flow.
- `src/app/` — composition root only: providers, router, layouts, and app-level fallback pages (`app/pages/`).
- `src/features/<name>/` — one domain per folder, with its own pages, components, store, hooks, types, schemas, and tests.
  - Route screens live in `features/<name>/pages/` and are exported from that feature's `index.ts`. There is no top-level `src/routes/`.
  - `architecture`, `challenges`, `simulation`, `playback`, `diagnosis`, `progress`, `interview`, `settings`, `workspace`, `learn`.
- `src/shared/` — feature-agnostic UI (`shared/ui`), helpers (`shared/lib`), hooks, storage, and cross-feature types.
- `src/test/` — global test setup and theme-level tests.

Each feature exposes its public API through `src/features/<name>/index.ts`. Import features only through `@/features/<name>`; never deep-import another feature.

Dependency direction:

```text
shared → architecture → challenges → simulation → diagnosis → progress → interview → workspace → app
```

`settings` may be imported anywhere. `playback` may import `simulation` and `architecture`. `workspace` composes features. `simulation/engine` is pure TypeScript: no React, DOM, or Zustand.

## Type rules

- Use `type`, never `interface` or `enum`.
- Zod is the source of truth for persisted, imported, or authored data. Derive types with `z.infer`.
- Use branded ids (`NodeId`, `EdgeId`, `ChallengeId`, `AttemptId`) and construct them through helpers.
- Put units in names: `latencyP95Ms`, `capacityRps`, `monthlyBudgetUsd`, `memoryGb`. Ratios are `0..1` and end in `Ratio`.
- Use discriminated unions and exhaustive switches with `assertNever`.
- Use `satisfies` for typed constant tables.
- Use `import type` for type-only imports.
- Prefer `readonly` for engine inputs and challenge data.

## Naming

- Folders and filenames are lowercase `kebab-case` (`hub-page.tsx`, `use-appearance.ts`, `app-store.ts`).
- React component identifiers are `PascalCase`; one exported component per file.
- Hooks start with `use`.

## Working agreements

- Build milestone by milestone. Log non-obvious judgement calls in `DECISIONS.md`.
- Keep tunable simulation numbers in `constants.ts`; no magic numbers in node logic.
- Write engine tests with the behavior, not after it.
- Never fetch application data over the network at runtime. Everything is local.
- Preserve the plan's feature boundaries; if a cross-feature import breaks the direction, restructure instead of adding an exception.
- Keep files small and composable; split before ~300 lines unless there is a clear reason.
