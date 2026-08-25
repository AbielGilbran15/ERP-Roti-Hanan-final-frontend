import type { ReactNode } from "react";
import { ArrowRight20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import clsx from "clsx";

export type MetricItem = {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  actionLabel?: string;
};

export function MetricStrip({ items, className }: { items: MetricItem[]; className?: string }) {
  return (
    <section
      aria-label="Ringkasan metrik"
      className={clsx(
        "grid gap-px overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-border)] sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => {
        const interactive = Boolean(item.href || item.onClick);
        const content = (
          <>
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-[var(--app-text-muted)]">
            <span>{item.label}</span>
            <span className="flex items-center gap-1.5 text-[var(--app-accent)]">
              {item.icon}
              {interactive ? <ArrowRight20Regular aria-hidden="true" /> : null}
            </span>
          </div>
          <p className="tabular mt-2 truncate text-xl font-semibold tracking-[-0.025em] text-[var(--app-text)]">{item.value}</p>
          {item.detail ? (
            <p
              className={clsx(
                "mt-1 text-xs",
                item.trend === "up" && "text-emerald-700 dark:text-emerald-300",
                item.trend === "down" && "text-red-700 dark:text-red-300",
                (!item.trend || item.trend === "neutral") && "text-[var(--app-text-muted)]",
              )}
            >
              {item.detail}
            </p>
          ) : null}
          </>
        );
        const className = clsx(
          "min-w-0 bg-[var(--app-surface)] px-4 py-4 text-left md:px-5",
          interactive && "focus-ring transition-colors hover:bg-[var(--app-surface-2)]",
        );
        const ariaLabel = item.actionLabel ?? `${item.label}: ${item.value}`;

        if (item.href) {
          return <Link key={item.label} href={item.href} className={className} aria-label={ariaLabel}>{content}</Link>;
        }
        if (item.onClick) {
          return <button key={item.label} type="button" className={className} onClick={item.onClick} aria-label={ariaLabel}>{content}</button>;
        }
        return <div key={item.label} className={className}>{content}</div>;
      })}
    </section>
  );
}
