const BASE_API = "https://base.blockscout.com/api/v2";

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  icon: string | null;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  momentum: number;
  meta: string;
}

export interface ChainStats {
  blockNumber: number;
  gasPrice: string;
  tokensTracked: number;
  totalTxns: string;
  avgBlockTime: string;
}

export interface MetaGroup {
  meta: string;
  count: number;
  totalMcap: number;
  topToken: string;
  topMcap: number;
}

// ── Meta classification rules ──

const META_RULES: { meta: string; match: (n: string, s: string) => boolean }[] = [
  {
    meta: "stable",
    match: (_, s) =>
      /^(usdc|usdt|dai|usdbc|busd|eurc|tusd|frax|lusd|gusd|pyusd|crvusd|mkusd|gho)$/i.test(s),
  },
  {
    meta: "infra",
    match: (n, s) =>
      /^(weth|eth|cbbtc|cbeth|reth|wsteth|steth|tbtc|wbtc|weeth|gtbtc)$/i.test(s) ||
      /wrapped|bridge|superbridge/i.test(n),
  },
  {
    meta: "lsd",
    match: (n, s) =>
      /restake|restaked|staked\s*(eth|btc)|liquid\s*stk|lsd|oeth|eeth|ezeth|rseth|meth|unieth|pufeth|sfrxeth/i.test(
        `${n} ${s}`
      ),
  },
  {
    meta: "ai",
    match: (n, s) =>
      /\bai\b|agent|virtual|neural|cognitive|sentient|gpt|llm/i.test(`${n} ${s}`),
  },
  {
    meta: "memecoin",
    match: (n, s) =>
      /brett|degen(?!\s*(ai|capital))|toshi|pepe|dog|cat|frog|moon|inu|shib|bonk|wojak|chad|mog|higher|normie|keyboard|based\s/i.test(
        `${n} ${s}`
      ),
  },
  {
    meta: "defi",
    match: (n, s) =>
      /aero|vault|lend|yield|swap|morpho|moonwell|seamless|compound|aave|uniswap|sushi|curve|balancer|extra|beefy|gains|stake|lombard|kelp|renzo|optimizer/i.test(
        `${n} ${s}`
      ),
  },
  {
    meta: "btc-fi",
    match: (n, s) =>
      /btc|bitcoin|solvbtc|fbtc|ibtc|bedrock/i.test(`${n} ${s}`),
  },
];

function classifyMeta(name: string, symbol: string): string {
  for (const rule of META_RULES) {
    if (rule.match(name, symbol)) return rule.meta;
  }
  return "other";
}

function isSpam(t: any): boolean {
  const name = (t.name || "").toLowerCase();
  const symbol = (t.symbol || "").toLowerCase();
  if (!t.circulating_market_cap || parseFloat(t.circulating_market_cap) <= 0)
    return true;
  if (
    name.includes("claim") ||
    name.includes("http") ||
    name.includes("visit") ||
    name.includes("www.") ||
    name.includes("airdrop") ||
    name.includes(".com") ||
    name.includes(".io") ||
    name.includes(".org")
  )
    return true;
  if (symbol.length > 12) return true;
  return false;
}

// ── ChainScanner ──

export class ChainScanner {
  private tokens: TokenData[] = [];
  private stats: ChainStats | null = null;
  private insights: string[] = [];
  private busy = false;
  private lastRefresh = 0;

  async refresh(): Promise<void> {
    if (this.busy) return;
    this.busy = true;

    try {
      // Fetch tokens + stats in parallel
      const [tokensRes, statsRes] = await Promise.all([
        fetch(
          `${BASE_API}/tokens?type=ERC-20&sort=fiat_value&order=desc`
        ).then((r) => r.json()),
        fetch(`${BASE_API}/stats`).then((r) => r.json()),
      ]);

      const items: any[] = tokensRes.items || [];

      this.tokens = items
        .filter((t) => !isSpam(t))
        .map((t) => {
          const price = parseFloat(t.exchange_rate || "0");
          const marketCap = parseFloat(t.circulating_market_cap || "0");
          const volume24h = parseFloat(t.volume_24h || "0");
          const holders = parseInt(t.holders_count || "0", 10);
          const momentum =
            marketCap > 0
              ? Math.round((volume24h / marketCap) * 10000) / 100
              : 0;

          return {
            address: t.address,
            name: t.name || "Unknown",
            symbol: t.symbol || "???",
            icon: t.icon_url || null,
            price,
            marketCap,
            volume24h,
            holders,
            momentum,
            meta: classifyMeta(t.name || "", t.symbol || ""),
          };
        });

      const rawBlockTime = statsRes.average_block_time ?? 2000;
      this.stats = {
        blockNumber: parseInt(statsRes.total_blocks || "0", 10),
        gasPrice:
          statsRes.gas_prices?.average?.toFixed(1) ||
          statsRes.gas_prices?.slow?.toFixed(1) ||
          "?",
        tokensTracked: this.tokens.length,
        totalTxns: statsRes.total_transactions || "0",
        avgBlockTime: (rawBlockTime / 1000).toFixed(1),
      };

      this.insights = this.computeInsights();
      this.lastRefresh = Date.now();

      console.log(
        `[ChainScanner] Refreshed: ${this.tokens.length} tokens, block ${this.stats.blockNumber}`
      );
    } catch (e: any) {
      console.error("[ChainScanner] Error:", e.message);
    } finally {
      this.busy = false;
    }
  }

