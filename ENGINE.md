# ScaleLab engine

Status: **v2 (M2)**. Deterministic rate-based core with data-component models
and rule-based failure diagnosis.

The engine is pure TypeScript. It consumes a readonly `Architecture` plus a
load profile and produces per-node snapshots and a `RunOutcome`. It must not
import React, the DOM, or Zustand so it can run in Vitest and a Web Worker
unchanged.

## Entry points

```ts
import { runSimulation, createSimulationEngine, databaseCapacities } from "@/features/simulation";
import { diagnoseFailure } from "@/features/diagnosis";
```

- `runSimulation(architecture, config)` compiles the graph and runs to a
  terminal outcome.
- `createSimulationEngine(architecture, config)` returns a state machine with
  `step()` for playback and `run()` for the final result.
- `compileArchitectureGraph(architecture)` validates the design and returns
  adjacency maps plus a topological order.
- `diagnoseFailure(architecture, requirements, result)` explains a failed run
  with the rule catalog in `features/diagnosis`.

Every entry point returns graph issues instead of throwing when an architecture
is invalid.

## Tick model

- Fluid traffic, `dt = 0.1s`; no individual request objects.
- Traffic classes: `read`, `write`, `static`.
- Load is converted with
  `trafficFromLoad(users, requestsPerUserPerSec, readRatio, staticRatio)`.
- Nodes are processed in topological order. Edge flows are added to the target
  node's incoming rate before that node runs.
- Output rates are distributed across outgoing edges. Edges may filter traffic
  with `carries`, and weights split traffic proportionally.
- A node with no outgoing edges is a terminal sink, not an error.

### Generic queue

`processQueue` implements the shared queue model:

```text
backlog       = queueDepth + incomingRps * dt
processable   = capacityRps * dt
served        = min(backlog, processable)
remaining     = backlog - served
drops         = max(0, remaining - maxQueueDepth)
queueDepth    = remaining - drops
utilization   = min(1, incomingRps / capacityRps)
latencyMs     = baseLatencyMs + (queueDepth / capacityRps) * 1000
```

Queue capacity is expressed as seconds of work at the node's capacity. App
servers and workers use 2 seconds, load balancers 0.5 seconds, caches 1 second,
and databases 2 seconds.

## Component models

All numbers are educational approximations, not benchmarks. They live in
`features/simulation/engine/constants.ts`.

### Clients

The challenge-owned traffic source. It has no queue and emits the full offered
load. It drops traffic only when no outgoing edge can carry a class.

### Load balancer

- Splits each traffic class evenly across eligible outgoing edges, honoring
  edge weights.
- `ipHash` gives the first edge `1/n + 0.2 * (1 - 1/n)` of a class and spreads
  the rest evenly.
- Has its own finite `capacityRps`, 0.5s queue, and ~1ms base latency.
- A single load balancer is a single point of failure; availability scoring is
  future work.

### App server

- `capacityRps = instances * rpsPerInstance`.
- 2s queue, `baseLatencyMs` (default 30ms).
- If `statefulSessions` is true and an upstream load balancer uses round-robin,
  capacity is multiplied by `0.7` to model session-affinity waste.
- Forwards served traffic to every eligible outgoing edge. Edge `carries`
  filters decide whether reads, writes, or static traffic take that path.

### CDN

- `hitRatio` (default 0.9) applies only to `static` traffic.
- Static hits are absorbed; static misses, reads, and writes are forwarded.
- Huge capacity (`1,000,000 rps`), 0.5s queue, 15ms base latency.

### Cache

Steady-state hit ratio:

```text
hitRatio = clamp(memoryGb / workingSetGb, 0, 1)^0.6 * 0.98
```

The exponent models diminishing returns; the 0.98 ceiling keeps a small miss
path. Cold start ramps linearly from zero to steady state over 20 simulated
seconds:

```text
effectiveHitRatio = steadyHitRatio * clamp(timeSec / 20, 0, 1)
```

- Only reads hit; writes and static traffic pass through.
- Hits are absorbed. Read misses are forwarded to the next node (normally the
  database).
- 80,000 rps capacity per cache node, 1s queue, 1ms base latency.
- A steady hit ratio below 0.5 is treated as undersized when attributing a
  database bottleneck.

### Database

Tier capacities before replicas, shards, and replication:

| Tier   | Read rps | Write rps | Storage per shard |
| ------ | -------: | --------: | ----------------: |
| small  |    2,000 |       500 |            100 GB |
| medium |    8,000 |     2,000 |            500 GB |
| large  |   30,000 |    10,000 |          2,000 GB |
| xlarge |  100,000 |    40,000 |          8,000 GB |

