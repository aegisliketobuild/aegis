"use client";

import { useState, useRef, useEffect } from "react";

const SCENARIOS = [
  {
    id: "missing",
    name: "The Ghost Seller",
    emoji: "\ud83d\udce6",
    desc: "Buyer paid. Seller vanished.",
    buyer: "crypto_nomad",
    seller: "anon_trader",
    amount: 4500,
    reason:
      "I never received my item. It has been 2 weeks since payment. Seller will not respond to messages.",
    buyerEvidence:
      "I paid $45 on Jan 15. Seller said it would ship within 3 days. It is now Feb 1. I have sent 4 messages with no response. The seller has not been active on the platform since Jan 16. Transaction hash: 7xK9mPqR...",
    sellerEvidence: "",
    buyerRep: 950,
    sellerRep: 430,
    buyerTrades: 112,
    sellerTrades: 8,
  },
  {
    id: "notasdescribed",
    name: "The Template Job",
    emoji: "\ud83c\udfad",
    desc: "Paid for custom work. Got copy-paste.",
    buyer: "maria_designs",
    seller: "devtools_sam",
    amount: 25000,
    reason:
      "The smart contract audit was a copy-paste template. Not the custom audit I paid $250 for.",
    buyerEvidence:
      "I paid $250 for a custom smart contract audit of my Anchor program. The listing promised coverage of reentrancy, overflow, PDA validation, signer checks, and CPI safety with severity ratings. What I received was a generic 2-page document that does not reference my contract address or any specific logic. I can show the delivered document matches free templates found online word-for-word.",
    sellerEvidence:
      "I delivered the audit report within the agreed timeframe. The report covers all standard security checks as listed. The buyer has unrealistic expectations for this price point. A full custom audit at this depth costs $2,000+ at any firm.",
    buyerRep: 870,
    sellerRep: 720,
    buyerTrades: 47,
    sellerTrades: 23,
  },
  {
    id: "genuine",
    name: "The Serial Disputer",
    emoji: "\u2705",
    desc: "Buyer disputes everything. Seller has receipts.",
    buyer: "anon_trader",
    seller: "libre_market",
    amount: 12000,
    reason: "Item looks different from the listing photos.",
    buyerEvidence: "",
    sellerEvidence:
      "I shipped exactly what was listed. I have shipping confirmation with tracking showing delivery, timestamped photos of the item before shipping that match the listing exactly, and the listing clearly described all details. This buyer has disputed 3 of their last 5 purchases. Their dispute rate is 60% which is far above normal. I believe this is a pattern of attempting to get items for free.",
    buyerRep: 430,
    sellerRep: 810,
    buyerTrades: 8,
    sellerTrades: 64,
  },
];

interface Line {
  text: string;
  type: "info" | "clear" | "warning" | "danger" | "verdict" | "divider";
}

