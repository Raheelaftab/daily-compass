export default function AppLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
