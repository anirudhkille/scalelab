import { Eye, NotebookPen } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import type { TradeoffPrompt } from "../prompts";

type TradeoffCardProps = {
  readonly prompt: TradeoffPrompt;
  readonly index: number;
  readonly answer: string;
  readonly revealed: boolean;
  readonly locked: boolean;
  readonly onChange: (answer: string) => void;
  readonly onReveal: () => void;
};

export function TradeoffCard({
  prompt,
  index,
  answer,
  revealed,
  locked,
  onChange,
  onReveal,
}: TradeoffCardProps) {
  return (
    <article className="rounded-xl border bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium">{prompt.title}</h2>
            {answer.trim().length > 0 ? (
              <Badge variant="secondary" className="font-normal">
                Answered
              </Badge>
            ) : (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Needed
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{prompt.question}</p>
        </div>
      </div>

      <label htmlFor={`interview-answer-${prompt.id}`} className="sr-only">
        Your answer to {prompt.title}
      </label>
      <textarea
        id={`interview-answer-${prompt.id}`}
        value={answer}
        disabled={locked}
        rows={4}
        placeholder="Type the answer you would give in the interview..."
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {answer.trim().length} chars
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={onReveal}
          disabled={revealed}
        >
          <Eye data-icon="inline-start" />
          {revealed ? "Notes revealed" : "Compare with notes"}
        </Button>
      </div>

      {revealed ? (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-3.5 text-primary" aria-hidden="true" />
            <p className="text-[10px] font-medium tracking-wider uppercase">Model answer notes</p>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{prompt.notes}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {prompt.signals.map((signal) => (
              <li key={signal}>
                <Badge variant="outline" className="font-normal">
                  {signal}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
