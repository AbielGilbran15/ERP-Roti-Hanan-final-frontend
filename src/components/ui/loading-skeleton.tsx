export function LoadingSkeleton() {
  return (
    <div className="space-y-5" aria-label="Memuat data">
      <div className="h-16 animate-pulse rounded-xl bg-[var(--app-surface-2)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-[var(--app-surface-2)]" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-[var(--app-surface-2)]" />
    </div>
  );
}