  getTrending(
    limit = 20,
    sort: "momentum" | "volume" | "mcap" = "momentum"
  ): TokenData[] {
    // Exclude stables from trending -- they always have high volume
    const filtered = this.tokens.filter((t) => t.meta !== "stable");
    const sorted = [...filtered];

    if (sort === "momentum")
      sorted.sort((a, b) => b.momentum - a.momentum);
    else if (sort === "volume")
      sorted.sort((a, b) => b.volume24h - a.volume24h);
    else sorted.sort((a, b) => b.marketCap - a.marketCap);

    return sorted.slice(0, limit);
  }

  getMetas(): MetaGroup[] {
    const map: Record<
      string,
      { count: number; totalMcap: number; topToken: string; topMcap: number }
    > = {};

    for (const t of this.tokens) {
      if (!map[t.meta])
        map[t.meta] = { count: 0, totalMcap: 0, topToken: "", topMcap: 0 };
      map[t.meta].count++;
      map[t.meta].totalMcap += t.marketCap;
      if (t.marketCap > map[t.meta].topMcap) {
        map[t.meta].topMcap = t.marketCap;
        map[t.meta].topToken = t.symbol;
      }
    }

    return Object.entries(map)
      .map(([meta, d]) => ({ meta, ...d }))
      .sort((a, b) => b.totalMcap - a.totalMcap);
  }

  getStats(): ChainStats | null {
    return this.stats;
  }

  getInsights(): string[] {
    return this.insights;
  }

  getLastRefresh(): number {
    return this.lastRefresh;
  }

  private computeInsights(): string[] {
    const out: string[] = [];
    const metas = this.getMetas();
    const get = (key: string) => metas.find((m) => m.meta === key);

    // Top momentum
    const top = this.getTrending(3, "momentum");
    if (top[0]) {
      out.push(
        `${top[0].symbol} leading momentum at ${top[0].momentum}% vol/mcap ratio. ${top[0].momentum > 50 ? "Unusually high activity for its size." : "Active trading."}`
      );
    }

    // Narrative analysis
    const lsd = get("lsd");
    const btcfi = get("btc-fi");
    const defi = get("defi");
    const meme = get("memecoin");
    const ai = get("ai");

    if (lsd) {
      out.push(
        `Liquid Staking: ${lsd.count} tokens, $${fmtM(lsd.totalMcap)} combined. Led by ${lsd.topToken}. ${lsd.totalMcap > 1e9 ? "Major narrative on Base." : "Growing sector."}`
      );
    }
    if (btcfi) {
      out.push(
        `BTC-Fi: ${btcfi.count} tokens, $${fmtM(btcfi.totalMcap)} combined. ${btcfi.count > 5 ? "Bitcoin wrapper meta is strong on Base." : "Wrapped BTC presence."}`
      );
    }
    if (defi && defi.count > 0) {
      out.push(
        `DeFi: ${defi.count} tokens, $${fmtM(defi.totalMcap)} combined. Led by ${defi.topToken}.`
      );
    }
    if (meme && meme.count > 0) {
      out.push(
        `Memecoins: ${meme.count} tokens, $${fmtM(meme.totalMcap)} combined. ${meme.count > 5 ? "Meme meta is active." : "Modest presence."}`
      );
    }
    if (ai && ai.count > 0) {
      out.push(
        `AI/Agent tokens: ${ai.count} tracked, $${fmtM(ai.totalMcap)} combined. ${ai.count > 3 ? "AI agent meta alive on Base." : "Niche but present."}`
      );
    }

    // Chain stats
    if (this.stats) {
      out.push(
        `Base at block ${this.stats.blockNumber.toLocaleString()}. Gas ${this.stats.gasPrice} gwei. ${this.tokens.length} tokens tracked after spam filter.`
      );
    }

    // Spam
    const totalFetched = 50;
    const spamCount = totalFetched - this.tokens.length;
    if (spamCount > 5) {
      out.push(
        `Filtered ${spamCount}+ suspected scam/phishing tokens from results.`
      );
    }

    return out;
  }
}

function fmtM(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
