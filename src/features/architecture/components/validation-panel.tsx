import { AlertTriangle } from "lucide-react";

import { formatGraphIssue, type GraphIssue } from "../model/graph";

type ValidationPanelProps = {
  readonly issues: readonly GraphIssue[];
};

const MAX_VISIBLE_ISSUES = 3;

export function ValidationPanel({ issues }: ValidationPanelProps) {
  if (issues.length === 0) {
    return null;
  }

  const visible = issues.slice(0, MAX_VISIBLE_ISSUES);
  const remaining = issues.length - visible.length;

  return (
    <div
      role="status"
      className="w-72 rounded-lg border border-health-warm/40 bg-card/95 p-3 shadow-md backdrop-blur"
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <AlertTriangle className="size-3.5 text-health-warm" aria-hidden="true" />
        {issues.length} issue{issues.length === 1 ? "" : "s"} before the design can run
      </div>
      <ul className="mt-2 space-y-1.5">
        {visible.map((issue) => (
          <li
            key={`${issue.code}:${formatGraphIssue(issue)}`}
            className="text-[11px] leading-relaxed text-muted-foreground"
          >
            {formatGraphIssue(issue)}
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">+{remaining} more</p>
      ) : null}
    </div>
  );
}
