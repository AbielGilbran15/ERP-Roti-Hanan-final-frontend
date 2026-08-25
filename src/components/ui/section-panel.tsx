import type { ReactNode } from "react";
import clsx from "clsx";

export function SectionPanel({
  title,
  description,
  action,
  children,
  className,
  noPadding = false,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={clsx("app-surface min-w-0 overflow-hidden", className)}>
      {title || action ? (
        <div className="flex flex-col items-start gap-3 border-b border-[var(--app-border)] px-4 py-3.5 sm:flex-row sm:justify-between md:px-5">
          <div>
            {title ? <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs text-[var(--app-text-muted)]">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0 no-print">{action}</div> : null}
        </div>
      ) : null}
      <div className={noPadding ? "" : "p-4 md:p-5"}>{children}</div>
    </section>
  );
}
