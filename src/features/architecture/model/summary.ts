import type { ComponentParams } from "./schema";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(Math.round(value));
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function componentSummary(params: ComponentParams): string {
  switch (params.kind) {
    case "clients":
      return "Traffic source";
    case "dns":
      return "Name resolution · 20 ms";
    case "cdn":
      return `${Math.round(params.hitRatio * 100)}% static hit`;
    case "loadBalancer":
      return `${formatNumber(params.capacityRps)} rps · ${params.algorithm}`;
    case "apiGateway":
    case "rateLimiter":
      return `${formatNumber(params.limitRps)} rps limit`;
    case "appServer":
      return `${params.instances} × ${formatNumber(params.rpsPerInstance)} rps`;
    case "cache":
      return `${formatNumber(params.memoryGb)} GB · ${formatNumber(params.ttlSec)}s TTL`;
    case "database":
      return `${titleCase(params.instanceSize)} · ${params.readReplicas} replica${params.readReplicas === 1 ? "" : "s"} · ${params.shards} shard${params.shards === 1 ? "" : "s"}`;
    case "queue":
      return `${formatNumber(params.maxDepth)} depth · ${formatNumber(params.throughputRps)} rps`;
    case "worker":
      return `${params.instances} × ${formatNumber(params.rpsPerInstance)} rps`;
    case "objectStorage":
      return "Blob storage · unlimited";
  }
}
