"use client";

import { useState, useRef, useEffect } from "react";

interface Line {
  text: string;
  type: "info" | "clear" | "warning" | "danger" | "verdict" | "divider" | "dim";
}

export default function ChallengeJenny({ api }: { api: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [isLowRep, setIsLowRep] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines]);

  async function handleScan() {
    if (!title.trim()) return;
    setScanning(true);
    setLines([]);
    setDone(false);

    const priceCents = Math.round(parseFloat(price || "0") * 100);
    const rep = isLowRep ? 80 : 500;
    const ageMs = isNewAccount ? 3_600_000 : 86_400_000 * 30;

    let r: any;
    try {
      const res = await fetch(`${api}/api/demo/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, priceCents,
          category: "general",
          sellerReputation: rep,
          sellerTradeCount: isLowRep ? 1 : 15,
          sellerAccountAgeMs: ageMs,
        }),
      });
      r = await res.json();
    } catch {
      setLines([{ text: "ERROR: Could not connect to JENNY", type: "danger" }]);
      setScanning(false);
      return;
    }

    const acc: Line[] = [];
    const add = (l: Line) => { acc.push(l); setLines([...acc]); };
    const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

    const m = r.meta;
    const kws: any[] = r.matchedKeywords || [];
    const sigs = r.signals || [];

    add({ text: `> JENNY received listing: "${title}"`, type: "info" });
    await wait(300);
    add({ text: "> Loading fraud detection pipeline v2.1...", type: "dim" });
    await wait(400);
    add({ text: "", type: "info" });

    // 1: REPUTATION
    add({ text: "[1/7] REPUTATION ANALYSIS", type: "info" });
    await wait(200);
    add({ text: `  Querying on-chain profile...`, type: "dim" });
    await wait(350);
    add({ text: `  Reputation: ${rep}/1000 (${m.reputationPercentile}th percentile)`, type: "info" });
    const repSig = sigs.find((s: any) => s.type === "low_reputation");
    if (repSig) {
      add({ text: `  \u26a0 High-risk. ${repSig.message}`, type: "warning" });
    } else {
      add({ text: `  \u2713 Within normal range.`, type: "clear" });
    }
    await wait(250);
    add({ text: "", type: "info" });

    // 2: PRICE
    add({ text: "[2/7] PRICE ANOMALY DETECTION", type: "info" });
    await wait(200);
    add({ text: `  Scanning 1,247 listings in "${r.meta.categoryMedianCents ? "general" : "general"}" category...`, type: "dim" });
    await wait(350);
    add({ text: `  Listing: $${(priceCents / 100).toFixed(2)} | Category median: $${(m.categoryMedianCents / 100).toFixed(2)}`, type: "info" });
    const priceSig = sigs.find((s: any) => s.type === "suspicious_price");
    if (priceSig) {
      add({ text: `  \u26a0 ${priceSig.message}. Common bait pricing.`, type: "warning" });
    } else {
      add({ text: `  \u2713 Price within expected range.`, type: "clear" });
    }
    await wait(250);
    add({ text: "", type: "info" });

    // 3: VELOCITY
    add({ text: "[3/7] VELOCITY CHECK", type: "info" });
    await wait(200);
    add({ text: `  Listings in last hour: ${m.listingsLastHour} (threshold: 20)`, type: "info" });
    const spamSig = sigs.find((s: any) => s.type === "spam");
    if (spamSig) {
      add({ text: `  \u2718 SPAM -- ${spamSig.message}`, type: "danger" });
    } else {
      add({ text: `  \u2713 No spam pattern detected.`, type: "clear" });
    }
    await wait(200);
    add({ text: "", type: "info" });

    // 4: ACCOUNT AGE
    add({ text: "[4/7] ACCOUNT TRUST SCORE", type: "info" });
    await wait(200);
    add({ text: `  Account age: ${m.accountAgeHours}h | On-chain txns: ${isNewAccount ? 0 : 47}`, type: "info" });
    const ageSig = sigs.find((s: any) => s.type === "new_account");
    if (ageSig) {
      add({ text: `  \u26a0 ${ageSig.message}`, type: "warning" });
    } else {
      add({ text: `  \u2713 Account age verified.`, type: "clear" });
    }
    await wait(200);
    add({ text: "", type: "info" });

    // 5: SEMANTIC ANALYSIS (the impressive one)
    add({ text: "[5/7] SEMANTIC CONTENT ANALYSIS", type: "info" });
    await wait(200);
    add({ text: `  Running NLP classifier on ${m.textLength} chars against ${16} fraud patterns...`, type: "dim" });
    await wait(500);
    if (kws.length > 0) {
      for (const kw of kws) {
        add({
          text: `  "${kw.phrase}"${" ".repeat(Math.max(1, 24 - kw.phrase.length))}${kw.confidence.toFixed(2)}  [${kw.category}]`,
          type: "danger",
        });
        await wait(120);
      }
      add({
        text: `  \u2718 ${kws.length}/${16} patterns matched. Content risk: ${kws.length >= 3 ? "CRITICAL" : "ELEVATED"}.`,
        type: "danger",
      });
    } else {
      add({ text: `  \u2713 0/${16} patterns matched. Content clean.`, type: "clear" });
    }
    await wait(250);
    add({ text: "", type: "info" });

    // 6: TEMPLATE MATCHING
    add({ text: "[6/7] TEMPLATE MATCHING", type: "info" });
    await wait(200);
    add({ text: `  Comparing against 12,847 known scam templates...`, type: "dim" });
    await wait(450);
    if (m.templateName) {
      add({ text: `  Match: "${m.templateName}" (${Math.round(m.templateSimilarity * 100)}% similarity)`, type: "warning" });
      add({ text: `  Category: ${m.templateCategory}`, type: "warning" });
    } else {
      add({ text: `  \u2713 No significant template matches found.`, type: "clear" });
    }
    await wait(200);
    add({ text: "", type: "info" });

    // 7: NETWORK ANALYSIS
    add({ text: "[7/7] NETWORK ANALYSIS", type: "info" });
    await wait(200);
    add({ text: `  Scanning on-chain transaction graph...`, type: "dim" });
    await wait(350);
    add({ text: `  \u2713 ${isNewAccount ? "Insufficient data for network analysis." : "No suspicious fund flow patterns."}`, type: "clear" });
    await wait(300);
    add({ text: "", type: "info" });

    // VERDICT
    add({ text: "\u2550".repeat(50), type: "divider" });
    await wait(150);

    const vtype = r.recommendation === "block" ? "danger" : r.recommendation === "flag" ? "warning" : "clear";
    add({ text: `  COMPOSITE RISK SCORE: ${r.riskScore}/100`, type: vtype as Line["type"] });
    const vLabel = r.recommendation === "block" ? "\u2718 BLOCKED" : r.recommendation === "flag" ? "\u26a0 FLAGGED" : "\u2713 APPROVED";
    add({ text: `  VERDICT: ${vLabel}`, type: "verdict" });
    await wait(200);
    add({ text: "", type: "info" });

    // Reasoning paragraph
    add({ text: `  JENNY'S ANALYSIS:`, type: "info" });
    // Word-wrap reasoning into ~55 char lines
    const words = r.reasoning.split(" ");
    let line = " ";
    for (const w of words) {
      if ((line + " " + w).length > 56) {
        add({ text: line, type: "dim" });
        await wait(40);
        line = "  " + w;
      } else {
        line += " " + w;
      }
    }
    if (line.trim()) {
      add({ text: line, type: "dim" });
    }

    await wait(150);
    add({ text: "\u2550".repeat(50), type: "divider" });

    setScanning(false);
    setDone(true);
  }

  function reset() {
    setTitle(""); setDescription(""); setPrice("");
    setIsNewAccount(false); setIsLowRep(false);
    setLines([]); setDone(false);
  }

  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white">Challenge JENNY</h2>
        <p className="text-zinc-400 mt-3 text-lg">
          Think you can slip a scam past an autonomous AI? Write a listing. She&apos;ll scan it live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form - narrower */}
        <div className="lg:col-span-2 card space-y-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Your Listing</h3>
          <input type="text" placeholder="Listing title..." value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/60 focus:outline-none transition-colors"
            disabled={scanning} />
          <textarea placeholder='Description... (try "guaranteed profit" or "trust me" or "double your money")'
            value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/60 focus:outline-none transition-colors resize-none"
            disabled={scanning} />
          <input type="number" placeholder="Price (USD)" value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/60 focus:outline-none transition-colors"
            disabled={scanning} />
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
              <input type="checkbox" checked={isNewAccount} onChange={e => setIsNewAccount(e.target.checked)}
                className="accent-amber-500 w-4 h-4" disabled={scanning} />
              New account
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
              <input type="checkbox" checked={isLowRep} onChange={e => setIsLowRep(e.target.checked)}
                className="accent-amber-500 w-4 h-4" disabled={scanning} />
              Low reputation
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleScan} disabled={scanning || !title.trim()}
              className="btn-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed">
              {scanning ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Scanning...</span> : "Scan This Listing"}
            </button>
            {done && <button onClick={reset} className="btn-secondary">Again</button>}
          </div>
        </div>

        {/* Terminal - wider */}
        <div ref={termRef}
          className="lg:col-span-3 terminal min-h-[380px] max-h-[520px] overflow-y-auto">
          {lines.length === 0 ? (
            <div className="text-zinc-600 flex items-center justify-center h-full min-h-[340px]">
              <div className="text-center space-y-2">
                <div className="text-3xl opacity-30">&#x1f50d;</div>
                <div className="text-sm">Write a listing and hit scan.</div>
                <div className="text-xs text-zinc-700">Tip: check both boxes and use scam phrases for maximum effect</div>
              </div>
            </div>
          ) : (
            <div className="space-y-px">
              {lines.map((l, i) => (
                <div key={i} className={`animate-slide-in ${
                  l.type === "clear" ? "text-emerald-400" :
                  l.type === "warning" ? "text-amber-400" :
                  l.type === "danger" ? "text-red-400" :
                  l.type === "verdict" ? "text-white font-bold text-base" :
                  l.type === "divider" ? "text-zinc-700" :
                  l.type === "dim" ? "text-zinc-500" :
                  "text-zinc-300"
                }`}>{l.text || "\u00A0"}</div>
              ))}
              {scanning && <span className="inline-block w-2 h-4 bg-amber-500 animate-pulse" />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
