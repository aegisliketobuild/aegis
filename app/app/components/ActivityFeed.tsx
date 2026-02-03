"use client";

interface Activity {
  type: string;
  timestamp: number;
  summary: string;
}

const TYPE_ICONS: Record<string, string> = {
  listing: "[+]",
  order: "[$]",
  dispute: "[!]",
  resolution: "[J]", // JENNY resolved
  fraud_flag: "[X]",
  ban: "[B]",
};

const TYPE_COLORS: Record<string, string> = {
  listing: "text-green-400",
  order: "text-blue-400",
  dispute: "text-red-400",
  resolution: "text-purple-400",
  fraud_flag: "text-yellow-400",
  ban: "text-red-600",
};

export default function ActivityFeed({ activity }: { activity: Activity[] }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">
        JENNY Activity Feed
      </h2>
      {!activity.length ? (
        <p className="text-gray-500 text-sm">
          No activity yet. JENNY is watching...
        </p>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {activity.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span
                className={`font-mono text-xs shrink-0 mt-0.5 ${TYPE_COLORS[item.type] || "text-gray-400"}`}
              >
                {TYPE_ICONS[item.type] || "[?]"}
              </span>
              <div>
                <p className="text-gray-300">{item.summary}</p>
                <p className="text-xs text-gray-600">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
