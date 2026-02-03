"use client";

import { useState, useRef, useEffect } from "react";

interface ScanLine {
  text: string;
  type: "info" | "clear" | "warning" | "danger" | "verdict" | "divider";
}

export default function ChallengeJenny({ api }: { api: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [isLowRep, setIsLowRep] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lines, setLines] = useState<ScanLine[]>([]);
  const [done, setDone] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  async function handleScan() {
    if (!title.trim()) return;

    setScanning(true);
    setLines([]);
    setDone(false);

    const priceCents = Math.round(parseFloat(price || "0") * 100);

    let report: any;
    try {
      const res = await fetch(`${api}/api/demo/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priceCents,
          category: "general",
          sellerReputation: isLowRep ? 80 : 500,
          sellerTradeCount: isLowRep ? 1 : 15,
          sellerAccountAgeMs: isNewAccount ? 3_600_000 : 86_400_000 * 30,
        }),
      });
      report = await res.json();
    } catch {
      setLines([
        {
          text: "ERROR: Could not connect to JENNY. Is the agent running?",
          type: "danger",
        },
      ]);
      setScanning(false);
      return;
    }

    const acc: ScanLine[] = [];
    const add = (line: ScanLine) => {
      acc.push(line);
      setLines([...acc]);
    };
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    add({ text: `> JENNY received listing: "${title}"`, type: "info" });
    await delay(350);
    add({
      text: "> Initializing fraud detection pipeline...",
      type: "info",
    });
    await delay(500);
    add({ text: "", type: "info" });

    // Step 1: Reputation
    add({ text: "> [1/5] Checking seller reputation...", type: "info" });
    await delay(450);
    const repSignal = report.signals.find(
      (s: any) => s.type === "low_reputation"
    );
    if (repSignal) {
      add({ text: `  \u26a0 ${repSignal.message}`, type: "warning" });
    } else {
      add({ text: "  \u2713 Reputation within normal range", type: "clear" });
    }
    await delay(250);

    // Step 2: Price
    add({ text: "> [2/5] Analyzing price anomalies...", type: "info" });
    await delay(400);
    const priceSignal = report.signals.find(
      (s: any) => s.type === "suspicious_price"
    );
    if (priceSignal) {
      add({ text: `  \u26a0 ${priceSignal.message}`, type: "warning" });
    } else {
      add({
        text: `  \u2713 Price $${(priceCents / 100).toFixed(2)} -- no anomalies`,
        type: "clear",
      });
    }
    await delay(250);

    // Step 3: Spam
    add({ text: "> [3/5] Scanning for spam patterns...", type: "info" });
    await delay(350);
    const spamSignal = report.signals.find((s: any) => s.type === "spam");
    if (spamSignal) {
      add({ text: `  \u2718 ${spamSignal.message}`, type: "danger" });
    } else {
      add({ text: "  \u2713 No spam patterns detected", type: "clear" });
    }
    await delay(250);

    // Step 4: Account age
    add({ text: "> [4/5] Checking account age...", type: "info" });
    await delay(450);
    const ageSignal = report.signals.find(
      (s: any) => s.type === "new_account"
    );
    if (ageSignal) {
      add({ text: `  \u26a0 ${ageSignal.message}`, type: "warning" });
    } else {
      add({ text: "  \u2713 Account age verified", type: "clear" });
    }
    await delay(250);

    // Step 5: Keywords
    add({
      text: "> [5/5] Deep-scanning content for fraud signals...",
      type: "info",
    });
    await delay(600);
    const kwSignal = report.signals.find((s: any) => s.type === "keyword");
    if (kwSignal) {
      add({ text: `  \u2718 ${kwSignal.message}`, type: "danger" });
    } else {
      add({
        text: "  \u2713 Content clean -- no suspicious language",
        type: "clear",
      });
    }
    await delay(400);

    add({ text: "", type: "info" });
    add({ text: "\u2550".repeat(48), type: "divider" });
    await delay(250);

    const verdictType =
      report.recommendation === "block"
        ? "danger"
        : report.recommendation === "flag"
          ? "warning"
          : "clear";

    add({
      text: `  RISK SCORE: ${report.riskScore}/100`,
      type: verdictType as ScanLine["type"],
    });

    const emoji =
      report.recommendation === "block"
        ? "\u2718 BLOCKED"
        : report.recommendation === "flag"
          ? "\u26a0 FLAGGED"
          : "\u2713 ALLOWED";
    add({ text: `  VERDICT: ${emoji}`, type: "verdict" });

    if (report.recommendation === "block") {
      add({
        text: "  This listing would be REJECTED by JENNY.",
        type: "danger",
      });
    } else if (report.recommendation === "flag") {
      add({
        text: "  This listing would be FLAGGED for review.",
        type: "warning",
      });
    } else {
      add({
        text: "  This listing passes. JENNY would let it through.",
        type: "clear",
      });
    }

    add({ text: "\u2550".repeat(48), type: "divider" });

    setScanning(false);
    setDone(true);
  }

  function reset() {
    setTitle("");
    setDescription("");
    setPrice("");
    setIsNewAccount(false);
    setIsLowRep(false);
    setLines([]);
    setDone(false);
  }

  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Challenge JENNY
        </h2>
        <p className="text-zinc-400 mt-3 text-lg">
          Think you can slip a scam past an autonomous AI? Write a listing.
          She&apos;ll scan it live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <div className="card space-y-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Your Listing
          </h3>

          <input
            type="text"
            placeholder="Listing title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/60 focus:outline-none transition-colors"
            disabled={scanning}
          />
          <textarea
            placeholder='Description... (try "guaranteed profit" or "trust me" or "send first")'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/60 focus:outline-none transition-colors resize-none"
            disabled={scanning}
          />
          <input
            type="number"
            placeholder="Price (USD)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/60 focus:outline-none transition-colors"
            disabled={scanning}
          />

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isNewAccount}
                onChange={(e) => setIsNewAccount(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
                disabled={scanning}
              />
              New account (&lt;24h)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLowRep}
                onChange={(e) => setIsLowRep(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
                disabled={scanning}
              />
              Low reputation (80/1000)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleScan}
              disabled={scanning || !title.trim()}
              className="btn-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {scanning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Scanning...
                </span>
              ) : (
                "Scan This Listing"
              )}
            </button>
            {done && (
              <button onClick={reset} className="btn-secondary">
                Try Again
              </button>
            )}
          </div>
        </div>

        {/* Right: Terminal Output */}
        <div
          ref={terminalRef}
          className="terminal min-h-[340px] max-h-[420px] overflow-y-auto"
        >
          {lines.length === 0 ? (
            <div className="text-zinc-600 flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center">
                <div className="text-3xl mb-3 opacity-40">&#x1f50d;</div>
                <div className="text-sm">
                  Write a listing and hit scan.
                  <br />
                  JENNY will analyze it live.
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
                            ? "text-white font-bold text-base"
                            : line.type === "divider"
                              ? "text-zinc-700"
                              : "text-zinc-400"
                  }`}
                >
                  {line.text || "\u00A0"}
                </div>
              ))}
              {scanning && (
                <span className="inline-block w-2 h-4 bg-amber-500 animate-pulse" />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
