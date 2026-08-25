import { Button } from "@fluentui/react-components";
import { ClipboardTaskListLtr24Regular } from "@fluentui/react-icons";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-[var(--app-surface-2)] text-[var(--app-accent)]">
        <ClipboardTaskListLtr24Regular />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-[var(--app-text)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--app-text-muted)]">{description}</p>
      {actionLabel && onAction ? (
        <Button appearance="primary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