- Reads use primary + replicas: `readRps * (1 + readReplicas)`.
- Replicas do not add write capacity. Sync replication multiplies write
  capacity by `0.7`; async keeps full throughput.
- Sharding is sublinear. The hot shard receives
  `1 + 0.3 * (1 - 1/shards)` of a fair share, so the effective multiplier is
  `shards / skew`.
- Reads and writes share one queue through an equivalent capacity:
  `totalLoad / (readLoad/readRps + writeLoad/writeRps)`.
- Storage limit is `storagePerShard * shards`. If `dataSizeGb` exceeds it, the
  run fails with `storageExhausted`.
- Latency is the queue result plus up to 40ms of contention near saturation.

### Queue

- Reads and static traffic pass through unchanged.
- Writes enter a buffer with `maxDepth` and drain at `throughputRps`.
- Users see the ~5ms enqueue latency, not drain latency.
- Overflow beyond `maxDepth` is dropped. Queue depth is visible in snapshots.

### Worker

- Consumes queued work with
  `capacityRps = instances * rpsPerInstance`.
- 2s queue, 10ms base latency.
- Forwards served work to the database. If workers are slower than the queue
  drain rate, queue depth grows.

### DNS, gateway, rate limiter, object storage

- DNS and object storage are effectively unlimited pass-through nodes.
- API gateway and rate limiter enforce `limitRps` and drop excess traffic.
- Gateway/rate-limiter drops are reported as capacity failures, not overload
  errors.

## Failure detection

A breach must persist for `FAILURE_WINDOW_SEC = 3` simulated seconds before the
run fails. Supported reasons:

- `queueOverflow` — a node is dropping work while its queue is full.
- `errorRate` — dropped traffic exceeds `maxErrorRatio`.
- `latencySlo` — the p95 estimate exceeds `latencyP95Ms`.
- `storageExhausted` — a database cannot hold `dataSizeGb`.
- `timeout` — the run reached `maxSimulatedSec` without a terminal result.

The root cause is the upstream-most saturated node. If a database is saturated
and an undersized cache is present, the cache is attributed as the root cause
because its misses are the reason the database is overloaded.

p95 is an educational approximation:

```text
p95 = averageLatency * (1 + 1.5 * maxUtilization^3)
```

### Diagnosis rules

`features/diagnosis/rules/catalog.ts` contains 16 ordered templates covering:

- database read-bound, write-bound, and storage;
- app-server CPU and stateful sessions;
- load-balancer capacity and single point of failure;
- cache too small and cache cold start;
- queue overflow and worker throughput;
- missing CDN for static-heavy traffic;
- rate limiting;
- over-budget designs;
- no redundancy;
- a generic bottleneck fallback.

`diagnoseFailure` selects the first matching rule and returns a headline,
primary bottleneck, plain-English summary, why-it-matters text, a nudge, and
evidence numbers for the report UI.

## Success

The target load must hold healthy for `SUCCESS_HOLD_SEC = 15` simulated
seconds. Healthy means error ratio and p95 latency are within the challenge
requirements. `maxUsersSustained` tracks the highest healthy user count.

## Verification

- `bun run test` covers queue behavior, load profiles, traffic distribution,
  graph validation, cache hit ratios and cold start, CDN absorption, database
  replica/shard/storage behavior, queue backpressure, worker throughput,
  failure detection, three root-cause scenarios, diagnosis templates, and
  determinism.
- `bun run typecheck` enforces the strict TypeScript contract.
- `bun run lint` includes the engine purity and feature-boundary checks.

## Limitations

- Availability and failure injection are not modeled yet; the single-LB and
  no-redundancy rules are templated for the phase-2 availability work.
- Async replication lag is not modeled yet; sync replication only reduces write
  capacity.
- Queue backpressure comes from worker throughput. Database saturation does not
  yet propagate upstream to slow the worker itself.
- p95 is computed from node latency, not a full per-path latency distribution.
- Bandwidth, packet loss, and multi-region effects are out of scope.

## Checklist: adding a component kind

1. Add the kind to `NODE_KINDS` and `componentParamsSchema` in
   `features/architecture/model`.
2. Add its cost/default entry to the component catalog.
3. Add a behavior in `features/simulation/engine/nodes/<kind>.ts` and dispatch
   it from `nodes/index.ts` with an exhaustive switch.
4. Add diagnosis rules for that kind.
5. Add or update engine tests and bump this document if the model changes.
