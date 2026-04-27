export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg bg-zinc-200" />
        <div className="h-4 w-28 rounded-md bg-zinc-100" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-200" />
        ))}
      </div>

      <div className="h-72 rounded-xl bg-zinc-200" />
    </div>
  );
}
