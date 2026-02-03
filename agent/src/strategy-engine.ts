import { PublicKey } from "@solana/web3.js";
import {
  PortfolioSnapshot,
  RiskAssessment,
  RiskParams,
  TokenHolding,
} from "./treasury-analyzer";
import { CONFIG } from "./config";

export interface StrategyProposal {
  type: "swap" | "stake" | "unstake" | "transfer";
  description: string;
  fromToken: string;
  toToken: string;
  amount: number; // in token units
  amountUsd: number;
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export class StrategyEngine {
  generateStrategies(
    snapshot: PortfolioSnapshot,
    risk: RiskAssessment,
    params: RiskParams
  ): StrategyProposal[] {
    const proposals: StrategyProposal[] = [];

    if (snapshot.totalValueUsd < 1) return proposals; // nothing to manage

    // Strategy 1: Rebalance stablecoin allocation
    if (risk.stablecoinDeficit < -5) {
      const deficit = Math.abs(risk.stablecoinDeficit);
      const targetSwapUsd = (deficit / 100) * snapshot.totalValueUsd;
      const maxSwapUsd = params.maxSwapUsdCents / 100;
      const swapUsd = Math.min(targetSwapUsd, maxSwapUsd);

      // Find the most overweight non-stable token to sell
      const nonStables = snapshot.holdings
        .filter((h) => !h.isStable && h.usdValue > 0)
        .sort((a, b) => b.percentage - a.percentage);

      if (nonStables.length > 0) {
        const source = nonStables[0];
        const swapAmount = (swapUsd / source.usdValue) * source.balance;

        proposals.push({
          type: "swap",
          description: `Swap ${swapAmount.toFixed(4)} ${source.symbol} to USDC to meet stablecoin target`,
          fromToken: source.symbol,
          toToken: "USDC",
          amount: swapAmount,
          amountUsd: swapUsd,
          reason: `Stablecoin allocation (${snapshot.stablecoinPercentage.toFixed(1)}%) is ${deficit.toFixed(1)}% below target (${params.minStablecoinBps / 100}%). Selling most overweight asset ${source.symbol} (${source.percentage.toFixed(1)}%).`,
          priority: deficit > 20 ? "urgent" : deficit > 10 ? "high" : "medium",
        });
      }
    }

    // Strategy 2: Reduce overexposed tokens
    for (const overexposed of risk.overexposedTokens) {
      const holding = snapshot.holdings.find((h) => h.symbol === overexposed.symbol);
      if (!holding) continue;

      const maxPct = overexposed.maxBps / 100;
      const excessPct = holding.percentage - maxPct;
      const excessUsd = (excessPct / 100) * snapshot.totalValueUsd;
      const maxSwapUsd = params.maxSwapUsdCents / 100;
      const swapUsd = Math.min(excessUsd, maxSwapUsd);
      const swapAmount = (swapUsd / holding.usdValue) * holding.balance;

      // Don't double-propose if we already have a swap for this token
      const alreadyProposed = proposals.some(
        (p) => p.fromToken === overexposed.symbol
      );
      if (alreadyProposed) continue;

      proposals.push({
        type: "swap",
        description: `Reduce ${overexposed.symbol} exposure by swapping ${swapAmount.toFixed(4)} to USDC`,
        fromToken: overexposed.symbol,
        toToken: "USDC",
        amount: swapAmount,
        amountUsd: swapUsd,
        reason: `${overexposed.symbol} at ${(overexposed.currentBps / 100).toFixed(1)}% exceeds ${maxPct.toFixed(1)}% max. Reducing by ${excessPct.toFixed(1)}%.`,
        priority: excessPct > 20 ? "high" : "medium",
      });
    }

    // Strategy 3: Stake idle SOL via Marinade
    const solHolding = snapshot.holdings.find((h) => h.symbol === "SOL");
    const msolHolding = snapshot.holdings.find((h) => h.symbol === "mSOL");
    if (solHolding && solHolding.percentage > 10) {
      // If SOL is >10% of portfolio and not much is staked, suggest staking
      const stakedRatio = msolHolding
        ? msolHolding.usdValue / (solHolding.usdValue + msolHolding.usdValue)
        : 0;

      if (stakedRatio < 0.5) {
        const stakeAmount = solHolding.balance * 0.3; // stake 30% of SOL
        proposals.push({
          type: "stake",
          description: `Stake ${stakeAmount.toFixed(4)} SOL via Marinade for mSOL yield`,
          fromToken: "SOL",
          toToken: "mSOL",
          amount: stakeAmount,
          amountUsd: stakeAmount * (snapshot.holdings.find((h) => h.symbol === "SOL")?.usdValue ?? 0) / (solHolding.balance || 1),
          reason: `${((1 - stakedRatio) * 100).toFixed(0)}% of SOL holdings are unstaked. Staking via Marinade earns ~7% APY while maintaining liquidity through mSOL.`,
          priority: "low",
        });
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    proposals.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return proposals;
  }
}
