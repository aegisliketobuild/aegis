"use client";

import { useEffect, useState } from "react";
import PortfolioOverview from "./components/PortfolioOverview";
import RiskPanel from "./components/RiskPanel";
import ProposalList from "./components/ProposalList";
import PriceTable from "./components/PriceTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  async function fetchData() {
    try {
      const [portfolioRes, riskRes, proposalRes, priceRes] = await Promise.all([
        fetch(`${API_BASE}/api/portfolio`).then((r) => r.json()),
        fetch(`${API_BASE}/api/risk`).then((r) => r.json()),
        fetch(`${API_BASE}/api/proposals`).then((r) => r.json()),
        fetch(`${API_BASE}/api/prices`).then((r) => r.json()),
      ]);
      setPortfolio(portfolioRes);
      setRisk(riskRes);
      setProposals(proposalRes);
      setPrices(priceRes);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-aegis-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to AEGIS agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400">Total Value</p>
          <p className="text-2xl font-bold text-white">
            ${portfolio?.totalValueUsd?.toFixed(2) || "0.00"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Risk Score</p>
          <p className={`text-2xl font-bold ${
            (risk?.score ?? 0) > 50 ? "text-red-400" :
            (risk?.score ?? 0) > 20 ? "text-yellow-400" : "text-green-400"
          }`}>
            {risk?.score ?? 0}/100
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Stablecoin %</p>
          <p className="text-2xl font-bold text-white">
            {portfolio?.stablecoinPercentage?.toFixed(1) || "0"}%
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Pending Proposals</p>
          <p className="text-2xl font-bold text-aegis-accent">
            {proposals?.filter((p: any) => p.status === "pending").length || 0}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PortfolioOverview portfolio={portfolio} />
          <ProposalList proposals={proposals} />
        </div>
        <div className="space-y-6">
          <RiskPanel risk={risk} />
          <PriceTable prices={prices} />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 py-4">
        Last updated: {lastUpdate} | AEGIS v0.1.0 | Built by JENNY
      </div>
    </div>
  );
}
