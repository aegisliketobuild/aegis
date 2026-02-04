"use client";

import { useState } from "react";

interface Token {
  address: string;
  name: string;
  symbol: string;
  icon: string | null;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  momentum: number;
  meta: string;
}

type SortKey = "momentum" | "volume" | "mcap";

function fmtPrice(n: number): string {
  if (n >= 1000) return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.001) return "$" + n.toFixed(4);
  if (n >= 0.000001) return "$" + n.toFixed(6);
  return "$" + n.toExponential(2);
}

function fmtM(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

function fmtHolders(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

const META_COLORS: Record<string, string> = {
  memecoin: "meta-memecoin",
  defi: "meta-defi",
  ai: "meta-ai",
  infra: "meta-infra",
  stable: "meta-stable",
  lsd: "meta-lsd",
  "btc-fi": "meta-btc-fi",
  other: "meta-other",
};

export default function TrendingTokens({ tokens }: { tokens: Token[] }) {
  const [sort, setSort] = useState<SortKey>("momentum");

  const sorted = [...tokens].sort((a, b) => {
    if (sort === "momentum") return b.momentum - a.momentum;
    if (sort === "volume") return b.volume24h - a.volume24h;
    return b.marketCap - a.marketCap;
  });

  const maxMomentum = Math.max(...sorted.map((t) => t.momentum), 1);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Trending
          </h2>
          <span className="text-[10px] text-zinc-600 font-mono">
            {tokens.length} tokens
          </span>
        </div>
        <div className="flex gap-1">
          {(["momentum", "volume", "mcap"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                sort === k
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {k === "mcap" ? "MCap" : k === "volume" ? "Vol" : "Momentum"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e1e22]">
              <th className="pl-4 pr-2 py-2 w-8">#</th>
              <th className="px-2 py-2">Token</th>
              <th className="px-2 py-2 text-right">Price</th>
              <th className="px-2 py-2 text-right hidden sm:table-cell">MCap</th>
              <th className="px-2 py-2 text-right hidden md:table-cell">Vol 24h</th>
              <th className="px-2 py-2 text-right hidden lg:table-cell">Holders</th>
              <th className="px-2 py-2 text-right">Momentum</th>
              <th className="px-2 py-2 pr-4 w-20">Meta</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={t.address} className="hover:bg-zinc-900/50 transition-colors">
                <td className="pl-4 pr-2 text-[11px] text-zinc-600 font-mono">
                  {i + 1}
                </td>
                <td className="px-2">
                  <div className="flex items-center gap-2.5">
                    {t.icon ? (
                      <img
                        src={t.icon}
                        alt=""
                        className="w-5 h-5 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 font-bold">
                        {t.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-200 font-medium text-[13px]">
                        {t.symbol}
                      </span>
                      <span className="text-zinc-600 text-[11px] ml-1.5 hidden sm:inline">
                        {t.name.length > 20 ? t.name.slice(0, 20) + "..." : t.name}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-2 text-right text-zinc-300 font-mono text-[12px]">
                  {fmtPrice(t.price)}
                </td>
                <td className="px-2 text-right text-zinc-400 font-mono text-[12px] hidden sm:table-cell">
                  {fmtM(t.marketCap)}
                </td>
                <td className="px-2 text-right text-zinc-400 font-mono text-[12px] hidden md:table-cell">
                  {fmtM(t.volume24h)}
                </td>
                <td className="px-2 text-right text-zinc-500 font-mono text-[11px] hidden lg:table-cell">
                  {fmtHolders(t.holders)}
                </td>
                <td className="px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1 bg-zinc-800/50 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="momentum-bar"
                        style={{
                          width: `${Math.min((t.momentum / maxMomentum) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`font-mono text-[12px] ${
                        t.momentum > 50
                          ? "text-red-400"
                          : t.momentum > 15
                          ? "text-amber-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {t.momentum.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-2 pr-4">
                  <span className={`meta-badge ${META_COLORS[t.meta] || "meta-other"}`}>
                    {t.meta}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
