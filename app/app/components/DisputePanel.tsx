"use client";

interface Dispute {
  id: string;
  reason: string;
  amountCents: number;
  status: string;
  buyer: string;
  seller: string;
  createdAt: number;
  verdict?: {
    resolution: string;
    confidence: number;
    reasoning: string;
  };
}

export default function DisputePanel({ disputes }: { disputes: Dispute[] }) {
  if (!disputes.length) return null;

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-4">
        Open Disputes
      </h2>
      <div className="space-y-3">
        {disputes.map((d) => (
          <div key={d.id} className="card border-red-500/10">
            <div className="flex items-center justify-between mb-3">
              <span className="badge badge-open">dispute</span>
              <span className="text-sm font-semibold text-zinc-300 tabular-nums">
                ${(d.amountCents / 100).toFixed(0)} USDC
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-3">
              {d.reason}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-zinc-600 mb-3">
              <span>Buyer: {d.buyer?.slice(0, 8)}...</span>
              <span>Seller: {d.seller?.slice(0, 8)}...</span>
            </div>

            {d.verdict ? (
              <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 mt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-medium text-violet-400 uppercase tracking-wider">
                    JENNY's Verdict
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {d.verdict.confidence}% confidence
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                  {d.verdict.reasoning}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-amber-500/60 mt-1">
                Awaiting evidence from both parties...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
