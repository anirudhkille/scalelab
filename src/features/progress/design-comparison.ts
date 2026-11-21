import {
  COMPONENT_CATALOG,
  monthlyCostUsd,
  type Architecture,
  type NodeKind,
} from "@/features/architecture";

export type CostBreakdownLine = {
  readonly kind: NodeKind;
  readonly label: string;
  readonly count: number;
  readonly monthlyCostUsd: number;
};

export type CostBreakdown = {
  readonly lines: readonly CostBreakdownLine[];
  readonly totalUsd: number;
};

export type KindDelta = {
  readonly kind: NodeKind;
  readonly label: string;
  readonly count: number;
};

export type DesignDiff = {
  readonly userTotalUsd: number;
  readonly referenceTotalUsd: number;
  readonly deltaUsd: number;
  readonly deltaRatio: number;
  readonly added: readonly KindDelta[];
  readonly skipped: readonly KindDelta[];
};

function kindCounts(architecture: Architecture): ReadonlyMap<NodeKind, number> {
  const counts = new Map<NodeKind, number>();

  for (const node of architecture.nodes) {
    const kind = node.params.kind;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }

  return counts;
}

/** Monthly spend grouped by component kind, largest line first. */
export function costBreakdownByComponent(architecture: Architecture): CostBreakdown {
  const lines = new Map<NodeKind, CostBreakdownLine>();

  for (const node of architecture.nodes) {
    const kind = node.params.kind;
    const current = lines.get(kind);

    if (current) {
      lines.set(kind, {
        ...current,
        count: current.count + 1,
        monthlyCostUsd: current.monthlyCostUsd + monthlyCostUsd(node.params),
      });
    } else {
      lines.set(kind, {
        kind,
        label: COMPONENT_CATALOG[kind].label,
        count: 1,
        monthlyCostUsd: monthlyCostUsd(node.params),
      });
    }
  }

  const sorted = [...lines.values()].toSorted(
    (left, right) => right.monthlyCostUsd - left.monthlyCostUsd,
  );

  return {
    lines: sorted,
    totalUsd: sorted.reduce((total, line) => total + line.monthlyCostUsd, 0),
  };
}

/** What the player runs versus the reference: extra components, skipped ones, and cost. */
export function designDiff(user: Architecture, reference: Architecture): DesignDiff {
  const userCounts = kindCounts(user);
  const referenceCounts = kindCounts(reference);
  const kinds = new Set<NodeKind>([...userCounts.keys(), ...referenceCounts.keys()]);
  const added: KindDelta[] = [];
  const skipped: KindDelta[] = [];

  for (const kind of kinds) {
    const delta = (userCounts.get(kind) ?? 0) - (referenceCounts.get(kind) ?? 0);

    if (delta > 0) {
      added.push({ kind, label: COMPONENT_CATALOG[kind].label, count: delta });
    }

    if (delta < 0) {
      skipped.push({ kind, label: COMPONENT_CATALOG[kind].label, count: -delta });
    }
  }

  const sortedAdded = added.toSorted((left, right) => right.count - left.count);
  const sortedSkipped = skipped.toSorted((left, right) => right.count - left.count);

  const userTotalUsd = costBreakdownByComponent(user).totalUsd;
  const referenceTotalUsd = costBreakdownByComponent(reference).totalUsd;

  return {
    userTotalUsd,
    referenceTotalUsd,
    deltaUsd: userTotalUsd - referenceTotalUsd,
    deltaRatio: referenceTotalUsd > 0 ? (userTotalUsd - referenceTotalUsd) / referenceTotalUsd : 0,
    added: sortedAdded,
    skipped: sortedSkipped,
  };
}
