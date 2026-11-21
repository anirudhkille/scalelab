import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type PlaceholderPageProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderPage({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-8">
        <span className="grid size-11 place-items-center rounded-xl border border-border bg-background text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  );
}
