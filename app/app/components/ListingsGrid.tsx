"use client";

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  seller: string;
  sellerReputation?: number;
  createdAt: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  services: "bg-blue-900/30 text-blue-400 border-blue-800",
  goods: "bg-green-900/30 text-green-400 border-green-800",
  digital: "bg-purple-900/30 text-purple-400 border-purple-800",
  general: "bg-gray-900/30 text-gray-400 border-gray-800",
};

export default function ListingsGrid({ listings }: { listings: Listing[] }) {
  if (!listings.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Marketplace</h2>
        <p className="text-gray-500">
          No active listings yet. The marketplace is open -- anyone can list goods and services.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">
        Marketplace ({listings.length} active)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="border border-aegis-border rounded-lg p-4 hover:border-amber-800 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium border ${CATEGORY_COLORS[listing.category] || CATEGORY_COLORS.general}`}
              >
                {listing.category}
              </span>
              <span className="text-lg font-bold text-amber-400">
                ${(listing.priceCents / 100).toFixed(2)}
              </span>
            </div>
            <h3 className="text-sm font-medium text-white mb-1">{listing.title}</h3>
            <p className="text-xs text-gray-400 mb-3 line-clamp-2">
              {listing.description}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                by {listing.seller?.slice(0, 8)}...
                {listing.sellerReputation != null && (
                  <span className="ml-1 text-amber-600">
                    ({listing.sellerReputation} rep)
                  </span>
                )}
              </span>
              <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
            </div>
            <button className="w-full mt-3 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium transition-colors">
              Buy with USDC
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
