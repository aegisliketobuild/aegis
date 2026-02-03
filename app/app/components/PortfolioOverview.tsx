"use client";

interface Holding {
  symbol: string;
  balance: number;
  usdValue: number;
  percentage: number;
  isStable: boolean;
}

interface Portfolio {
  holdings: Holding[];
  totalValueUsd: number;
  stablecoinPercentage: number;
}

const TOKEN_COLORS: Record<string, string> = {
  SOL: "#9945ff",
  USDC: "#2775ca",
  mSOL: "#00d18c",
  USDT: "#26a17b",
};

export default function PortfolioOverview({ portfolio }: { portfolio: Portfolio | null }) {
  if (!portfolio || !portfolio.holdings?.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Portfolio</h2>
        <p className="text-gray-500">No holdings detected. Deposit tokens to the vault to begin.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">Portfolio Allocation</h2>

      {/* Allocation bar */}
      <div className="flex h-6 rounded-full overflow-hidden mb-6">
        {portfolio.holdings.map((h) => (
          <div
            key={h.symbol}
            style={{
              width: `${h.percentage}%`,
              backgroundColor: TOKEN_COLORS[h.symbol] || "#6b7280",
            }}
            className="transition-all duration-500"
            title={`${h.symbol}: ${h.percentage.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Holdings table */}
      <table className="w-full">
        <thead>
          <tr className="text-xs text-gray-500 uppercase tracking-wider">
            <th className="text-left pb-3">Token</th>
            <th className="text-right pb-3">Balance</th>
            <th className="text-right pb-3">USD Value</th>
            <th className="text-right pb-3">Allocation</th>
            <th className="text-right pb-3">Type</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {portfolio.holdings.map((h) => (
            <tr key={h.symbol} className="border-t border-aegis-border">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TOKEN_COLORS[h.symbol] || "#6b7280" }}
                  />
                  <span className="font-medium text-white">{h.symbol}</span>
                </div>
              </td>
              <td className="text-right text-gray-300">{h.balance.toFixed(4)}</td>
              <td className="text-right text-gray-300">${h.usdValue.toFixed(2)}</td>
              <td className="text-right text-gray-300">{h.percentage.toFixed(1)}%</td>
              <td className="text-right">
                <span className={h.isStable ? "text-green-400" : "text-gray-400"}>
                  {h.isStable ? "Stable" : "Volatile"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
