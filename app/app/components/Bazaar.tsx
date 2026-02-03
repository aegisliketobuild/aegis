const CATEGORY_CLASSES: Record<string, string> = {
  services: "badge-services",
  goods: "badge-goods",
  digital: "badge-digital",
};

export default function Bazaar({ listings }: { listings: any[] }) {
  if (!listings.length) return null;

  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          The Bazaar
        </h2>
        <p className="text-zinc-400 mt-3 text-lg">
          {listings.length} live listings. Every one scanned by JENNY before
          going public.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings.map((l, i) => (
          <div
            key={l.id}
            className="card group animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <span
                className={`badge ${CATEGORY_CLASSES[l.category] || "badge-general"}`}
              >
                {l.category}
              </span>
              <span className="text-lg font-bold text-amber-500">
                ${(l.priceCents / 100).toFixed(0)}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1">
              {l.title}
            </h3>
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
              {l.description}
            </p>
            <div className="mt-3 pt-3 border-t border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="btn-primary w-full text-xs py-1.5">
                Buy with USDC
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