export default function DisputeArena({ api }: { api: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [judging, setJudging] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scenario = SCENARIOS.find((s) => s.id === selected);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  async function handleJudge() {
    if (!scenario) return;
    setJudging(true);
    setLines([]);
    setDone(false);

    let verdict: any;
    try {
      const res = await fetch(`${api}/api/demo/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: `demo_${scenario.id}`,
          buyer: scenario.buyer,
          seller: scenario.seller,
          amountCents: scenario.amount,
          reason: scenario.reason,
          evidenceBuyer: scenario.buyerEvidence,
          evidenceSeller: scenario.sellerEvidence,
          buyerReputation: scenario.buyerRep,
          sellerReputation: scenario.sellerRep,
          buyerTradeCount: scenario.buyerTrades,
          sellerTradeCount: scenario.sellerTrades,
        }),
      });
      verdict = await res.json();
    } catch {
      setLines([
        { text: "ERROR: Could not connect to JENNY", type: "danger" },
      ]);
      setJudging(false);
      return;
    }

    const acc: Line[] = [];
    const add = (line: Line) => {
      acc.push(line);
      setLines([...acc]);
    };
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    add({
      text: `> JENNY reviewing: "${scenario.name}"`,
      type: "info",
    });
    await delay(350);
    add({
      text: `> Amount at stake: $${(scenario.amount / 100).toFixed(2)} USDC`,
      type: "info",
    });
    await delay(300);
    add({ text: "", type: "info" });

    add({ text: `> Loading buyer: ${scenario.buyer}`, type: "info" });
    await delay(350);
    add({
      text: `  rep ${scenario.buyerRep}/1000 | ${scenario.buyerTrades} trades`,
      type: "info",
    });
    await delay(250);

    add({ text: `> Loading seller: ${scenario.seller}`, type: "info" });
    await delay(350);
    add({
      text: `  rep ${scenario.sellerRep}/1000 | ${scenario.sellerTrades} trades`,
      type: "info",
    });
    await delay(400);
    add({ text: "", type: "info" });

    add({ text: "> Evaluating evidence...", type: "info" });
    await delay(300);

    if (scenario.buyerEvidence) {
      const qual =
        scenario.buyerEvidence.length > 100 ? "DETAILED" : "SPARSE";
      add({
        text: `  Buyer: ${scenario.buyerEvidence.length} chars (${qual})`,
        type: qual === "DETAILED" ? "clear" : "warning",
      });
    } else {
      add({ text: "  Buyer: NO EVIDENCE", type: "danger" });
    }
    await delay(250);

    if (scenario.sellerEvidence) {
      const qual =
        scenario.sellerEvidence.length > 100 ? "DETAILED" : "SPARSE";
      add({
        text: `  Seller: ${scenario.sellerEvidence.length} chars (${qual})`,
        type: qual === "DETAILED" ? "clear" : "warning",
      });
    } else {
      add({ text: "  Seller: NO RESPONSE", type: "danger" });
    }
    await delay(400);

    add({ text: "", type: "info" });
    add({ text: "> Weighing factors...", type: "info" });
    await delay(700);
    add({ text: "", type: "info" });

    add({ text: "\u2550".repeat(48), type: "divider" });
    await delay(200);

    const label =
      verdict.resolution === "buyer_wins"
        ? "\u2190 BUYER WINS"
        : verdict.resolution === "seller_wins"
          ? "SELLER WINS \u2192"
          : "\u2194 50/50 SPLIT";

    add({ text: `  ${label}`, type: "verdict" });
    add({
      text: `  Confidence: ${verdict.confidence}%`,
      type: verdict.confidence > 70 ? "clear" : "warning",
    });
    await delay(250);
    add({ text: "", type: "info" });

    const reasoningLines = verdict.reasoning
      .split("\n")
      .filter((l: string) => l.trim());
    for (const rl of reasoningLines) {
      add({ text: `  ${rl}`, type: "info" });
      await delay(120);
    }

    add({ text: "\u2550".repeat(48), type: "divider" });

    setJudging(false);
    setDone(true);
  }

  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Dispute Arena
        </h2>
        <p className="text-zinc-400 mt-3 text-lg">
          Pick a dispute. Watch JENNY weigh the evidence and deliver a verdict.
        </p>
      </div>

      {/* Scenario Picker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSelected(s.id);
              setLines([]);
              setDone(false);
            }}
            disabled={judging}
            className={`card text-left transition-all ${
              selected === s.id
                ? "border-amber-500/50 bg-amber-500/5"
                : ""
            } ${judging ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-zinc-600"}`}
          >
            <div className="text-2xl mb-2">{s.emoji}</div>
            <div className="font-semibold text-white text-sm">{s.name}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.desc}</div>
            <div className="text-[11px] text-zinc-600 mt-2 font-mono">
              {s.buyer} vs {s.seller} &middot; $
              {(s.amount / 100).toFixed(0)}
            </div>
          </button>
        ))}
      </div>

      {scenario && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Evidence */}
          <div className="space-y-4">
            <div className="card border-blue-500/20">
              <div className="text-[11px] text-blue-400 font-semibold uppercase tracking-widest mb-2">
                Buyer: {scenario.buyer}
                <span className="text-zinc-600 ml-2 normal-case">
                  rep {scenario.buyerRep}
                </span>
              </div>
              <div className="text-sm text-zinc-300 mb-3 italic">
                &ldquo;{scenario.reason}&rdquo;
              </div>
              {scenario.buyerEvidence ? (
                <div className="text-xs text-zinc-500 bg-zinc-900/80 rounded-lg p-3 leading-relaxed">
                  {scenario.buyerEvidence}
                </div>
              ) : (
                <div className="text-xs text-red-400/70 italic">
                  No evidence submitted
                </div>
              )}
            </div>

            <div className="card border-orange-500/20">
              <div className="text-[11px] text-orange-400 font-semibold uppercase tracking-widest mb-2">
                Seller: {scenario.seller}
                <span className="text-zinc-600 ml-2 normal-case">
                  rep {scenario.sellerRep}
                </span>
              </div>
              {scenario.sellerEvidence ? (
                <div className="text-xs text-zinc-500 bg-zinc-900/80 rounded-lg p-3 leading-relaxed">
                  {scenario.sellerEvidence}
                </div>
              ) : (
                <div className="text-xs text-red-400/70 italic">
                  No response from seller
                </div>
              )}
            </div>

            <button
              onClick={handleJudge}
              disabled={judging}
              className="btn-primary w-full disabled:opacity-30"
            >
              {judging ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  JENNY is deliberating...
                </span>
              ) : (
                "Let JENNY Judge This"
              )}
            </button>
          </div>

          {/* Right: Terminal */}
          <div
            ref={terminalRef}
            className="terminal min-h-[340px] max-h-[420px] overflow-y-auto"
          >
            {lines.length === 0 ? (
              <div className="text-zinc-600 flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  <div className="text-3xl mb-3 opacity-40">
                    &#x2696;&#xfe0f;
                  </div>
                  <div className="text-sm">
                    Click &ldquo;Let JENNY Judge This&rdquo; to start.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className={`animate-slide-in ${
                      line.type === "clear"
                        ? "text-emerald-400"
                        : line.type === "warning"
                          ? "text-amber-400"
                          : line.type === "danger"
                            ? "text-red-400"
                            : line.type === "verdict"
                              ? "text-white font-bold text-lg"
                              : line.type === "divider"
                                ? "text-zinc-700"
                                : "text-zinc-400"
                    }`}
                  >
                    {line.text || "\u00A0"}
                  </div>
                ))}
                {judging && (
                  <span className="inline-block w-2 h-4 bg-amber-500 animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
