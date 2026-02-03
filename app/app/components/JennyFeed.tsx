const TYPE_CONFIG: Record<string, { dot: string; label: string }> = {
  listing: { dot: "bg-emerald-500", label: "LISTING" },
  order: { dot: "bg-blue-500", label: "TRADE" },
  dispute: { dot: "bg-red-500", label: "DISPUTE" },
  resolution: { dot: "bg-violet-500", label: "VERDICT" },
  fraud_flag: { dot: "bg-amber-500", label: "FRAUD" },
  ban: { dot: "bg-red-800", label: "BAN" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

export default function JennyFeed({ activity }: { activity: any[] }) {
  if (!activity.length) return null;

  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          JENNY&apos;s Brain
        </h2>
        <p className="text-zinc-400 mt-3 text-lg">
          Every action she takes. Real-time. Fully transparent.
        </p>
      </div>

      <div className="terminal max-h-[360px] overflow-y-auto space-y-1.5">
        {activity.map((a, i) => {
          const config = TYPE_CONFIG[a.type] || {
            dot: "bg-zinc-500",
            label: "EVENT",
          };
          return (
            <div
              key={i}
              className="flex items-start gap-3 animate-slide-in"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div className="flex items-center gap-1.5 shrink-0 w-[70px]">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`}
                />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
                  {config.label}
                </span>
              </div>
              <span className="text-zinc-400 flex-1 text-[13px]">
                {a.summary}
              </span>
              <span className="text-zinc-700 shrink-0 text-[11px] tabular-nums">
                {timeAgo(a.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
