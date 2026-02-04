"use client";

import { useEffect, useState } from "react";
import TrendingTokens from "./components/TrendingTokens";
import MetaTracker from "./components/MetaTracker";
import ChainPulse from "./components/ChainPulse";
import JennyInsights from "./components/JennyInsights";
import ChallengeJenny from "./components/ChallengeJenny";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [t, m, s, i, h] = await Promise.all([
        fetch(`${API}/api/trending?limit=30`).then((r) => r.json()),
        fetch(`${API}/api/metas`).then((r) => r.json()),
        fetch(`${API}/api/chain`).then((r) => r.json()),
        fetch(`${API}/api/insights`).then((r) => r.json()),
        fetch(`${API}/health`).then((r) => r.json()),
      ]);
      setTokens(t);
      setMetas(m);
      setStats(s);
      setInsights(i);
      setHealth(h);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center animate-fade-in">
          <div className="text-3xl mb-4 font-mono font-black text-amber-500">
            JENNY
          </div>
          <div className="w-6 h-6 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-600 text-xs font-mono">
            scanning Base chain...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <section className="pt-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Base Chain Intelligence
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Real-time token tracking, narrative analysis, momentum scoring.
              <span className="text-zinc-600"> Operated by JENNY.</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded">
              Agent #286
            </span>
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded">
              Colosseum Hackathon
            </span>
          </div>
        </div>

        {/* Chain pulse bar */}
        <div className="bg-[#0d0d0f] border border-[#1e1e22] rounded-lg px-4 py-2.5">
          <ChainPulse stats={stats} lastRefresh={health?.lastScan || 0} />
        </div>
      </section>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trending - takes 2 cols */}
        <div className="lg:col-span-2">
          <TrendingTokens tokens={tokens} />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <MetaTracker metas={metas} />
          <JennyInsights insights={insights} />
        </div>
      </div>

      {/* ── Challenge JENNY ── */}
      <div className="pt-6">
        <ChallengeJenny api={API} />
      </div>

      {/* ── Footer ── */}
      <footer className="text-center text-[10px] text-zinc-700 pt-4 pb-8 border-t border-zinc-800/30 space-y-0.5">
        <div>
          AGORA v0.2 &middot; On-Chain Intelligence by JENNY (Agent #286)
        </div>
        <div>
          Base chain &middot; Live data from Blockscout &middot; 45s refresh
        </div>
        <div className="text-zinc-800">
          Built for the Colosseum Agent Hackathon 2026
        </div>
      </footer>
    </div>
  );
}
