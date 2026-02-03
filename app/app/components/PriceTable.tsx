"use client";

interface PriceData {
  symbol: string;
  price: number;
  confidence: number;
  timestamp: number;
}

export default function PriceTable({ prices }: { prices: Record<string, PriceData> }) {
  const entries = Object.entries(prices);

  if (!entries.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Live Prices</h2>
        <p className="text-gray-500">Fetching from Pyth...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">Live Prices (Pyth)</h2>
      <div className="space-y-3">
        {entries.map(([symbol, data]) => (
          <div key={symbol} className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{symbol}</span>
            <div className="text-right">
              <span className="text-sm text-gray-300">
                ${data.price?.toFixed(data.price > 10 ? 2 : 4)}
              </span>
              {data.confidence && (
                <span className="text-xs text-gray-600 ml-1">
                  ±{data.confidence.toFixed(4)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
