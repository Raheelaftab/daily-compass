export default function HabitsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-11 w-20 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
