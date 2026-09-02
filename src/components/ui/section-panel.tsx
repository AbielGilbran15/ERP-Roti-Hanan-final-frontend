import type { ReactNode } from "react";
import clsx from "clsx";

export function SectionPanel({
  id,
  title,
  description,
  action,
  children,
  className,
  noPadding = false,
}: {
  id?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section id={id} className={clsx("app-surface min-w-0 scroll-mt-24 overflow-hidden", className)}>
      {title || action ? (
        <div className="flex min-w-0 flex-col items-start gap-3 border-b border-[var(--app-border)] px-4 py-3.5 sm:flex-row sm:justify-between md:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs text-[var(--app-text-muted)]">{description}</p> : null}
          </div>
          {action ? <div className="max-w-full no-print sm:shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={noPadding ? "min-w-0" : "min-w-0 p-4 md:p-5"}>{children}</div>
    </section>
  );
}
