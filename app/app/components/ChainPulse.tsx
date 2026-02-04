"use client";

interface ChainStats {
  blockNumber: number;
  gasPrice: string;
  tokensTracked: number;
  totalTxns: string;
  avgBlockTime: string;
}

function fmtTxns(s: string): string {
  const n = parseInt(s, 10);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  return n.toLocaleString();
}

export default function ChainPulse({
  stats,
  lastRefresh,
}: {
  stats: ChainStats | null;
  lastRefresh: number;
}) {
  if (!stats) return null;

  const ago = lastRefresh
    ? Math.round((Date.now() - lastRefresh) / 1000)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono">
      <Item label="Block" value={stats.blockNumber.toLocaleString()} />
      <Sep />
      <Item label="Gas" value={`${stats.gasPrice} gwei`} />
      <Sep />
      <Item label="Tokens" value={String(stats.tokensTracked)} />
      <Sep />
      <Item label="Total txns" value={fmtTxns(stats.totalTxns)} />
      <Sep />
      <Item label="Block time" value={`${stats.avgBlockTime}s`} />
      {ago !== null && (
        <>
          <Sep />
          <span className="text-zinc-600">
            updated {ago < 5 ? "just now" : `${ago}s ago`}
          </span>
        </>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-zinc-500">
      {label} <span className="text-zinc-300">{value}</span>
    </span>
  );
}

function Sep() {
  return <span className="text-zinc-800">|</span>;
}
