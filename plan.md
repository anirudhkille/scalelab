# ScaleLab — System Design Stress-Testing Playground

> Design a system architecture on a canvas, hit it with simulated user load, watch it break, read *why* it broke, fix it, repeat.

**Instructions for the coding agent:** Read this whole file before writing code. Build in the milestone order in section 16. Do not skip the simulation tests. Ask no questions unless something is truly contradictory; where this plan is silent, choose the simplest option and note the decision in `DECISIONS.md`.

---

## 1. Product summary

ScaleLab is a **frontend-only** web app (no backend, no accounts, no network calls at runtime) for people learning system design.

Core loop:

1. The user picks a **challenge** (e.g. "Design a URL shortener") that comes with a requirements sheet: traffic numbers, read/write ratio, latency SLO, availability target, and a budget.
2. The user **drags components** (client, load balancer, app server, cache, DB, queue, CDN...) onto a canvas, wires them together and tunes their parameters.
3. The user presses **Run load test**. Simulated users flow visually through the graph as animated particles while the load ramps up.
4. When any component overloads and the system violates the SLO, the test **stops** and a **Failure Report** says what broke, why, at how many users, and gives hints (not full answers).
5. The user changes the architecture and re-runs. The app tracks **max users sustained**, **cost**, and **stars** per challenge.
6. All progress (designs, best scores, attempts) is saved in **localStorage**.

The learning value is in step 4. The explanation of the bottleneck is the most important feature in the product.

### Non-goals (do NOT build)

- No backend, auth, database, or cloud sync.
- No real network/queue/DB simulation at the packet level. This is a **simplified fluid (rate-based) model**, not a faithful emulator.
- No multiplayer, no AI/LLM calls in the app.
- No mobile-first layout (desktop-first; must not crash on tablet).

---

## 2. Tech stack (fixed)

| Concern | Choice |
|---|---|
| Build tool | **Vite** + React **19** + TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) |
| Styling | **Tailwind CSS v4** (CSS-first config via `@theme`) |
| UI components | **shadcn/ui on Base UI** (`@base-ui/react`, components copied into the repo via `npx shadcn@latest init`, which defaults to Base UI) + `lucide-react` icons. See 2.1 |
| Animation | **Motion** (`motion/react`, formerly Framer Motion) for UI; **HTML Canvas** for particles |
| Canvas / graph editor | **@xyflow/react** (React Flow v12) |
| State | **Zustand** with `persist` middleware (localStorage) + `immer` |
| Validation | **Zod** (validate challenges and imported/persisted JSON) |
| Charts | **Recharts** for the live metrics panel (keep it light) |
| Simulation runtime | Pure TS engine running in a **Web Worker** (optional: `comlink`) |
| Routing | **React Router** (or TanStack Router) |
| Testing | **Vitest** (engine unit tests, required), **Testing Library** (a few UI tests), **Playwright** (1 smoke test, optional) |
| Lint/format | ESLint (flat config) + Prettier + `prettier-plugin-tailwindcss` |
| Package manager | pnpm |

### 2.1 Why Base UI instead of Radix (decision, already made)

- As of July 2026, shadcn/ui makes **Base UI the default** for new projects. Radix is not deprecated and still supported, but Base UI is where the momentum is.
- Base UI is at v1.x (stable since Dec 2025), maintained by a dedicated team (ex-Radix / Floating UI / MUI). It has 35 components, including Combobox, Autocomplete, Toast and NumberField, which Radix lacks. NumberField is useful for the Inspector parameter inputs.
- **Package name is `@base-ui/react`.** The old `@base-ui-components/react` name is obsolete; the agent must never install or import it. Older blog posts and tutorials use the old name.
- Base UI uses the **`render` prop** for composition, not Radix's `asChild`. Style state with data attributes (e.g. `data-[open]`, `data-[checked]`) rather than Radix's `data-[state=open]`. Because shadcn generates the components, the agent mostly won't write this by hand, but must follow the generated pattern when extending components.
- Use `npx shadcn@latest add <component>` for components. Do not hand-copy components from Radix-based snippets found online, since the APIs differ.
- Components needed: Button, Dialog, Drawer/Sheet, Tabs, Tooltip, Popover, Select, Slider, Switch, NumberField (or Input), Toggle Group, Dropdown Menu, Toast (Sonner or Base UI Toast), Badge, Progress, Separator, ScrollArea, Command (for the palette search, stretch).
- If a Base UI component is buggy or missing, the fallback is a Radix primitive for that one component. Log it in `DECISIONS.md`.

Rules:
- No `any`. No `// @ts-ignore`. Use `type`, never `interface` (see 5.1 for all type conventions).
- Code is organized **by feature** (see section 13). Features talk to each other only through their `index.ts` public API.
- The simulation engine (`src/features/simulation/engine`) must have **zero React imports** and be fully unit-testable.
- Must work offline once loaded. No analytics, no CDNs for fonts (self-host via `@fontsource-variable/*`).

---

## 3. Design direction

Dark-first "ops console / mission control" feel, with a light theme toggle.

