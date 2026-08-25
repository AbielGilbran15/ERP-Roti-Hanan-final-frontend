import { Badge } from "@fluentui/react-components";
import clsx from "clsx";
import { getStatusKind } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  const kind = getStatusKind(status);

  return (
    <Badge
      appearance="tint"
      className={clsx(
        "!inline-flex !max-w-full !shrink-0 !whitespace-nowrap !rounded-full !px-2.5 !py-0.5 !font-semibold",
        kind === "positive" && "!bg-emerald-100 !text-emerald-800 dark:!bg-emerald-950 dark:!text-emerald-200",
        kind === "warning" && "!bg-amber-100 !text-amber-900 dark:!bg-amber-950 dark:!text-amber-200",
        kind === "danger" && "!bg-red-100 !text-red-800 dark:!bg-red-950 dark:!text-red-200",
        kind === "neutral" && "!bg-slate-100 !text-slate-700 dark:!bg-slate-800 dark:!text-slate-200",
      )}
    >
      {status}
    </Badge>
  );
}
