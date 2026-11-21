# ScaleLab

ScaleLab is a local-first system-design stress-testing playground. Build an
architecture, push simulated traffic through it, and learn from the first
component that fails.

Everything runs in the browser. There is no account, backend, or runtime data
fetch.

## Status

- **M0 — foundation**: Vite + React 19 + TypeScript 7, Tailwind v4, shadcn/Base
  UI, theme system, routing, feature folders, Vitest, oxlint + conventions check.
- **M1 — engine core**: rate-based simulation, graph validation, topology sort,
  clients/load-balancer/app-server behaviors, failure detection, deterministic
  run controller, and engine tests.
- **M2 — data components + diagnosis**: cache warm-up and hit ratios, database
  replicas/shards/storage, queue and worker backpressure, CDN absorption,
  three-scenario root-cause attribution, and 16 diagnosis rule templates.
- **Next**: M3 canvas editing.

The workspace UI is still a scaffold. The engine is usable from
`@/features/simulation` and has a developer page at `/dev/engine`.

## Stack

| Area        | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| UI          | React 19, Vite 8, TypeScript 7 (strict)                   |
| Styling     | Tailwind CSS v4, shadcn/ui with Base UI (`base-nova`)     |
| Routing     | React Router v8 (routes are code-split with `React.lazy`) |
| State       | Zustand + Immer, Zod 4 schemas                            |
| Simulation  | Pure TypeScript engine, no React or DOM imports           |
| Testing     | Vitest, Testing Library, jsdom                            |
| Lint/format | oxlint, custom convention check, Prettier                 |
| Package mgr | bun                                                       |

## Commands

```bash
bun install
bun run dev
bun run build
bun run typecheck
bun run lint
bun run format
bun run test
```

Run `bun run format`, `typecheck`, `lint`, and `test` before calling a milestone
complete. `bun run lint` includes `scripts/check-conventions.mjs`, which enforces
the type and feature-boundary rules that oxlint does not cover.

## Source layout

```text
src/
├─ app/            composition root: providers, router, layouts, fallback pages
├─ features/
│  ├─ architecture/  types, Zod schemas, component catalog, graph validation
│  ├─ challenges/    challenge schemas and hub page
│  ├─ simulation/    engine, runner, pages
│  ├─ playback/      live visualization (M4)
│  ├─ diagnosis/     failure attribution rules and explanations
│  ├─ progress/      attempts and scoring
│  ├─ settings/      themes, preferences, persistence
│  ├─ workspace/     workspace composition
│  └─ learn/         concept cards
├─ shared/          UI primitives, helpers, hooks, storage
└─ test/            global setup and theme tests
```

Feature public APIs live in `features/<name>/index.ts`. Import them through
`@/features/<name>` only. Dependency direction:

```text
shared → architecture → challenges → simulation → diagnosis → progress → workspace → app
```

`settings` may be imported anywhere. `simulation/engine` is pure TypeScript.

## Engine at a glance

The engine models traffic as fluid rates with `dt = 0.1s`:

- A generic queue turns arrival rate, capacity, and queue depth into served
  rate, dropped rate, utilization, and latency.
- Load-balancers split traffic evenly or by weight; app servers scale with
  instances × requests per instance.
- Caches use a diminishing-returns hit ratio and a 20-second cold-start ramp.
  Databases separate read and write capacity, add replicas and shards, and
  enforce per-shard storage. Queues absorb writes until workers drain them.
- Failures must persist for 3 simulated seconds: error rate, p95 SLO, queue
  overflow, storage exhaustion, or a run timeout.
- Root-cause attribution walks past symptoms; an undersized cache is blamed
  before the database overflow it causes. `diagnoseFailure` turns the result
  into a plain-English report with a nudge.

See [`ENGINE.md`](./ENGINE.md) for the model and [`DECISIONS.md`](./DECISIONS.md)
for deliberate trade-offs.

## Performance notes

- Every route page is lazy-loaded behind a shared `<Suspense>` fallback.
- Vite splits React, React Router, Base UI, and icons into stable vendor chunks.
- Static top-level data (navigation, palette, toast configuration) is defined
  outside render functions.
- The simulation engine is headless and can later move to a Web Worker without
  changing its API.

## Principles

- Local-first: never fetch application data at runtime.
- Learn from failure: every run should explain the bottleneck.
- Keep the model explainable; tunable numbers live in
  `features/simulation/engine/constants.ts`.
- Small, composable files with lowercase kebab-case names.
