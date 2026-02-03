"use client";

interface Proposal {
  proposal: {
    type: string;
    description: string;
    fromToken: string;
    toToken: string;
    amount: number;
    amountUsd: number;
    reason: string;
    priority: string;
  };
  createdAt: number;
  status: string;
}

export default function ProposalList({ proposals }: { proposals: Proposal[] }) {
  if (!proposals?.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Strategy Proposals</h2>
        <p className="text-gray-500">
          No proposals yet. The agent will generate proposals when portfolio risk parameters are violated.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">
        Strategy Proposals ({proposals.length})
      </h2>
      <div className="space-y-4">
        {proposals.map((p, i) => (
          <div key={i} className="border border-aegis-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`badge-${p.proposal.priority}`}>
                  {p.proposal.priority}
                </span>
                <span className={`badge-${p.status}`}>{p.status}</span>
                <span className="text-xs text-gray-500 uppercase">
                  {p.proposal.type}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(p.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm text-white font-medium mb-1">
              {p.proposal.description}
            </p>

            <p className="text-xs text-gray-400 mb-3">{p.proposal.reason}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                {p.proposal.fromToken} → {p.proposal.toToken}
              </span>
              <span>{p.proposal.amount.toFixed(4)} tokens</span>
              <span>${p.proposal.amountUsd.toFixed(2)}</span>
            </div>

            {p.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors">
                  Approve
                </button>
                <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors">
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
