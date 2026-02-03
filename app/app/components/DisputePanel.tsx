"use client";

interface Dispute {
  id: string;
  orderId: string;
  buyer: string;
  seller: string;
  reason: string;
  amountCents: number;
  status: string;
  createdAt: number;
  verdict?: {
    resolution: string;
    confidence: number;
    reasoning: string;
  };
}

export default function DisputePanel({ disputes }: { disputes: Dispute[] }) {
  if (!disputes.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">
          Open Disputes
        </h2>
        <p className="text-gray-500 text-sm">
          No open disputes. JENNY is ready to mediate when needed.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">
        Open Disputes ({disputes.length})
      </h2>
      <div className="space-y-4">
        {disputes.map((d) => (
          <div key={d.id} className="border border-red-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="badge-high">
                ${(d.amountCents / 100).toFixed(2)} at stake
              </span>
              <span className="text-xs text-gray-500">
                {new Date(d.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-white mb-2">{d.reason}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span>Buyer: {d.buyer?.slice(0, 8)}...</span>
              <span>Seller: {d.seller?.slice(0, 8)}...</span>
            </div>

            {d.verdict ? (
              <div className="bg-purple-900/20 border border-purple-800/30 rounded p-3">
                <p className="text-xs text-purple-400 font-medium mb-1">
                  JENNY's Verdict ({d.verdict.confidence}% confidence)
                </p>
                <p className="text-sm text-gray-300">{d.verdict.reasoning}</p>
              </div>
            ) : (
              <div className="text-xs text-amber-400">
                Awaiting evidence from both parties...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
