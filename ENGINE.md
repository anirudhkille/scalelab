# ScaleLab engine

Status: **v1 (M1)**. Deterministic rate-based core. Deeper component behaviors
land in M2.

The engine is pure TypeScript. It consumes a readonly `Architecture` plus a
load profile and produces per-node snapshots and a `RunOutcome`. It must not
import React, the DOM, or Zustand so it can run in Vitest and a Web Worker
unchanged.

## Entry points

```ts
import { runSimulation, createSimulationEngine } from "@/features/simulation";
```

- `runSimulation(architecture, config)` compiles the graph and runs to a
  terminal outcome.
- `createSimulationEngine(architecture, config)` returns a state machine with
  `step()` for playback and `run()` for the final result.
- `compileArchitectureGraph(architecture)` validates the design and returns
  adjacency maps plus a topological order.

Every entry point returns graph issues instead of throwing when an
architecture is invalid.

## Tick model

- Fluid traffic, `dt = 0.1s`; no individual request objects.
- Traffic classes: `read`, `write`, `static`.
- Load is converted with
  `trafficFromLoad(users, requestsPerUserPerSec, readRatio, staticRatio)`.
- Nodes are processed in topological order. Edge flows are added to the target
  node's incoming rate before that node runs.
- Output rates are distributed across outgoing edges. Edges may filter traffic
  with `carries`, and weights split traffic proportionally.

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
servers use 2 seconds (`APP_SERVER_QUEUE_LIMIT_SEC`), load balancers 0.5 seconds.

### Failure detection

A breach must persist for `FAILURE_WINDOW_SEC = 3` simulated seconds before the
run fails. Supported reasons:

- `queueOverflow` — a node is dropping work while its queue is full.
- `errorRate` — dropped traffic exceeds `maxErrorRatio`.
- `latencySlo` — the p95 estimate exceeds `latencyP95Ms`.
- `storageExhausted` — reserved for M2 storage models.
- `timeout` — the run reached `maxSimulatedSec` without a terminal result.

The root cause is the upstream-most saturated node. Queue overflow is reported
before aggregate error or latency breaches because it identifies the component
that caused the damage.

p95 is an educational approximation:

```text
p95 = averageLatency * (1 + 1.5 * maxUtilization^3)
```

### Success

The target load must hold healthy for `SUCCESS_HOLD_SEC = 15` simulated
seconds. Healthy means error ratio and p95 latency are within the challenge
requirements. `maxUsersSustained` tracks the highest healthy user count.

## Verification

- `bun run test` covers queue behavior, load profiles, traffic distribution,
  graph validation, capacity scaling, failure detection, determinism, and the
  invalid-graph path.
- `bun run typecheck` enforces the strict TypeScript contract.
- `bun run lint` includes the engine purity and feature-boundary checks.

## Limitations in M1

- Cache, database, queue, worker, CDN, DNS, and object storage are
  pass-through placeholders (gateway and rate limiter already enforce capacity).
- Storage exhaustion is not modeled yet.
- p95 is computed from node latency, not a full per-path latency distribution.
- Stateful sessions and replication lag are reserved for M2.

## Checklist: adding a component kind

1. Add the kind to `NODE_KINDS` and `componentParamsSchema` in
   `features/architecture/model`.
2. Add its cost/default entry to the component catalog.
3. Add a behavior in `features/simulation/engine/nodes/<kind>.ts` and dispatch
   it from `nodes/index.ts` with an exhaustive switch.
4. Add diagnosis rules for that kind.
5. Add or update engine tests and bump this document if the model changes.
