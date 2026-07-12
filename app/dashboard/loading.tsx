/** Shared skeleton for all dashboard pages while server data loads. */
export default function DashboardLoading() {
  return (
    <div aria-busy className="flex animate-pulse flex-col gap-6">
      <div>
        <div className="h-8 w-56 rounded-lg bg-white/70" />
        <div className="mt-2.5 h-4 w-80 max-w-full rounded-lg bg-white/50" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-line bg-white/50" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-line bg-white/50" />
    </div>
  );
}
