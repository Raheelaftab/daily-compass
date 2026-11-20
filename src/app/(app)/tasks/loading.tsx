export default function TasksLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-11 w-28 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-11 flex-1 animate-pulse rounded-md bg-muted" />
        <div className="h-11 flex-1 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-3 rounded-lg border p-3">
        <div className="h-12 animate-pulse rounded-md bg-muted" />
        <div className="h-12 animate-pulse rounded-md bg-muted" />
        <div className="h-12 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
