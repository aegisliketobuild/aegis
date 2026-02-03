"use client";

import { useEffect, useState } from "react";
import ChallengeJenny from "./components/ChallengeJenny";
import DisputeArena from "./components/DisputeArena";
import Bazaar from "./components/Bazaar";
import JennyFeed from "./components/JennyFeed";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [s, l, a] = await Promise.all([
        fetch(`${API}/api/stats`).then((r) => r.json()),
        fetch(`${API}/api/listings`).then((r) => r.json()),
        fetch(`${API}/api/activity?limit=30`).then((r) => r.json()),
      ]);
      setStats(s);
      setListings(l);
      setActivity(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-6 font-mono font-black text-amber-500">
            JENNY
          </div>
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 text-sm font-mono">
            booting autonomous marketplace operator...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-20 animate-fade-in">
      {/* ===== HERO ===== */}
      <section className="text-center pt-16 pb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent rounded-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-amber-500/80 font-mono text-xs mb-6 tracking-[0.3em] uppercase">
            Colosseum Agent Hackathon &middot; Agent #286
          </p>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
            This marketplace has
            <br />
            <span className="text-amber-500">zero employees.</span>
          </h1>

          <p className="text-zinc-400 mt-8 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            JENNY scans every listing for fraud. Judges every dispute. Manages
            every reputation score. No humans in the loop.{" "}
            <span className="text-zinc-300 font-medium">Ever.</span>
          </p>

          {/* Stats ticker */}
          {stats && (
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-12">
              <Stat
                value={stats.completedTrades}
                label="trades settled"
              />
              <div className="hidden md:block w-px h-10 bg-zinc-800" />
              <Stat
                value={`$${Math.round(stats.totalVolumeCents / 100).toLocaleString()}`}
                label="USDC volume"
              />
              <div className="hidden md:block w-px h-10 bg-zinc-800" />
              <Stat
                value={stats.resolvedDisputes}
                label="disputes judged"
              />
              <div className="hidden md:block w-px h-10 bg-zinc-800" />
              <Stat
                value={stats.flaggedListings}
                label="scams caught"
                amber
              />
            </div>
          )}

          <div className="mt-12">
            <a
              href="#challenge"
              className="inline-flex items-center gap-2 btn-primary text-base px-8 py-3"
            >
              Try to get a scam past her
              <span className="text-lg">&darr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ===== CHALLENGE JENNY ===== */}
      <div id="challenge">
        <ChallengeJenny api={API} />
      </div>

      {/* ===== DISPUTE ARENA ===== */}
      <DisputeArena api={API} />

      {/* ===== HOW IT WORKS ===== */}
      <section className="text-center">
        <h2 className="text-3xl font-bold text-white mb-3">How AGORA Works</h2>
        <p className="text-zinc-500 mb-10 max-w-xl mx-auto">
          Permissionless commerce on Solana. USDC escrow. On-chain reputation.
          AI-operated.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <Step n="1" title="List" desc="Post a good or service. JENNY scans it for fraud before it goes live." />
          <Step n="2" title="Buy" desc="Send USDC. Funds lock in smart contract escrow until delivery." />
          <Step n="3" title="Deliver" desc="Seller delivers. Buyer confirms. Escrow releases to seller." />
          <Step n="4" title="Dispute?" desc="Either party opens a dispute. JENNY analyzes evidence and judges." />
        </div>
      </section>

      {/* ===== THE BAZAAR ===== */}
      <Bazaar listings={listings} />

      {/* ===== JENNY'S FEED ===== */}
      <JennyFeed activity={activity} />

      {/* ===== FOOTER ===== */}
      <footer className="text-center text-[11px] text-zinc-700 pt-6 pb-10 border-t border-zinc-800/50 space-y-1">
        <div>
          AGORA v0.1 &middot; Operated autonomously by JENNY (Agent #286)
        </div>
        <div>
          Solana devnet &middot; USDC escrow &middot; On-chain reputation
          &middot; Zero platform fees
        </div>
        <div className="text-zinc-800">
          Built for the Colosseum Agent Hackathon 2026
        </div>
      </footer>
    </div>
  );
}

function Stat({
  value,
  label,
  amber,
}: {
  value: string | number;
  label: string;
  amber?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-2xl md:text-3xl font-bold ${amber ? "text-amber-500" : "text-white"}`}
      >
        {value}
      </div>
      <div className="text-zinc-500 text-xs mt-1">{label}</div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="card text-left">
      <div className="text-amber-500 font-mono text-xs mb-2">{n}.</div>
      <div className="text-white font-semibold text-sm mb-1">{title}</div>
      <div className="text-zinc-500 text-xs leading-relaxed">{desc}</div>
    </div>
  );
}
