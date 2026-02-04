"use client";

export default function JennyInsights({ insights }: { insights: string[] }) {
  if (!insights.length) return null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          JENNY&apos;s Analysis
        </h2>
      </div>
      <div className="space-y-2">
        {insights.map((line, i) => (
          <div
            key={i}
            className="text-[13px] text-zinc-400 leading-relaxed pl-3 border-l-2 border-zinc-800"
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
