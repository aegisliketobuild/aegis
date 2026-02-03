"use client";

interface User {
  username: string;
  reputation_score: number;
  trades_completed: number;
  total_volume_cents: number;
}

export default function Leaderboard({ leaders }: { leaders: User[] }) {
  if (!leaders.length) return null;

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-4">
        Top Traders
      </h2>
      <div className="space-y-2.5">
        {leaders.map((user, i) => (
          <div
            key={user.username}
            className="flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="text-[11px] text-zinc-600 w-4 text-right tabular-nums">
              {i + 1}
            </span>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center text-[10px] text-amber-400 font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate">{user.username}</p>
              <p className="text-[11px] text-zinc-600">
                {user.trades_completed} trades &middot; $
                {(user.total_volume_cents / 100).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-amber-400 tabular-nums">
                {user.reputation_score}
              </span>
              <p className="text-[10px] text-zinc-600">rep</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
