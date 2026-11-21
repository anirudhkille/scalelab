import { assertNever } from "@/shared/lib/assert-never";

import type { NodeKind } from "@/features/architecture";

import type { NodeBehavior } from "../types";
import { appServerBehavior } from "./app-server";
import { clientsBehavior } from "./clients";
import { loadBalancerBehavior } from "./load-balancer";
import { passThroughBehavior } from "./pass-through";

export function nodeBehaviorFor(kind: NodeKind): NodeBehavior {
  switch (kind) {
    case "clients":
      return clientsBehavior;
    case "appServer":
      return appServerBehavior;
    case "loadBalancer":
      return loadBalancerBehavior;
    case "dns":
    case "cdn":
    case "apiGateway":
    case "rateLimiter":
    case "cache":
    case "database":
    case "queue":
    case "worker":
    case "objectStorage":
      return passThroughBehavior;
    default:
      return assertNever(kind);
  }
}
