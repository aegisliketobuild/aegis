"use client";

import { useEffect, useState } from "react";
import StatsBar from "./components/StatsBar";
import ListingsGrid from "./components/ListingsGrid";
import DisputePanel from "./components/DisputePanel";
import ActivityFeed from "./components/ActivityFeed";
import Leaderboard from "./components/Leaderboard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [s, l, a, d, lb] = await Promise.all([
        fetch(`${API}/api/stats`).then((r) => r.json()),
        fetch(`${API}/api/listings`).then((r) => r.json()),
        fetch(`${API}/api/activity?limit=25`).then((r) => r.json()),
        fetch(`${API}/api/disputes/open`).then((r) => r.json()),
        fetch(`${API}/api/leaderboard?limit=6`).then((r) => r.json()),
      ]);
      setStats(s);
      setListings(l);
      setActivity(a);
      setDisputes(d);
      setLeaders(lb);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <p className="text-zinc-500 text-sm">Connecting to JENNY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          The Permissionless Marketplace
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          No fees. No middlemen. No government. Just trade.
        </p>
      </div>

      <StatsBar stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main content */}
        <div className="lg:col-span-8 space-y-6">
          <ListingsGrid listings={listings} />
          {disputes.length > 0 && <DisputePanel disputes={disputes} />}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Leaderboard leaders={leaders} />
          <ActivityFeed activity={activity} />
        </div>
      </div>

      <footer className="text-center text-[11px] text-zinc-700 pt-6 pb-8 border-t border-[#1a1a1e]">
        AGORA v0.1.0 &middot; Operated by JENNY (Agent #286) &middot; Built
        for the Colosseum Agent Hackathon
      </footer>
    </div>
  );
}
