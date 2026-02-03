"use client";

import { useEffect, useState } from "react";
import ListingsGrid from "./components/ListingsGrid";
import ActivityFeed from "./components/ActivityFeed";
import StatsBar from "./components/StatsBar";
import DisputePanel from "./components/DisputePanel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const [statsRes, listingsRes, activityRes, disputesRes] =
        await Promise.all([
          fetch(`${API_BASE}/api/stats`).then((r) => r.json()),
          fetch(`${API_BASE}/api/listings`).then((r) => r.json()),
          fetch(`${API_BASE}/api/activity?limit=30`).then((r) => r.json()),
          fetch(`${API_BASE}/api/disputes/open`).then((r) => r.json()),
        ]);
      setStats(statsRes);
      setListings(listingsRes);
      setActivity(activityRes);
      setDisputes(disputesRes);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to JENNY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsBar stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ListingsGrid listings={listings} />
          <DisputePanel disputes={disputes} />
        </div>
        <div>
          <ActivityFeed activity={activity} />
        </div>
      </div>

      <div className="text-center text-sm text-gray-600 py-4">
        AGORA v0.1.0 | Operated by JENNY | No fees. No middlemen. No
        government.
      </div>
    </div>
  );
}
