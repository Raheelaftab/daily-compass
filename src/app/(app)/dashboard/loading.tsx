export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-2 overflow-hidden">
          <div className="h-11 w-24 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="h-11 w-24 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="h-11 w-28 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="h-11 w-28 shrink-0 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
