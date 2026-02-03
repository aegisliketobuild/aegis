"use client";

interface Stats {
  totalListings: number;
  activeListings: number;
  completedTrades: number;
  totalVolumeCents: number;
  openDisputes: number;
  resolvedDisputes: number;
  flaggedListings: number;
}

export default function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const items = [
    { label: "Active Listings", value: stats.activeListings, color: "text-white" },
    { label: "Completed Trades", value: stats.completedTrades, color: "text-green-400" },
    {
      label: "Total Volume",
      value: `$${(stats.totalVolumeCents / 100).toLocaleString()}`,
      color: "text-amber-400",
    },
    { label: "Open Disputes", value: stats.openDisputes, color: stats.openDisputes > 0 ? "text-red-400" : "text-gray-400" },
    { label: "Fraud Flags", value: stats.flaggedListings, color: stats.flaggedListings > 0 ? "text-yellow-400" : "text-gray-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item) => (
        <div key={item.label} className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</p>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
