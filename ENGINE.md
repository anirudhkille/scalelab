# ScaleLab engine

Status: **v0 skeleton (M0)**. The deterministic model lands in M1.

The engine is a pure TypeScript, rate-based tick simulation. It consumes a
readonly `Architecture` plus a load profile and produces per-node snapshots and
a `RunOutcome`. It must not import React, the DOM, or Zustand so it can run in
Vitest and a Web Worker unchanged.

## Planned model (from plan §6)

- Fluid traffic, `dt = 0.1s`; no individual request objects.
- Generic queue per node: arrival rate, capacity, utilization, queue depth,
  served rate, dropped rate, and latency.
- Traffic classes: `read`, `write`, `static`.
- Component behaviors for clients, DNS, CDN, load balancer, API gateway, rate
  limiter, app server, cache, database, queue, worker, and object storage.
- p95 latency approximation from service time and queue depth.
- Failure detection over a 3s window: error rate, latency SLO, queue overflow,
  and storage exhaustion.
- Deterministic output for identical inputs.
- Root-cause diagnosis is rule-based and lives in `features/diagnosis`.

## Checklist: adding a component kind

1. Add the kind to `NODE_KINDS` and `componentParamsSchema` in
   `features/architecture/model`.
2. Add its cost/range entry to the component catalog and a renderer/inspector
   form in M3.
3. Add `features/simulation/engine/nodes/<kind>.ts` behavior.
4. Add diagnosis rules for that kind.
5. Add or update engine tests.
