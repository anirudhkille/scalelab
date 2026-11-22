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
- **M3 — canvas editor**: React Flow canvas, draggable component palette,
  custom node/edge renderers, Zod-validated parameter forms, connect/delete/
  duplicate, undo/redo with keyboard shortcuts, live cost meter, and pre-run
  validation messages.
- **M4 — live load tests**: worker-backed playback, run/stop and 1x–10x speed,
  per-node health bars, edge flow weighting, particle traffic, four live
  metrics charts, and a failure overlay.
- **M5 — challenges + reports**: five tuned challenges, requirements drawers,
  starter and reference designs, progressive hints, failure reports with
  evidence and a p95 sparkline, and three-star scoring.
- **M6 — persistence + saved progress**: versioned local storage for designs,
  attempts, hints, and settings, corrupt-data backups, export/import/reset,
  attempt comparison and design restore, plus streaks and concept tracking.
- **M7 — polish + launch**: a three-step first-visit tour, keyboard shortcuts
  help, skip link and focus pass, reduced-motion-aware transitions, and
  launch-ready documentation.
- **Phase 2 — resilience**: challenge failure scenarios (kill, degrade, zone
  outage), availability tracking and scoring, cache write strategies, database
  replication lag, and multi-region placement with cross-region latency.
- **Phase 3 — scale**: nine challenges including ride hailing, video streaming,
  timeline fan-out, and a rate-limited API; a sandbox with arbitrary load
  sliders; a custom challenge editor with JSON import; shareable designs encoded
  into the URL; and a concept-card library on `/learn`.
- **Phase 4 — estimation + failure fluency**: an estimator panel in every
  challenge, a Load Lab with retry storms, daily waves, hot keys and cache
  flushes, a replay scrubber for failed runs, cost/design comparison after a
  pass, a timed interview drill, a real rate limiter and search index, three
  new challenge packs, and offline install support.
- **SEO + sharing**: canonical URLs, per-route titles and descriptions, Open
  Graph and Twitter cards, a 1200×630 social image, and `robots.txt`/`sitemap.xml`.

The workspace at `/challenge/:id` now runs a complete challenge loop: design,
run, diagnose, and retry. The engine is also usable headlessly from
`@/features/simulation` and has a developer page at `/dev/engine`.

## Stack

| Area        | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| UI          | React 19, Vite 8, TypeScript 7 (strict)                   |
| Styling     | Tailwind CSS v4, shadcn/ui with Base UI (`base-nova`)     |
| Routing     | React Router v8 (routes are code-split with `React.lazy`) |
| State       | Zustand + Immer, Zod 4 schemas                            |
| Simulation  | Pure TypeScript engine, no React or DOM imports           |
| Testing     | Vitest, Testing Library, jsdom, Playwright                |
| Lint/format | oxlint, custom convention check, Prettier                 |
| Package mgr | bun                                                       |
| CI          | GitHub Actions: lint, typecheck, test, build, e2e         |

## Commands

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

Run `bun run format`, `typecheck`, `lint`, and `test` before calling a milestone
complete. `bun run lint` includes `scripts/check-conventions.mjs`, which enforces
the type and feature-boundary rules that oxlint does not cover.

`bun run test:e2e` runs the Playwright browser suite against a local Vite server.
It covers the workspace run and failure report, canvas click/drag behavior,
hub and requirements, sandbox scoring, custom challenge create/delete, progress
export/reset, the interview drill, and learn/not-found routes. On a fresh
machine, install the browser once with `bunx playwright install chromium`.

GitHub Actions runs lint, typecheck, unit tests, build, and the Playwright browser
suite on every pull request and on pushes to `main`.

## Source layout

```text
src/
├─ app/            composition root: providers, router, layouts, fallback pages
├─ features/
│  ├─ architecture/  model, design store, canvas, palette, inspector, validation
│  ├─ challenges/    catalog, custom editor, schemas, hub page
│  ├─ simulation/    engine, runner, pages
│  ├─ playback/      live visualization (M4)
│  ├─ diagnosis/     failure attribution rules and explanations
│  ├─ progress/      attempts, scoring, persistence, compare, export/import
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

## Canvas at a glance

- The editor is a controlled React Flow graph backed by a Zustand design store.
- Drag components from the palette or click to drop one at the canvas center.
- Every node type has its own card, icon, summary, monthly cost, and inspector
  fields generated from `COMPONENT_PARAM_SPECS`.
- Parameter edits are validated against the component Zod schema before they
  reach the design.
- Undo/redo snapshots the architecture; a full drag counts as one change.
- The top bar reports monthly cost and graph validity. Invalid designs explain
  the first issues before a run is allowed.

Keyboard: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` redo,
`Ctrl/Cmd+D` duplicate, `Delete`/`Backspace` remove, `Escape` clear selection.

## Runs at a glance

- Run starts a simulation worker and streams snapshots back to a Zustand run
  store at roughly 20 updates per second. The main-thread runner is the fallback
  when workers are unavailable.
- The canvas locks while a run is active. Nodes show utilization and queue bars,
  edges thicken with flow, and a single particle canvas draws traffic without
  one React element per request.
- The bottom panel keeps a rolling 60-second view of users, served/dropped RPS,
  p95 latency against the SLO, and error rate. Charts sample at 4 Hz.
