import { AlertTriangle } from "lucide-react";

import { formatGraphIssue, type GraphIssue } from "../model/graph";

type ValidationPanelProps = {
  readonly issues: readonly GraphIssue[];
  readonly extraIssues?: readonly string[];
};

const MAX_VISIBLE_ISSUES = 3;
const NO_EXTRA_ISSUES: readonly string[] = [];

export function ValidationPanel({ issues, extraIssues = NO_EXTRA_ISSUES }: ValidationPanelProps) {
  const messages = [...issues.map((issue) => formatGraphIssue(issue)), ...extraIssues];

  if (messages.length === 0) {
    return null;
  }

  const visible = messages.slice(0, MAX_VISIBLE_ISSUES);
  const remaining = messages.length - visible.length;

  return (
    <div
      role="status"
      className="w-72 rounded-lg border border-health-warm/40 bg-card/95 p-3 shadow-md backdrop-blur"
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <AlertTriangle className="size-3.5 text-health-warm" aria-hidden="true" />
        {messages.length} issue{messages.length === 1 ? "" : "s"} before the design can run
      </div>
      <ul className="mt-2 space-y-1.5">
        {visible.map((message) => (
          <li key={message} className="text-[11px] leading-relaxed text-muted-foreground">
            {message}
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">+{remaining} more</p>
      ) : null}
    </div>
  );
}
