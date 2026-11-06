export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`dash-shimmer rounded-xl ${className}`} />;
}

/** Placeholder shown while lectures load, so the page has its final shape from the first frame. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading your dashboard">
      <Skeleton className="h-28 w-full !rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36 !rounded-3xl" />
        <Skeleton className="h-36 !rounded-3xl" />
        <Skeleton className="h-36 !rounded-3xl" />
      </div>
      <Skeleton className="h-64 w-full !rounded-3xl" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-56 !rounded-3xl" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
