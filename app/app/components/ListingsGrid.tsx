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

export default function ListingsGrid({ listings }: { listings: Listing[] }) {
  if (!listings.length) {
    return (
      <div className="card text-center py-16">
        <p className="text-zinc-500">Marketplace is empty. Be the first to list.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
          Marketplace
        </h2>
        <span className="text-xs text-zinc-600">
          {listings.length} active
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listings.map((listing, i) => (
          <div
            key={listing.id}
            className="card group cursor-pointer hover:border-amber-500/30 animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`badge badge-${listing.category}`}>
                {listing.category}
              </span>
              <span className="text-lg font-bold text-amber-400 tabular-nums">
                ${(listing.priceCents / 100).toFixed(0)}
              </span>
            </div>
            <h3 className="text-[15px] font-medium text-white leading-snug mb-2 group-hover:text-amber-300 transition-colors">
              {listing.title}
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-4">
              {listing.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800" />
                <span>{listing.seller?.slice(0, 6)}...</span>
                {listing.sellerReputation != null && (
                  <span className="text-amber-600/70">
                    {listing.sellerReputation}
                  </span>
                )}
              </div>
              <button className="btn-primary !py-1.5 !px-3 !text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Buy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
