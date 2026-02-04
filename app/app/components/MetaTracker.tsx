"use client";

interface MetaGroup {
  meta: string;
  count: number;
  totalMcap: number;
  topToken: string;
  topMcap: number;
}

function fmtM(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

const META_LABELS: Record<string, string> = {
  infra: "Infrastructure",
  defi: "DeFi",
  memecoin: "Memecoins",
  ai: "AI / Agents",
  stable: "Stablecoins",
  lsd: "Liquid Staking",
  "btc-fi": "BTC-Fi",
  other: "Other",
};

const META_COLORS: Record<string, string> = {
  infra: "text-zinc-400",
  defi: "text-blue-400",
  memecoin: "text-pink-400",
  ai: "text-violet-400",
  stable: "text-emerald-400",
  lsd: "text-cyan-400",
  "btc-fi": "text-orange-400",
  other: "text-zinc-500",
};

const META_BAR: Record<string, string> = {
  infra: "bg-zinc-500",
  defi: "bg-blue-500",
  memecoin: "bg-pink-500",
  ai: "bg-violet-500",
  stable: "bg-emerald-500",
  lsd: "bg-cyan-500",
  "btc-fi": "bg-orange-500",
  other: "bg-zinc-600",
};

export default function MetaTracker({ metas }: { metas: MetaGroup[] }) {
  const totalMcap = metas.reduce((s, m) => s + m.totalMcap, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Narratives
        </h2>
        <span className="text-[10px] text-zinc-600 font-mono">
          ${fmtM(totalMcap)} total
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-4 gap-px">
        {metas.map((m) => (
          <div
            key={m.meta}
            className={`${META_BAR[m.meta] || META_BAR.other} opacity-60`}
            style={{ width: `${(m.totalMcap / totalMcap) * 100}%` }}
          />
        ))}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {metas.map((m) => (
          <div key={m.meta} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${META_BAR[m.meta] || META_BAR.other}`}
              />
              <span className={`text-[13px] font-medium ${META_COLORS[m.meta] || META_COLORS.other}`}>
                {META_LABELS[m.meta] || m.meta}
              </span>
              <span className="text-[10px] text-zinc-600 font-mono">
                {m.count}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[12px] text-zinc-400 font-mono">
                ${fmtM(m.totalMcap)}
              </span>
              <span className="text-[10px] text-zinc-600 ml-2">
                {m.topToken}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
