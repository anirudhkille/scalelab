import { Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";

import type { AttemptStars } from "../scoring";

type StarRatingProps = {
  readonly stars: AttemptStars;
  readonly className?: string;
};

export function StarRating({ stars, className }: StarRatingProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      role="img"
      aria-label={`${stars} of 3 stars`}
    >
      {[1, 2, 3].map((slot) => (
        <Star
          key={slot}
          aria-hidden="true"
          className={cn(
            "size-4",
            slot <= stars
              ? "fill-health-warm text-health-warm"
              : "fill-transparent text-muted-foreground/35",
          )}
        />
      ))}
    </span>
  );
}