- Fonts: `Inter Variable` for UI, `JetBrains Mono Variable` for numbers/metrics.
- Palette (CSS variables via Tailwind `@theme`): near-black slate background, one accent (electric cyan or violet), semantic colors: green = healthy (<60% util), amber = warm (60-85%), red = saturated (>85%), pulsing red = dropping requests.
- Nodes glow subtly by health. Edges show animated particles whose density reflects flow rate.
- Motion should be purposeful: node shake + red flash on failure, smooth number tweening on metrics. Respect `prefers-reduced-motion` (disable particles' flourish, keep static health colors).
- Accessible: all controls keyboard reachable, color is never the only health signal (add icon + text label e.g. "SATURATED"), WCAG AA contrast.

### 3.1 Theme system and colors

Implementation:
- Define all colors as **CSS variables in OKLCH** inside `src/styles/theme.css`, mapped to Tailwind with Tailwind v4's `@theme inline` so utilities like `bg-surface`, `text-muted`, `border-line`, `text-health-ok` work.
- Keep the **shadcn variable names** (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`) so generated shadcn components pick up the theme automatically. Add ScaleLab-specific tokens on top (below).
- Themes are switched with a `data-theme` attribute on `<html>`. Dark mode is the default. Persist the choice in settings. Respect `prefers-color-scheme` on first visit.
- Ship **4 themes** in MVP: `midnight` (default dark, cyan accent), `violet` (dark, violet accent), `terminal` (dark, green/amber accent), `paper` (light, blue accent). Each theme only overrides the variables below; no component may hard-code a hex color.
- Provide a theme picker in the top bar (small popover with swatches) and in Settings.

**Base tokens: `midnight` (default)**

```css
[data-theme="midnight"] {
  --background:        oklch(0.145 0.012 255);  /* app bg, near-black blue-slate */
  --foreground:        oklch(0.965 0.005 255);  /* primary text */
  --card:              oklch(0.185 0.014 255);  /* panels */
  --card-foreground:   oklch(0.965 0.005 255);
  --popover:           oklch(0.205 0.015 255);
  --popover-foreground:oklch(0.965 0.005 255);
  --primary:           oklch(0.82 0.13 205);    /* electric cyan */
  --primary-foreground:oklch(0.16 0.02 230);
  --secondary:         oklch(0.245 0.016 255);
  --secondary-foreground: oklch(0.93 0.008 255);
  --muted:             oklch(0.245 0.016 255);
  --muted-foreground:  oklch(0.70 0.02 255);    /* must stay >= 4.5:1 on background */
  --accent:            oklch(0.28 0.03 225);
  --accent-foreground: oklch(0.96 0.01 225);
  --destructive:       oklch(0.66 0.22 25);
  --border:            oklch(0.30 0.018 255);
  --input:             oklch(0.30 0.018 255);
  --ring:              oklch(0.82 0.13 205);
  --radius:            0.625rem;

  /* ScaleLab tokens */
  --canvas-bg:         oklch(0.125 0.012 255);  /* React Flow canvas */
  --canvas-grid:       oklch(0.25 0.015 255 / 0.6);
  --edge:              oklch(0.45 0.03 240);
  --edge-active:       oklch(0.82 0.13 205);

  /* health states (nodes, meters, particles) */
  --health-ok:         oklch(0.80 0.17 155);    /* green, util < 60% */
  --health-warm:       oklch(0.82 0.16 80);     /* amber, 60-85% */
  --health-hot:        oklch(0.72 0.19 45);     /* orange, 85-100% */
  --health-fail:       oklch(0.66 0.22 25);     /* red, dropping requests */
  --health-idle:       oklch(0.55 0.02 255);    /* grey, no traffic */

  /* traffic classes (particles, edge legends, charts) */
  --traffic-read:      oklch(0.80 0.13 215);    /* cyan-blue */
  --traffic-write:     oklch(0.78 0.16 320);    /* magenta */
  --traffic-static:    oklch(0.84 0.14 100);    /* yellow-green */

  /* component-kind accents (icon tint / node header stripe) */
  --kind-clients:      oklch(0.80 0.10 255);
  --kind-edge:         oklch(0.80 0.13 190);    /* CDN, DNS, gateway */
  --kind-compute:      oklch(0.78 0.15 280);    /* LB, app server, worker */
  --kind-cache:        oklch(0.80 0.16 60);
  --kind-data:         oklch(0.76 0.14 150);    /* DB, object storage */
  --kind-queue:        oklch(0.76 0.17 340);

  /* chart series (colorblind-safe order) */
  --chart-1: oklch(0.80 0.13 215);
  --chart-2: oklch(0.78 0.16 320);
  --chart-3: oklch(0.84 0.14 100);
  --chart-4: oklch(0.72 0.17 40);
  --chart-5: oklch(0.75 0.12 160);
}
```

**Other themes** override only what differs:

| Token | `violet` (dark) | `terminal` (dark) | `paper` (light) |
|---|---|---|---|
| `--background` | oklch(0.15 0.02 290) | oklch(0.14 0.01 150) | oklch(0.985 0.003 250) |
| `--card` | oklch(0.19 0.025 290) | oklch(0.18 0.012 150) | oklch(1 0 0) |
| `--foreground` | oklch(0.965 0.006 290) | oklch(0.94 0.03 150) | oklch(0.20 0.02 255) |
| `--primary` | oklch(0.74 0.17 295) | oklch(0.84 0.20 150) | oklch(0.52 0.20 260) |
| `--primary-foreground` | oklch(0.15 0.03 295) | oklch(0.15 0.03 150) | oklch(0.98 0 0) |
| `--border` | oklch(0.31 0.03 290) | oklch(0.30 0.03 150) | oklch(0.90 0.008 250) |
| `--canvas-bg` | oklch(0.13 0.02 290) | oklch(0.115 0.01 150) | oklch(0.97 0.004 250) |
| `--muted-foreground` | oklch(0.70 0.03 290) | oklch(0.72 0.04 150) | oklch(0.45 0.02 255) |

In `paper`, darken the health and traffic colors (lower lightness to about 0.55 to 0.65) so they keep contrast against white. The agent should adjust until the contrast checks below pass.

**Rules:**
- Health color is always paired with an icon and text label (e.g. "SATURATED"), never color alone.
- Run a contrast check for text tokens against their backgrounds in all 4 themes (WCAG AA: 4.5:1 body, 3:1 large text and UI borders). Put the results in `DECISIONS.md`. Add a Vitest test that computes contrast for the key pairs so a theme edit that breaks accessibility fails CI.
- Canvas particle layer reads colors from CSS variables at theme change (via `getComputedStyle`) and caches them; it must not parse CSS every frame.
- Typography tokens: `--font-sans: "Inter Variable"`, `--font-mono: "JetBrains Mono Variable"`. Use `font-variant-numeric: tabular-nums` on all live metrics so numbers don't jitter.
- Radius, spacing and shadow scales live in the same `theme.css`. Use subtle glows (`box-shadow: 0 0 0 1px var(--health-*), 0 0 24px -6px var(--health-*)`) for node health, not heavy drop shadows.

---

## 4. App structure and screens

Routes:

- `/` **Challenge Hub**: grid of challenge cards with difficulty, concepts tags, best stars, locked/unlocked state (unlock by finishing earlier tier or just show all in MVP).
- `/challenge/:id` **Workspace**: the main screen (below).
- `/progress` **Progress**: stats, attempt history, export/import/reset data.
- `/learn` **Concept Cards** (stretch): short explainer for each component (what it does, when to use it, trade-offs).

### Workspace layout (desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Top bar: challenge title | Requirements ▾ | Run ▶ / Stop ■ | Speed   │
├───────────┬──────────────────────────────────────────┬───────────────┤
│ Palette   │            Canvas (React Flow)           │ Inspector     │
│ (drag     │   particles overlay (canvas element)     │ (selected     │
│ components│                                          │ node params,  │
│  + cost)  │                                          │ live stats)   │
├───────────┴──────────────────────────────────────────┴───────────────┤
│ Bottom: Live metrics (users, RPS, p95 latency, error %, cost)        │
│         + load-ramp timeline + event log                             │
└──────────────────────────────────────────────────────────────────────┘
```

- **Requirements drawer**: shows the challenge brief, numeric requirements, budget, SLOs, and a checklist that turns green as met.
- **Failure Report modal**: appears when a test ends in failure (see section 9).
- **Result modal**: appears on success with stars, cost, max users, and "Next challenge".
- Palette items show **cost/month** and a one-line description with a tooltip.
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z) for canvas edits. Delete key removes selection. Duplicate with Ctrl+D.
- Canvas is **locked while a test runs** (read-only), except for the Stop button.

---

## 5. Domain model and type conventions (TypeScript)

### 5.1 Type conventions (apply everywhere, enforced by lint)

1. **Use `type`, not `interface`**, for all object shapes, unions, props and function signatures. Enforce with ESLint `@typescript-eslint/consistent-type-definitions: ['error', 'type']`. No declaration merging anywhere.
2. **Zod is the single source of truth for data that is persisted, imported or authored** (challenges, saved designs, attempts, settings). Write the schema first and derive the type: `type Challenge = z.infer<typeof challengeSchema>`. Never hand-write a second copy of the same shape.
3. **Plain `type` for in-memory-only shapes** (simulation snapshots, UI props, store state).
4. **No `enum`.** Use `as const` arrays/objects and derive unions: `const NODE_KINDS = [...] as const; type NodeKind = (typeof NODE_KINDS)[number];`.
5. **Discriminated unions** for anything with variants (component params per `NodeKind`, failure types, load stages, store actions). Always switch exhaustively with a `assertNever(x: never)` helper in the default branch.
6. **Branded IDs** so ids cannot be mixed up: `type NodeId = string & { readonly __brand: 'NodeId' }`, likewise `EdgeId`, `ChallengeId`, `AttemptId`. Create them only through small constructor functions.
7. **Units in names or brands** for numbers that are easy to confuse: `rps`, `ms`, `usd`, `gb` suffixes in field names (e.g. `latencyP95Ms`, `capacityRps`, `monthlyBudgetUsd`). Ratios are always `0..1`, named `...Ratio` (never percentages).
8. Use `satisfies` for typed constant tables (component catalog, theme maps, challenge definitions) so literals stay narrow but are checked.
9. Use `import type { ... }` for type-only imports (`verbatimModuleSyntax: true`).
10. Prefer `readonly` arrays/fields for engine inputs and challenge data. The engine never mutates its inputs.
11. **Types live with their feature** (`features/<name>/types.ts` or next to their Zod schema) and are exported through that feature's `index.ts`. A type is moved to `shared/` only when 3 or more features need it.
12. Every public function of a feature has explicit parameter and return types. Inferred types are fine for local variables only.

### 5.2 Core types (suggested shapes; adapt names, keep the semantics)

Written as `type` aliases. Where a schema is mentioned, define the Zod schema and derive the type.

```ts
// features/architecture/types.ts
export const NODE_KINDS = [
  'clients', 'dns', 'cdn', 'loadBalancer', 'apiGateway', 'rateLimiter',
  'appServer', 'cache', 'database', 'queue', 'worker', 'objectStorage',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export type NodeId = string & { readonly __brand: 'NodeId' };
export type EdgeId = string & { readonly __brand: 'EdgeId' };

export type TrafficClass = 'read' | 'write' | 'static';
export type TrafficRate = Readonly<Record<TrafficClass, number>>; // requests/sec

// discriminated union keyed by kind (see section 7 for ranges)
export type ComponentParams =
  | { kind: 'appServer'; instances: number; rpsPerInstance: number; baseLatencyMs: number; statefulSessions: boolean }
  | { kind: 'cache'; memoryGb: number; ttlSec: number }
  | { kind: 'database'; instanceSize: 'small' | 'medium' | 'large' | 'xlarge'; readReplicas: number; shards: number; replication: 'sync' | 'async' }
  | { kind: 'loadBalancer'; algorithm: 'roundRobin' | 'leastConn' | 'ipHash'; capacityRps: number }
  // ...one variant per NodeKind

export type ArchNode = {
  id: NodeId;
  label: string;
  position: { x: number; y: number };
  params: ComponentParams; // params.kind is the node kind
};

export type ArchEdge = {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  weight?: number;                 // routing weight; omitted = split evenly
  carries?: readonly TrafficClass[]; // omitted = all classes
};

export type Architecture = {
  nodes: readonly ArchNode[];
  edges: readonly ArchEdge[];
  schemaVersion: number;
};
```

```ts
// features/challenges/schema.ts  (Zod first, type derived)
export const challengeSchema = z.object({
  id: challengeIdSchema,
  title: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  concepts: z.array(z.string()),
  briefMd: z.string(),
  requirements: z.object({
    targetUsers: z.number().int().positive(),   // concurrent users to survive
    requestsPerUserPerSec: z.number().positive(),
    readRatio: ratio,                           // share of dynamic requests that are reads
    staticRatio: ratio,                         // share of all requests that are static assets
    workingSetGb: z.number().positive(),        // hot data size, drives cache hit ratio
    dataSizeGb: z.number().positive(),          // total data, drives DB/shard needs
    latencyP95Ms: z.number().positive(),        // SLO
    maxErrorRatio: ratio,                       // e.g. 0.01
    availabilityRatio: ratio.optional(),        // e.g. 0.999, phase 2 failure injection
    monthlyBudgetUsd: z.number().positive(),
  }),
  loadProfile: z.array(loadStageSchema),
  failureScenarios: z.array(failureEventSchema).optional(), // stretch (phase 2)
  allowedComponents: z.array(z.enum(NODE_KINDS)),
  starterArchitecture: architectureSchema.optional(),
  hints: z.array(z.string()),                   // progressive, shown one at a time
  learningGoals: z.array(z.string()),
});
export type Challenge = z.infer<typeof challengeSchema>;
```

```ts
// features/simulation/types.ts  (in-memory only, plain types)
export type LoadStage = { durationSec: number; fromUsers: number; toUsers: number };

export type NodeSnapshot = {
  nodeId: NodeId;
  utilizationRatio: number;
  queueDepth: number;
  servedRps: number;
  droppedRps: number;
  latencyMs: number;
};

export type FailureReason =
  | { type: 'errorRate'; observedRatio: number }
  | { type: 'latencySlo'; observedP95Ms: number }
  | { type: 'queueOverflow'; nodeId: NodeId }
  | { type: 'storageExhausted'; nodeId: NodeId };

export type RunOutcome =
  | { status: 'passed'; maxUsersSustained: number; costUsd: number }
  | { status: 'failed'; atUsers: number; reason: FailureReason; rootCauseNodeId: NodeId };
```

All challenge data is validated by Zod at load time. Challenges live in `src/features/challenges/data/*.ts` as typed constants declared with `satisfies` (not fetched).

---

## 6. Simulation engine (the heart of the app)

Location: `src/features/simulation/engine/`. Pure TypeScript, deterministic given a seed. Runs in a Web Worker (`src/features/simulation/worker/`) and posts snapshots to the main thread ~20 times/sec.

### 6.1 Approach: fluid / rate-based tick model

Do **not** simulate individual requests (100k RPS would melt the browser). Simulate **flow rates** per second at a fixed timestep, `dt = 0.1s` of simulated time. A "speed" control runs more ticks per wall-clock frame (1x, 2x, 5x, 10x).

Per tick:

1. Compute **offered load** at the Clients node from the load profile: `users(t) * requestsPerUserPerSec`, split into `{read, write, static}` using challenge ratios.
2. Traverse the architecture in **topological order** (graph must be a DAG; validate before run and show an error if there's a cycle or an orphan).
3. For each node, apply its behavior function: given incoming rates, it returns `{ outputs: per-outgoing-edge rates, served, dropped, utilization, latencyMs }`.
4. Update each node's **queue** (see below).
5. Compute end-to-end metrics for the tick.
6. Check **failure conditions**.

### 6.2 Generic node model

Each node has `capacityRps` (effective, derived from params), a `queue` (in requests), and `maxQueue`.

```
incoming = λ
processable = capacityRps * dt                       // per tick
backlog = queue + λ*dt
served = min(backlog, processable)
newQueue = backlog - served
dropped = max(0, newQueue - maxQueue)                // overflow is dropped -> errors
queue = min(newQueue, maxQueue)
utilization = min(1, λ / capacityRps)                // also report raw ratio
latencyMs = baseLatencyMs + (queue / capacityRps) * 1000
```

Dropped requests count as errors for the whole request chain. Latency along a path is the sum of node latencies (use traffic-weighted average for p50; derive p95 via the multiplier below).

**p95 approximation:** `p95 ≈ avgLatency * (1 + 1.5 * utilization^3)` plus the queue wait term. Keep it simple, deterministic, document it in `ENGINE.md`. Do not claim it is statistically exact.

### 6.3 Traffic classes

Three classes flow through the graph: `read`, `write`, `static`. This is what makes caching, replicas, CDN and queues meaningful.

- `static` is served by CDN (if present, with its hit ratio) or falls through to app servers / object storage.
- `read` can be served by cache; misses go to DB (or read replicas).
- `write` bypasses cache (write-through variant optional, stretch), goes to the primary DB or a queue.

### 6.4 Component behaviors (MVP set)

Parameters are user-editable in the Inspector within allowed ranges; each has a **monthly cost**.

| Component | Key params | Behavior |
|---|---|---|
| **Clients** | (fixed, comes from challenge) | Source of all traffic. Cannot be deleted. |
| **DNS** (stretch) | none | Pass-through, adds ~20ms latency; no capacity limit. |
| **CDN** | `hitRatio` (derived from `staticRatio` & TTL; default 0.9), `capacityRps` huge | Absorbs `static` traffic: serves `hitRatio` itself, forwards the remaining `(1-hit)` downstream. Latency ~15ms. Cost scales with GB egress (approximate). |
| **Load Balancer** | `algorithm: roundRobin \| leastConn \| ipHash`, `capacityRps` (e.g. 50k) | Splits incoming evenly across healthy outgoing edges (weights if set). `ipHash` + skew adds a hot-spot penalty (one target gets +X%). Single LB is a **single point of failure** (matters for availability tests). Latency ~1ms. |
| **API Gateway / Rate Limiter** (stretch) | `limitRps` | Drops above limit with clear "rate limited" reason (counted separately from overload errors, a 429 not a 5xx). |
| **App Server** | `instances` (1-50), `rpsPerInstance` (default 300), `baseLatencyMs` (default 30), `statefulSessions: boolean` | `capacity = instances * rpsPerInstance`. Behind an LB, scales horizontally. If `statefulSessions` is true and fed by a LB with `roundRobin`, apply an efficiency penalty (sticky-session problem) and show a hint. Forwards reads to cache/DB, writes to DB/queue. |
| **Cache** (Redis-like) | `memoryGB`, `ttlSec`, `evictionPolicy` (cosmetic in MVP) | `hitRatio = clamp(memoryGB / workingSetGB, 0, 1) ^ 0.6 * 0.98` (document formula; tunable). Hits served at ~1ms with high capacity (~80k rps per node). Misses forwarded to DB. Cold start: hit ratio ramps from 0 to steady over ~20 simulated seconds (shows the *cache stampede / cold cache* effect). Stretch: `nodes` for cache cluster. |
| **Database (SQL)** | `readCapacityRps`, `writeCapacityRps` (derived from `instanceSize: small\|medium\|large\|xlarge`), `readReplicas` (0-5), `shards` (1-16), `replication: sync\|async` | Primary handles all writes; reads go to primary + replicas (`readCapacity * (1 + replicas)`). `shards` multiplies write capacity and read capacity but applies a **hot-shard skew factor** (e.g. busiest shard gets `1 + 0.3*(1 - 1/shards)` of its fair share) so sharding isn't free magic. Sync replication reduces write capacity ~30% but reports 0 lag; async reports replication lag growth under write pressure (stretch). Latency grows steeply with utilization. Storage limit: if `dataSizeGB` exceeds `shards * maxStoragePerShardGB`, add a storage-exhausted failure. |
| **Queue** (Kafka/SQS-like) | `maxDepth`, `throughputRps` | Absorbs `write` bursts and drains to Workers at the consumers' rate. Queue depth is visible. Overflow beyond `maxDepth` drops. Makes the write path **async**: users see low latency, but "freshness lag" is shown in metrics. |
| **Worker** | `instances`, `rpsPerInstance` | Consumes from the Queue and writes to DB. If the DB is saturated, the queue backs up (visible backpressure). |
| **Object Storage** (stretch) | none | Near-unlimited capacity for static/blob traffic; ~40ms latency. |

All numbers above are defaults and must live in one file, `src/features/simulation/engine/constants.ts`, so they're easy to tune. Add a comment: **"Educational approximations, not benchmarks."**

### 6.5 Load profile

```ts
type LoadStage = { durationSec: number; fromUsers: number; toUsers: number };
```

Default ramp for a challenge: linear ramp from 0 to `targetUsers * 2` over ~60 simulated seconds, then hold. The test ends when:

- **Failure:** a failure condition holds continuously for ≥ 3 simulated seconds (avoid flapping), or
- **Success:** the system holds the full `targetUsers` for 15 simulated seconds meeting all SLOs, and the ramp continues to the stretch ceiling (`2x target`) for bonus stars.

The "max users sustained" metric = last user count at which SLOs were all met.

### 6.6 Failure conditions (checked every tick, aggregated over a 3s window)

1. **Error rate** `> maxErrorRate`  → "Dropped requests / overload".
2. **p95 latency** `> latencyP95Ms` → "SLO latency breach".
3. **Any node** `queue >= maxQueue` and dropping → "Queue overflow at <node>".
4. **Storage exhausted** on DB.
5. (Phase 2) **Availability** falls below target during failure injection.

For each failure, record the **root-cause node**: the *upstream-most* saturated node on the path, not the one that merely shows symptoms. Algorithm: among nodes with utilization > 0.95 or dropping, pick the one closest to the data-source side that is saturated by its own capacity, not by receiving a reduced load. Document the heuristic and unit test it with 3 scenarios (single DB bottleneck, cache undersized, LB capacity).

### 6.7 Determinism and testing requirements

- Seeded PRNG (e.g. mulberry32) only for the tiny jitter on latency, optional. The default must be fully deterministic with jitter off, so tests are exact.
- Required unit tests (Vitest) in `src/features/simulation/__tests__`:
  - Single app server below capacity: no drops, utilization = λ/cap.
  - Single app server above capacity: queue grows then drops; error rate matches the expected formula.
  - LB splits evenly across 3 servers; capacity triples.
  - Cache hit ratio formula, and cold-start ramp.
  - DB with read replicas: read capacity scales; writes don't.
  - Sharding with skew: capacity < N× linear.
  - Queue absorbs a write burst; backpressure appears when the worker is slower.
  - Cycle detection and orphan-node validation errors.
  - Root-cause identification in 3 scenarios.
  - Whole-run test: a known "good" architecture passes challenge 1; a known "naive" one fails at a predictable user count (snapshot the number, with tolerance).

---

## 7. Component parameter ranges & costs (defaults, tune in constants)

| Component | Param | Range | Cost/month (illustrative) |
|---|---|---|---|
| App Server | instances | 1-50 | $40 per instance |
| Load Balancer | (single) | n/a | $25 |
| Cache | memoryGB | 1-256 | $15 per GB |
| DB | instanceSize S/M/L/XL | 4 tiers | $60 / $200 / $600 / $1800 |
| DB | readReplicas | 0-5 | same as the primary's tier each |
| DB | shards | 1-16 | × primary cost |
| Queue | throughput tier | 3 tiers | $30 / $120 / $400 |
| Worker | instances | 1-50 | $30 per instance |
| CDN | (flat + egress) | n/a | $50 base |

Show a live **cost meter** in the top bar; exceeding the budget blocks "success" (marks the design as "over budget") but still allows the test run.

---

## 8. Visualization requirements

### 8.1 Canvas and nodes

- Custom React Flow node component per kind: icon, label, health ring, mini utilization bar, and queue-depth bar. During a run, nodes read from a **simulation snapshot store** (a separate Zustand store updated at ~20 Hz from the worker; use selectors so only affected nodes re-render).
- Edge component: animated dashed line, thickness proportional to flow rate (log-scaled).
- **Do not** render a React node per particle.

### 8.2 Particle layer

- A single `<canvas>` overlay synced to React Flow's viewport transform (pan/zoom).
- Particles spawn on edges at a rate proportional to flow, but **capped** (e.g. max ~400 live particles) and sampled: 1 particle represents N requests (display "1 dot ≈ N req/s" legend).
- Particle color: green (served), red (dropped), and they burst/fade at a node when dropped.
- Use `requestAnimationFrame`, object pooling, no allocations in the hot loop.
- Must hold 60 FPS on a mid laptop with a 15-node graph.

### 8.3 "Users arriving" visual

A "Clients" node that shows an animated crowd counter (e.g. `12,480 users`) with little dots streaming in. When the test fails, the stream visibly stops and the screen shows a short "system overloaded" overlay with a red vignette.

### 8.4 Live metrics panel

Recharts line charts with ~60s rolling windows: users, RPS served vs dropped, p95 latency (with SLO line), error %, per-selected-node utilization. Throttle chart updates to ~4 Hz.

---

## 9. Failure Report (key feature)

When a run ends in failure, show a modal with:

1. **Headline:** "Your system fell over at **14,200 users**."
2. **Primary bottleneck:** node name + a plain-English reason, e.g. *"Your Database hit 100% read capacity. 94% of requests are reads and every read goes to one instance."*
3. **Evidence:** 3-4 numbers (node utilization, queue depth, error rate, p95 vs SLO) and a small chart snapshot of the 10 seconds before failure.
4. **Why it matters:** a 2-3 sentence concept explanation (read-heavy workloads → caching / replicas).
5. **Nudge, not answer:** the first unlocked hint as a question, e.g. *"What could absorb repeated reads before they reach the DB?"* with "Show next hint" (up to 3 levels; the last level names the technique but not the exact config).
6. Buttons: **Edit design**, **Run again**, **Compare with previous attempt**.

The explanation text comes from **rule templates** in `src/features/diagnosis/rules/` keyed by `(nodeKind, failureType, trafficMix)`. Write at least 15 rules covering: DB read-bound, DB write-bound, DB storage, app server CPU-bound, app server stateful sessions, LB capacity/SPOF, cache too small, cache cold start, queue overflow, worker too slow, CDN missing for static-heavy traffic, rate-limit tripped, cost over budget, no redundancy (availability).

---

## 10. Challenges (content)

Ship these in MVP (first 5 required, rest as stretch). Each needs a brief, numbers, 3 hints, and learning goals. Keep numbers coherent with the engine constants; verify via engine tests that the naive design fails and at least one reference solution passes.

1. **Personal Blog / Portfolio**: warm-up. 1k users, static-heavy. Teaches: single server limits, CDN.
2. **URL Shortener**: 50k users, 100:1 read/write. Teaches: cache, read replicas, ID generation concerns (explained in text).
3. **Photo Sharing Feed (Instagram-lite)**: static media heavy plus a feed. Teaches: CDN, object storage, cache, async processing.
4. **Chat / Notifications**: write-heavy, bursty. Teaches: queues, workers, backpressure, async writes.
5. **E-commerce Flash Sale**: sudden spike (step load, not ramp). Teaches: cache, queue to absorb orders, rate limiting, stock consistency discussion.
6. *(stretch)* **Ride Hailing Locations**: write-heavy hot data. Teaches: sharding, in-memory stores.
7. *(stretch)* **Video Streaming**: bandwidth-bound, CDN heavy.
8. *(stretch)* **Twitter-like Timeline**: fan-out on write vs read.
9. *(stretch)* **Rate-limited Public API**: gateway + limiter.
10. *(stretch)* **Global Multi-region Service**: introduce regions (needs engine extension, phase 3).

Each challenge ships with a `referenceSolution: Architecture` used **only** by tests and a hidden "Show a sample solution" button (unlocked after 3 failed attempts, with a confirmation dialog).

---

## 11. Scoring and progression

Stars per challenge (max 3):

- ★ Survived `targetUsers` meeting SLOs.
- ★★ Also within budget.
- ★★★ Also survived `2x targetUsers` (headroom) **or** passed failure injection (phase 2).

Also track per attempt: max users sustained, cost, SLO pass/fail, timestamp, architecture snapshot (for compare/restore). Keep the last 20 attempts per challenge.

Progress page: total stars, challenges completed, concepts-learned tags, a simple streak counter (days practiced), and best score per challenge.

---

## 12. Persistence (localStorage)

Use Zustand `persist` with a **versioned** key, `scalelab:v1`.

Store:
- `designs[challengeId]`: current working architecture (autosave, debounced 500ms).
- `attempts[challengeId]`: list of attempt records.
- `progress`: stars/best per challenge.
- `settings`: theme, sim speed, reduced motion override, particles on/off.
- `hintsUnlocked[challengeId]`.

Requirements:
- Validate on hydrate with Zod; on failure, back up the corrupt blob to `scalelab:v1:corrupt-<timestamp>` and start fresh, showing a toast.
- `migrate` function stub for future versions.
- **Export** all data as a JSON file and **Import** from a JSON file (validated) on the Progress page.
- **Reset** with a confirmation dialog.
- Handle `QuotaExceededError` gracefully (toast, don't crash).
- Simulation snapshots are **never** persisted.

---

## 13. Project structure (feature-based)

Organize by **feature (domain), not by file type**. Each feature owns its UI, state, types, logic and tests, and exposes a small public API through `index.ts`. This keeps the app easy to extend (e.g. adding failure injection or multi-region later touches one or two features, not every folder).

```
scalelab/
├─ plan.md
├─ DECISIONS.md            # agent logs judgement calls here
├─ ENGINE.md               # simulation model and formulas
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig*.json
├─ eslint.config.js        # includes import-boundary rules (see 13.2)
├─ src/
│  ├─ main.tsx
│  ├─ app/                 # composition root ONLY: router, providers, layout, error boundary
│  │  ├─ router.tsx
│  │  ├─ providers.tsx
│  │  ├─ layouts/
│  │  └─ pages/             # app-level fallbacks (not-found)
│  ├─ features/
│  │  ├─ architecture/     # the design the user builds
│  │  │  ├─ components/    # canvas, node renderers, edge renderer, palette, inspector forms
│  │  │  ├─ model/         # types.ts, schema.ts, component catalog (costs, ranges), graph validation, topo sort
│  │  │  ├─ store/         # design store (nodes/edges, undo/redo, autosave hook)
│  │  │  ├─ hooks/
│  │  │  ├─ __tests__/
│  │  │  └─ index.ts       # public API
│  │  ├─ challenges/       # briefs, requirements, hub
│  │  │  ├─ pages/         # hub route screen
│  │  │  ├─ components/    # hub grid, challenge card, requirements drawer
│  │  │  ├─ data/          # challenge definitions + reference solutions
│  │  │  ├─ schema.ts      # Zod schema + derived types
│  │  │  └─ index.ts
│  │  ├─ simulation/       # the engine + runner. NO React inside engine/
│  │  │  ├─ engine/        # constants.ts, tick loop, nodes/<kind>.ts behaviors, metrics.ts
│  │  │  ├─ worker/        # worker entry + typed message protocol
│  │  │  ├─ runner/        # SimulationRunner type (worker or main-thread)
│  │  │  ├─ store/         # live snapshot store (separate from design store)
│  │  │  ├─ hooks/         # useSimulation, useRunControls
│  │  │  ├─ pages/         # engine playground route screen
│  │  │  ├─ types.ts
│  │  │  ├─ __tests__/     # required engine unit tests (see 6.7)
│  │  │  └─ index.ts
│  │  ├─ playback/         # visualizing a run
│  │  │  ├─ components/    # particle canvas layer, live metric charts, crowd counter, failure overlay
│  │  │  ├─ lib/           # particle pool, color cache
│  │  │  └─ index.ts
│  │  ├─ diagnosis/        # root cause + failure explanations
│  │  │  ├─ rules/         # rule templates keyed by (nodeKind, failureType, trafficMix)
│  │  │  ├─ components/    # FailureReportModal, ResultModal, hints UI
│  │  │  ├─ __tests__/
│  │  │  └─ index.ts
│  │  ├─ progress/         # attempts, stars, history, compare, export/import
│  │  │  ├─ pages/         # progress route screen
│  │  │  ├─ components/
│  │  │  ├─ store/         # attempts + stars (persisted)
│  │  │  ├─ scoring.ts
│  │  │  └─ index.ts
│  │  ├─ settings/         # theme, speed, reduced motion, particles toggle
│  │  │  ├─ components/    # theme picker
│  │  │  ├─ store/
│  │  │  └─ index.ts
│  │  ├─ workspace/        # COMPOSES the features above into the main screen
│  │  │  ├─ pages/         # challenge workspace route screen
│  │  │  ├─ components/    # topbar, layout shell, bottom panel, run button
│  │  │  └─ index.ts
│  │  └─ learn/            # (stretch) concept cards
│  │     ├─ pages/         # learn route screen
│  │     └─ index.ts
│  ├─ shared/              # no feature knowledge; usable by any feature
│  │  ├─ ui/               # shadcn components (Base UI)
│  │  ├─ lib/              # cn(), formatters, assertNever, ids/brands, contrast helper
│  │  ├─ hooks/
│  │  ├─ storage/          # versioned persist helpers, Zod hydrate, export/import utils
│  │  ├─ types/            # only types used by 3+ features
│  │  └─ styles/           # tailwind entry, theme.css (tokens, 4 themes)
└─ tests/e2e/              # optional playwright smoke test
```

### 13.1 Feature rules

1. **Public API only.** Other code imports a feature only via `@/features/<name>` (its `index.ts`). Never deep-import `@/features/<name>/components/...` from outside the feature. Export only what others need (types, components, hooks); keep internals private.
2. **Dependency direction (no cycles):**
   `shared` → `architecture` → `challenges` → `simulation` → `diagnosis` → `progress` → `workspace` → `app`.
   A feature may import only from features to its left, plus `shared`. `settings` may be imported by any feature. `playback` may import `simulation` and `architecture`. If two features need to talk the other way, pass data through props or the `workspace` composition layer, or lift a type into `shared/types`.
3. **`simulation/engine` is pure TypeScript.** No React, no DOM, no Zustand imports. It can be run in Node by Vitest and in a Web Worker.
4. **One store per concern**, each inside its feature: design store (`architecture`), live snapshot store (`simulation`), attempts/stars (`progress`), settings (`settings`). Stores are exposed through hooks (`useDesign`, `useRunSnapshot`) from `index.ts`, never as raw store objects.
5. **Colocate tests** in each feature's `__tests__/` (or `*.test.ts` next to the file). Engine and diagnosis tests are mandatory; UI tests only for key flows.
6. **Naming:** folders and **all filenames are lowercase `kebab-case`** (e.g. `hub-page.tsx`, `use-appearance.ts`, `app-store.ts`); React component *identifiers* stay `PascalCase`; one exported component per file; hooks start with `use`. Shadcn-generated files keep their lowercase names.
7. **Route screens live inside their feature** under `features/<name>/pages/` and are exported from the feature `index.ts`. `src/routes` is not used; the router imports page components from feature public APIs. App-only fallbacks (not-found) live in `app/pages/`.
8. **Adding a new component kind** (e.g. `apiGateway`) must touch only: `architecture` (type + catalog entry + node renderer + inspector form), `simulation/engine/nodes/<kind>.ts` (behavior), and `diagnosis/rules` (explanations). No other feature changes. Document this checklist in `ENGINE.md`.

### 13.2 Enforcing the structure

- Path alias `@/*` → `src/*` in `tsconfig` and Vite.
- `scripts/check-conventions.mjs` (run as part of `bun run lint`) fails on: deep imports into another feature, imports that violate the dependency direction, any React/DOM/Zustand import under `features/simulation/engine`, and `interface`/`enum` declarations.
- `bun run lint` must pass in CI-style checks (see 14).

---

## 14. Quality bars (acceptance criteria)

The project is "done" for MVP when **all** are true:

1. `pnpm install && pnpm dev` works; `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass with zero errors.
2. Engine unit tests listed in 6.7 exist and pass.
3. A user can complete challenge 1 and 2 end to end: place components, connect, run, see particles, see a failure report, fix, pass, get stars.
4. Closing and reopening the browser restores designs, attempts and stars.
5. Particle layer keeps ~60 FPS with 15 nodes and 400 particles (check via the Performance panel; note the result in `DECISIONS.md`).
6. Invalid designs (cycle, node with no path to Clients, missing DB) are caught **before** run with a friendly message that highlights the offending node.
7. No console errors or warnings in normal use. No `any`, no `interface` (lint-enforced), no deep imports across features (lint-enforced).
8. Keyboard: can add (via palette focus + Enter), connect, delete nodes, run/stop, open the requirements drawer.
9. Light/dark themes both look intentional.
10. Lighthouse accessibility score ≥ 90 on the hub page.

---

## 15. Risks and guardrails

- **Over-modeling.** Resist adding realism. If a behavior can't be explained in two sentences in the failure report, leave it out of the MVP.
- **Re-render storms.** Keep simulation snapshots out of React state trees that contain the graph; use selector subscriptions and a separate store. Profile before optimizing.
- **Worker bridging pain.** If the worker causes blocker-level issues, the engine must also be runnable on the main thread via the same `SimulationRunner` type, choose via a flag.
- **Challenge balance.** Numbers must produce interesting failures. Provide a dev-only "Engine playground" route (`/dev/engine`) that runs headless sims and prints max users for a given architecture to tune constants quickly.
- **Don't reveal the answer too early.** Hints are progressive and gated.

---

## 16. Milestones (build in this order, commit after each)

**M0: Scaffold.** Vite + React 19 + TS strict, Tailwind v4, shadcn init (Base UI), ESLint/Prettier with the `type` rule and import-boundary rules, `@/*` alias, Vitest, router, theme tokens, dark/light toggle, empty feature folders with `index.ts`. Empty pages.

**M1: Engine core (no UI), in `features/architecture/model` and `features/simulation`.** Types and Zod schemas (5.1/5.2), graph validation, topo sort, generic node model, Clients, App Server, LB, run controller, metrics, failure detection. Unit tests 1-3 + validation tests. `ENGINE.md` v1.

**M2: Data components.** Cache (hit ratio + cold start), DB (replicas, shards, storage), Queue, Worker, CDN. Remaining unit tests. Root-cause diagnosis + 15 rule templates.

**M3: Canvas editor.** React Flow canvas, palette drag-and-drop, custom nodes, inspector param forms (Zod-validated), connect/delete/duplicate, undo/redo, cost meter, pre-run validation messages.

**M4: Run + visualize.** Worker integration, snapshot store, node health visuals, edge thickness, particle canvas layer, live metrics charts, speed control, stop/restart, failure overlay.

**M5: Challenges + reports.** Challenge hub, requirements drawer, challenges 1-5 with reference solutions and tuned numbers (via `/dev/engine`), Failure Report modal, Result modal with stars, hints system.

**M6: Persistence + progress.** Zustand persist with versioning/migration stub, Zod hydrate validation, export/import/reset, attempts history and compare view, Progress page.

**M7: Polish.** Motion transitions, empty states, onboarding tour (3-step coachmarks on first visit), keyboard shortcuts help dialog, accessibility pass, reduced-motion, performance pass, README with screenshots/GIF.

**Phase 2 (after MVP):** failure injection (kill node / slow DB / AZ outage) + availability scoring, rate limiter/API gateway, challenges 6-9, Learn page concept cards, cache write strategies, replication lag, shareable design via URL-encoded JSON.

**Phase 3:** multi-region, custom user-defined challenges (editor + import), sandbox mode with arbitrary load sliders.

---

## 17. Working agreements for the coding agent

- Work milestone by milestone; after each, run typecheck, lint, tests, and summarize what changed in one short paragraph.
- Keep all tunable numbers in `constants.ts`; never hard-code magic numbers in node logic.
- Follow the type conventions in 5.1 and the feature rules in 13.1. If a change needs a cross-feature import that breaks the dependency direction, stop and restructure (props, `workspace` composition, or `shared/types`) instead of adding an exception. Log it in `DECISIONS.md`.
- Prefer small, composable files over big ones. No file over ~300 lines without reason.
- Write the engine tests **before or together with** the node behaviors.
- Log every non-obvious decision in `DECISIONS.md` (one line each: decision, why).
- Do not add dependencies beyond section 2 without noting why in `DECISIONS.md`.
- Never fetch anything over the network at runtime.