import { Lock } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export function WorkspaceTopbar({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-card/40 px-4 py-2.5">
      <Button variant="ghost" size="sm" render={<Link to="/" />}>
        Challenges
      </Button>
      <span className="text-muted-foreground">/</span>
      <h1 className="text-sm font-medium">{title}</h1>
      <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
        scaffold
      </Badge>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <Lock className="size-3" aria-hidden="true" />
          Editor lands in M3
        </Badge>
        <Button size="sm" disabled>
          Run load test
        </Button>
      </div>
    </div>
  );
}
