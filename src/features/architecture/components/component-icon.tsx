import {
  Cloud,
  Cog,
  Cpu,
  Database,
  Globe,
  HardDrive,
  ListOrdered,
  Network,
  Route,
  Search,
  Server,
  ShieldExclamationPoint,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

import type { NodeKind } from "../model/types";

const ICONS = {
  clients: Users,
  dns: Globe,
  cdn: Cloud,
  loadBalancer: Network,
  apiGateway: Route,
  rateLimiter: ShieldExclamationPoint,
  appServer: Server,
  cache: Cpu,
  database: Database,
  searchIndex: Search,
  queue: ListOrdered,
  worker: Cog,
  objectStorage: HardDrive,
} as const satisfies Record<NodeKind, LucideIcon>;

type ComponentIconProps = {
  readonly kind: NodeKind;
  readonly className?: string;
};

export function ComponentIcon({ kind, className }: ComponentIconProps) {
  const Icon = ICONS[kind];

  return <Icon className={cn("size-4", className)} aria-hidden="true" />;
}
