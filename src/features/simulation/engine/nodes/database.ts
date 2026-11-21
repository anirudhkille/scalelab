import {
  trafficTotal,
  type ComponentParamsByKind,
  type TrafficRate,
} from "@/features/architecture/model";

import {
  DATABASE_ASYNC_REPLICATION_LAG_MS,
  DATABASE_BASE_LATENCY_MS,
  DATABASE_CAPACITY_RPS,
  DATABASE_CONTENTION_LATENCY_MS,
  DATABASE_HOT_SHARD_SKEW_RATIO,
  DATABASE_QUEUE_LIMIT_SEC,
  DATABASE_REPLICATION_LAG_PER_WRITE_MS,
  DATABASE_REPLICATION_WRITE_FACTOR,
  DATABASE_STORAGE_GB,
} from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeForwarded } from "./shared";

export type DatabaseParams = ComponentParamsByKind["database"];

export type DatabaseCapacities = {
  readonly readRps: number;
  readonly writeRps: number;
  readonly shardCapacityMultiplier: number;
};

export type DatabaseTickInput = {
  readonly params: DatabaseParams;
  readonly incoming: TrafficRate;
  readonly queueDepth: number;
  readonly dtSec: number;
};

/**
 * Sharding gains less than linearly because one shard is always hottest.
 *
 * Effective multiplier = shards / skew, where the hot shard receives
 * `1 + 0.3 * (1 - 1/shards)` of a fair share.
 */
export function hotShardCapacityMultiplier(shards: number): number {
  const safeShards = Math.max(1, Math.floor(shards));
  if (safeShards === 1) {
    return 1;
  }

  const hotShardSkew = 1 + DATABASE_HOT_SHARD_SKEW_RATIO * (1 - 1 / safeShards);
  return safeShards / hotShardSkew;
}

export function databaseCapacities(params: DatabaseParams): DatabaseCapacities {
  const tier = DATABASE_CAPACITY_RPS[params.instanceSize];
  const shardCapacityMultiplier = hotShardCapacityMultiplier(params.shards);
  const readRps = tier.read * (1 + params.readReplicas) * shardCapacityMultiplier;
  const writeRps =
    tier.write * shardCapacityMultiplier * DATABASE_REPLICATION_WRITE_FACTOR[params.replication];

  return { readRps, writeRps, shardCapacityMultiplier };
}

/** Async replicas lag behind the primary; sync replicas acknowledge before returning. */
export function databaseReplicationLagMs(params: DatabaseParams, writeRps: number): number {
  if (params.replication === "sync" || writeRps <= 0) {
    return 0;
  }

  return DATABASE_ASYNC_REPLICATION_LAG_MS + writeRps * DATABASE_REPLICATION_LAG_PER_WRITE_MS;
}

export function databaseStorageLimitGb(params: DatabaseParams): number {
  return DATABASE_STORAGE_GB[params.instanceSize] * Math.max(1, Math.floor(params.shards));
}

export function databaseStorageExceeded(params: DatabaseParams, dataSizeGb: number): boolean {
  return dataSizeGb > databaseStorageLimitGb(params);
}

/**
 * Combine read and write demand into one equivalent capacity.
 *
 * If reads use 50% of read capacity and writes use 25% of write capacity, the
 * node is 75% busy. The equivalent capacity keeps the shared queue model but
 * stops reads from consuming write headroom (or vice versa).
 */
function equivalentCapacityRps(
  readLoad: number,
  writeLoad: number,
  capacities: DatabaseCapacities,
) {
  const totalLoad = readLoad + writeLoad;
  if (totalLoad <= 0) {
    return capacities.readRps;
  }

  const readServiceSec = capacities.readRps > 0 ? readLoad / capacities.readRps : 0;
  const writeServiceSec = capacities.writeRps > 0 ? writeLoad / capacities.writeRps : 0;
  const serviceSec = readServiceSec + writeServiceSec;

  return serviceSec > 0 ? totalLoad / serviceSec : 0;
}

export const databaseBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "database") {
    throw new Error("databaseBehavior received a non-database node");
  }

  const incomingRps = trafficTotal(context.incoming);
  const queue = processDatabaseTick({
    params: context.node.params,
    incoming: context.incoming,
    queueDepth: context.queueDepth,
    dtSec: context.dtSec,
  });

  const acceptedRatio = incomingRps > 0 ? queue.servedRps / incomingRps : 0;
  const { distribution, droppedRps } = distributeForwarded(
    {
      read: context.incoming.read * acceptedRatio,
      write: context.incoming.write * acceptedRatio,
      static: context.incoming.static * acceptedRatio,
    },
    context.outgoingEdges,
  );

  const contentionMs = DATABASE_CONTENTION_LATENCY_MS * Math.pow(queue.utilizationRatio, 4);
  const replicationLagMs = databaseReplicationLagMs(context.node.params, context.incoming.write);
  const readLagMs = context.incoming.read > 0 ? replicationLagMs : 0;

  return {
    outputs: distribution.flows,
    servedRps: queue.servedRps,
    droppedRps: queue.droppedRps + droppedRps,
    queueDepth: queue.queueDepth,
    maxQueueDepth: queue.maxQueueDepth,
    utilizationRatio: queue.utilizationRatio,
    latencyMs: queue.latencyMs + contentionMs + readLagMs,
    capacityRps: queue.capacityRps,
  };
};

export type DatabaseTickResult = ReturnType<typeof processDatabaseTick>;

/** Exposed for tests that need the queue result without building a full run. */
export function processDatabaseTick(input: DatabaseTickInput) {
  const capacities = databaseCapacities(input.params);
  const readLoad = input.incoming.read + input.incoming.static;
  const writeLoad = input.incoming.write;
  const capacityRps = equivalentCapacityRps(readLoad, writeLoad, capacities);
  const incomingRps = trafficTotal(input.incoming);

  return processQueue({
    incomingRps,
    capacityRps,
    queueDepth: input.queueDepth,
    maxQueueDepth: queueDepthForSeconds(capacityRps, DATABASE_QUEUE_LIMIT_SEC),
    baseLatencyMs: DATABASE_BASE_LATENCY_MS,
    dtSec: input.dtSec,
  });
}
