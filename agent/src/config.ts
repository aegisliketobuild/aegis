import { PublicKey } from "@solana/web3.js";

export const CONFIG = {
  // Solana
  rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  commitment: "confirmed" as const,

  // USDC mint (devnet)
  usdcMint: new PublicKey(
    process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  ),

  // Agent settings
  scanIntervalMs: 30_000, // check for new disputes / listings every 30s
  reputationUpdateIntervalMs: 300_000, // recalculate reputation every 5 min

  // Dispute resolution
  autoResolveTimeoutMs: 86_400_000 * 3, // auto-resolve after 3 days if no response

  // Fraud detection thresholds
  fraud: {
    minReputationToList: 100,
    suspiciouslyLowPriceRatio: 0.3, // 70% below average = suspicious
    maxListingsPerHour: 20,
    newAccountGracePeriodMs: 86_400_000, // 24h grace period for new accounts
  },

  // API server
  apiPort: parseInt(process.env.API_PORT || "3001"),
};
