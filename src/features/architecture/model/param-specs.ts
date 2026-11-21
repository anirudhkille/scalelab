import type { NodeKind } from "./types";

export type SelectOption = {
  readonly label: string;
  readonly value: string;
};

export type NumberParamFieldSpec = {
  readonly type: "number";
  readonly key: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit?: string;
  /** Multiplier applied between the stored value and the displayed value. */
  readonly scale?: number;
  readonly hint?: string;
};

export type SelectParamFieldSpec = {
  readonly type: "select";
  readonly key: string;
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly hint?: string;
};

export type SwitchParamFieldSpec = {
  readonly type: "switch";
  readonly key: string;
  readonly label: string;
  readonly hint?: string;
};

export type ParamFieldSpec = NumberParamFieldSpec | SelectParamFieldSpec | SwitchParamFieldSpec;

const LIMIT_SPECS = [
  {
    type: "number",
    key: "limitRps",
    label: "Request limit",
    min: 100,
    max: 100_000,
    step: 100,
    unit: "rps",
  },
] as const satisfies readonly ParamFieldSpec[];

export const COMPONENT_PARAM_SPECS = {
  clients: [],
  dns: [],
  cdn: [
    {
      type: "number",
      key: "hitRatio",
      label: "Static hit ratio",
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
      scale: 100,
      hint: "Share of static requests answered without touching the origin.",
    },
  ],
  loadBalancer: [
    {
      type: "select",
      key: "algorithm",
      label: "Balancing algorithm",
      options: [
        { value: "roundRobin", label: "Round robin" },
        { value: "leastConn", label: "Least connections" },
        { value: "ipHash", label: "IP hash" },
      ],
    },
    {
      type: "number",
      key: "capacityRps",
      label: "Capacity",
      min: 1_000,
      max: 200_000,
      step: 1_000,
      unit: "rps",
    },
  ],
  apiGateway: LIMIT_SPECS,
  rateLimiter: LIMIT_SPECS,
  appServer: [
    {
      type: "number",
      key: "instances",
      label: "Instances",
      min: 1,
      max: 50,
      step: 1,
    },
    {
      type: "number",
      key: "rpsPerInstance",
      label: "Requests per instance",
      min: 50,
      max: 2_000,
      step: 50,
      unit: "rps",
    },
    {
      type: "number",
      key: "baseLatencyMs",
      label: "Base latency",
      min: 5,
      max: 500,
      step: 5,
      unit: "ms",
    },
    {
      type: "switch",
      key: "statefulSessions",
      label: "Stateful sessions",
      hint: "Sticky sessions stop a round-robin balancer from using every server evenly.",
    },
  ],
  cache: [
    {
      type: "number",
      key: "memoryGb",
      label: "Memory",
      min: 1,
      max: 256,
      step: 1,
      unit: "GB",
    },
    {
      type: "number",
      key: "ttlSec",
      label: "Time to live",
      min: 10,
      max: 3_600,
      step: 10,
      unit: "s",
    },
    {
      type: "select",
      key: "evictionPolicy",
      label: "Eviction policy",
      options: [
        { value: "lru", label: "Least recently used" },
        { value: "lfu", label: "Least frequently used" },
        { value: "random", label: "Random" },
      ],
    },
  ],
  database: [
    {
      type: "select",
      key: "instanceSize",
      label: "Instance size",
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
        { value: "xlarge", label: "X-large" },
      ],
    },
    {
      type: "number",
      key: "readReplicas",
      label: "Read replicas",
      min: 0,
      max: 5,
      step: 1,
    },
    {
      type: "number",
      key: "shards",
      label: "Shards",
      min: 1,
      max: 16,
      step: 1,
    },
    {
      type: "select",
      key: "replication",
      label: "Replication",
      options: [
        { value: "async", label: "Asynchronous" },
        { value: "sync", label: "Synchronous" },
      ],
      hint: "Synchronous replication is safer but reduces write capacity.",
    },
  ],
  queue: [
    {
      type: "number",
      key: "maxDepth",
      label: "Maximum depth",
      min: 100,
      max: 100_000,
      step: 100,
      unit: "msgs",
    },
    {
      type: "number",
      key: "throughputRps",
      label: "Drain rate",
      min: 100,
      max: 20_000,
      step: 100,
      unit: "rps",
    },
  ],
  worker: [
    {
      type: "number",
      key: "instances",
      label: "Instances",
      min: 1,
      max: 50,
      step: 1,
    },
    {
      type: "number",
      key: "rpsPerInstance",
      label: "Requests per instance",
      min: 50,
      max: 2_000,
      step: 50,
      unit: "rps",
    },
  ],
  objectStorage: [],
} as const satisfies Record<NodeKind, readonly ParamFieldSpec[]>;
