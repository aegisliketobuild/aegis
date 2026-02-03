import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { CONFIG, TokenInfo } from "./config";
import { PriceFeed } from "./price-feed";

export interface TokenHolding {
  symbol: string;
  mint: PublicKey;
  balance: number; // in token units
  usdValue: number;
  percentage: number; // of total portfolio
  isStable: boolean;
}

export interface PortfolioSnapshot {
  timestamp: number;
  holdings: TokenHolding[];
  totalValueUsd: number;
  stablecoinPercentage: number;
  largestNonStablePercentage: number;
}

export interface RiskAssessment {
  score: number; // 0-100, 100 = highest risk
  alerts: RiskAlert[];
  stablecoinDeficit: number; // negative = under target
  overexposedTokens: { symbol: string; currentBps: number; maxBps: number }[];
}

export interface RiskAlert {
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}

export interface RiskParams {
  maxSingleTokenBps: number;
  minStablecoinBps: number;
  maxSwapUsdCents: number;
  maxDailyVolumeUsdCents: number;
}

export class TreasuryAnalyzer {
  private connection: Connection;
  private priceFeed: PriceFeed;
  private snapshots: PortfolioSnapshot[] = [];

  constructor(connection: Connection, priceFeed: PriceFeed) {
    this.connection = connection;
    this.priceFeed = priceFeed;
  }

  async analyzePortfolio(vaultAuthority: PublicKey): Promise<PortfolioSnapshot> {
    await this.priceFeed.fetchPrices();
    const holdings: TokenHolding[] = [];

    // Check SOL balance
    const solBalance = await this.connection.getBalance(vaultAuthority);
    const solPrice = this.priceFeed.getPrice("SOL") || 0;
    const solValue = (solBalance / 1e9) * solPrice;
    if (solBalance > 0) {
      holdings.push({
        symbol: "SOL",
        mint: PublicKey.default,
        balance: solBalance / 1e9,
        usdValue: solValue,
        percentage: 0, // calculated below
        isStable: false,
      });
    }

    // Check SPL token balances
    for (const token of Object.values(CONFIG.tokens)) {
      if (token.mint.equals(PublicKey.default)) continue; // skip SOL (already checked)

      try {
        const ata = await getAssociatedTokenAddress(token.mint, vaultAuthority, true);
        const account = await getAccount(this.connection, ata);
        const balance = Number(account.amount) / Math.pow(10, token.decimals);
        const price = this.priceFeed.getPrice(token.symbol) || 0;
        const usdValue = balance * price;

        if (balance > 0) {
          holdings.push({
            symbol: token.symbol,
            mint: token.mint,
            balance,
            usdValue,
            percentage: 0,
            isStable: token.isStable,
          });
        }
      } catch {
        // Token account doesn't exist, skip
      }
    }

    // Calculate percentages
    const totalValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
    for (const holding of holdings) {
      holding.percentage = totalValue > 0 ? (holding.usdValue / totalValue) * 100 : 0;
    }

    const stablecoinPercentage = holdings
      .filter((h) => h.isStable)
      .reduce((sum, h) => sum + h.percentage, 0);

    const largestNonStablePercentage = Math.max(
      0,
      ...holdings.filter((h) => !h.isStable).map((h) => h.percentage)
    );

    const snapshot: PortfolioSnapshot = {
      timestamp: Date.now(),
      holdings,
      totalValueUsd: totalValue,
      stablecoinPercentage,
      largestNonStablePercentage,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > 1000) this.snapshots.shift();

    return snapshot;
  }

  assessRisk(snapshot: PortfolioSnapshot, riskParams: RiskParams): RiskAssessment {
    const alerts: RiskAlert[] = [];
    const overexposed: RiskAssessment["overexposedTokens"] = [];
    let riskScore = 0;

    // Check stablecoin allocation
    const minStablePct = riskParams.minStablecoinBps / 100;
    const stableDeficit = snapshot.stablecoinPercentage - minStablePct;

    if (stableDeficit < 0) {
      const severity = stableDeficit < -20 ? "critical" : stableDeficit < -10 ? "high" : "medium";
      alerts.push({
        severity,
        message: `Stablecoin allocation ${snapshot.stablecoinPercentage.toFixed(1)}% is below target ${minStablePct.toFixed(1)}% (deficit: ${Math.abs(stableDeficit).toFixed(1)}%)`,
      });
      riskScore += Math.min(40, Math.abs(stableDeficit) * 2);
    }

    // Check individual token exposure
    const maxSinglePct = riskParams.maxSingleTokenBps / 100;
    for (const holding of snapshot.holdings) {
      if (holding.isStable) continue;
      if (holding.percentage > maxSinglePct) {
        overexposed.push({
          symbol: holding.symbol,
          currentBps: Math.round(holding.percentage * 100),
          maxBps: riskParams.maxSingleTokenBps,
        });
        alerts.push({
          severity: holding.percentage > maxSinglePct * 1.5 ? "high" : "medium",
          message: `${holding.symbol} at ${holding.percentage.toFixed(1)}% exceeds max ${maxSinglePct.toFixed(1)}%`,
        });
        riskScore += Math.min(30, (holding.percentage - maxSinglePct) * 2);
      }
    }

    // Check concentration (number of tokens)
    if (snapshot.holdings.length <= 1 && snapshot.totalValueUsd > 1000) {
      alerts.push({
        severity: "high",
        message: "Treasury is concentrated in a single asset",
      });
      riskScore += 20;
    }

    // Check for zero stablecoins
    if (snapshot.stablecoinPercentage === 0 && snapshot.totalValueUsd > 100) {
      alerts.push({
        severity: "critical",
        message: "Treasury holds zero stablecoins",
      });
      riskScore += 30;
    }

    return {
      score: Math.min(100, riskScore),
      alerts,
      stablecoinDeficit: stableDeficit,
      overexposedTokens: overexposed,
    };
  }

  getSnapshots(): PortfolioSnapshot[] {
    return this.snapshots;
  }
}
