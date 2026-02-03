"use client";

interface Activity {
  type: string;
  timestamp: number;
  summary: string;
}

const COLORS: Record<string, string> = {
  listing: "bg-emerald-500",
  order: "bg-blue-500",
  dispute: "bg-red-500",
  resolution: "bg-violet-500",
  fraud_flag: "bg-amber-500",
  ban: "bg-red-700",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityFeed({ activity }: { activity: Activity[] }) {
  return (
    <div className="card">
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-4">
        JENNY Feed
      </h2>
      {!activity.length ? (
        <p className="text-xs text-zinc-600">Watching...</p>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {activity.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 animate-slide-in"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${COLORS[item.type] || "bg-zinc-600"}`}
              />
              <div className="min-w-0">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {item.summary}
                </p>
                <p className="text-[11px] text-zinc-700 mt-0.5">
                  {timeAgo(item.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
