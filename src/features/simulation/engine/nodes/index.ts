import { assertNever } from "@/shared/lib/assert-never";

import type { NodeKind } from "@/features/architecture";

import type { NodeBehavior } from "../types";
import { appServerBehavior } from "./app-server";
import { cacheBehavior } from "./cache";
import { cdnBehavior } from "./cdn";
import { clientsBehavior } from "./clients";
import { databaseBehavior } from "./database";
import { loadBalancerBehavior } from "./load-balancer";
import { messageQueueBehavior } from "./message-queue";
import { passThroughBehavior } from "./pass-through";
import { workerBehavior } from "./worker";

export function nodeBehaviorFor(kind: NodeKind): NodeBehavior {
  switch (kind) {
    case "clients":
      return clientsBehavior;
    case "cdn":
      return cdnBehavior;
    case "loadBalancer":
      return loadBalancerBehavior;
    case "appServer":
      return appServerBehavior;
    case "cache":
      return cacheBehavior;
    case "database":
      return databaseBehavior;
    case "queue":
      return messageQueueBehavior;
    case "worker":
      return workerBehavior;
    case "dns":
    case "apiGateway":
    case "rateLimiter":
    case "objectStorage":
      return passThroughBehavior;
    default:
      return assertNever(kind);
  }
}
