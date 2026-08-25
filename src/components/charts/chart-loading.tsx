export function ChartLoading({ height = "h-[270px]" }: { height?: string }) {
  return (
    <div
      className={`${height} w-full animate-pulse rounded-lg bg-[var(--app-surface-2)]`}
      role="status"
      aria-label="Memuat grafik"
    />
  );
}
