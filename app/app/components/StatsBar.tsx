"use client";

interface Stats {
  totalListings: number;
  activeListings: number;
  completedTrades: number;
  totalVolumeCents: number;
  openDisputes: number;
  flaggedListings: number;
}

export default function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const items = [
    { label: "Listings", value: String(stats.activeListings) },
    { label: "Trades", value: String(stats.completedTrades) },
    {
      label: "Volume",
      value: `$${(stats.totalVolumeCents / 100).toLocaleString()}`,
    },
    { label: "Disputes", value: String(stats.openDisputes) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="card !p-4 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">
            {item.label}
          </p>
          <p className="text-xl font-semibold text-white tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