- Stop ends the stream; a failed run shows the overload overlay and the first
  component to give out.
- `1x`, `2x`, `5x`, and `10x` speeds are simulated-time multipliers, not animation
  speeds. Particle density is sampled from the current edge rates.

## Challenges and reports at a glance

- Nine challenges cover static-heavy, read-heavy, media, bursty-write, flash-sale,
  hot-location writes, video bandwidth, timeline fan-out, and rate-limited API
  traffic. Each ships a starter design, a reference solution, and numbers tuned
  against the engine.
- The requirements drawer shows traffic shape, load stages, budget, SLOs, hints,
  and allowed components.
- A failed run opens a report with the bottleneck, evidence, a 10-second p95
  sparkline, plain-English context, and progressive hints.
- Stars reward surviving the target, staying within budget, and holding 2× the
  target. Attempts are grouped by challenge on the Progress page.

## Saved progress at a glance

- Designs, attempts, unlocked hints, custom challenges, and settings persist in
  versioned local-storage slices under `scalelab:v1`.
- Hydration is Zod-validated. Corrupt blobs are copied to a timestamped
  `scalelab:v1:corrupt-*` key, then the app starts that slice fresh with a toast.
- Storage writes are wrapped: quota and blocked-storage errors show a toast and
  never crash the session.
- The Progress page exports a validated JSON file containing settings and
  progress, imports it back, or resets everything after confirmation.
- Each attempt keeps its architecture snapshot, so the report and history can
  compare the previous run and restore that design.
- Progress also tracks best stars per challenge, completed challenges, practiced
  concepts, and a consecutive-day streak.

## Polish at a glance

- A three-step tour introduces the canvas, load runs, and failure reports on the
  first visit. Completion is stored with settings, and the tour can be replayed
  from the shortcuts dialog.
- Press `?` anywhere outside a text field to open the keyboard shortcuts help.
- A skip link jumps straight to the workspace, dialogs expose titles and
  descriptions, icon buttons have accessible names, and focus rings are visible
  across the header, canvas, and dialogs.
- Page fades and edge-flow animation respect `prefers-reduced-motion` and the
  in-app reduced-motion setting.
- The README and decisions log are part of the milestone: the shipped behavior,
  known approximations, and local-first constraints are documented together.

## Resilience and scale at a glance

- Challenges can inject node kills, degraded nodes, or availability-zone
  outages. The runner applies the effect for a fixed window, then the failure
  report explains what broke.
- Availability is request success across the run, not healthy-tick uptime, and
  feeds scoring alongside the target load, budget, and 2× headroom.
- Caches support write-around, write-through, and write-back. Async database
  replicas add replication lag under write pressure.
- Every node carries a region and zone; cross-region edges add latency and zone
  outages require both a region and zone, so one region cannot take down another.
- `/sandbox` runs a reference design against arbitrary users, request rate, read
  and static mix, p95 SLO, and monthly budget, then scores the result.
- The share button copies a URL with the current design encoded in the query
  string. Opening it loads that exact design in the challenge workspace.
- `/learn` ships the concept-card library for caching, CDNs, queues, workers,
  replicas, sharding, rate limiting, backpressure, and multi-region design.
- `/custom` builds a challenge from any reference design with its own traffic,
  SLO, budget, and load profile, or imports one as validated JSON. Custom
  challenges stay local and appear in Progress alongside built-ins.

## Sharing and metadata at a glance

ScaleLab is published at `https://scalelab.anirudhkille.com`. Metadata is split
between the static shell and the React tree:

- `index.html` carries the crawler-visible Open Graph and Twitter card tags,
  including the 1200×630 `public/og-image.png`, image dimensions, alt text, and
  the canonical site URL.
- Every route renders one `PageMeta` component. React 19 hoists its `<title>`,
  `<meta name="description">`, robots directive, and canonical link into
  `<head>`, so the browser tab and description follow navigation.
- Challenge pages use the challenge title and concepts for their metadata;
  `/sandbox`, `/progress`, `/learn`, and `/dev/engine` have their own copy.
- `/progress`, `/dev/engine`, and the not-found page are marked `noindex`;
  progress is local data and is not listed in the sitemap.
- `public/robots.txt` allows public routes, blocks `/dev/`, and points to
  `public/sitemap.xml`.
- Social crawlers do not execute SPA JavaScript, so the static OG tags stay
  site-wide. Page-specific descriptions still update for browsers and search
  engines that render the app.

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
- Vite splits React, React Router, React Flow, Base UI, and icons into stable
  vendor chunks.
- Palette items, node cards, and playback charts are memoized; editor callbacks
  are stable.
- Playback charts read a 4 Hz sample history, while the particle canvas reads
  simulation state outside React at animation-frame speed.
- Static top-level data (navigation, palette, toast configuration) is defined
  outside render functions.
- The engine runs in a Web Worker with a main-thread fallback that shares the
  same tick driver.

## Principles

- Local-first: never fetch application data at runtime.
- Learn from failure: every run should explain the bottleneck.
- Keep the model explainable; tunable numbers live in
  `features/simulation/engine/constants.ts`.
- Small, composable files with lowercase kebab-case names.
