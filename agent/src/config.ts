import { PublicKey } from "@solana/web3.js";

export const CONFIG = {
  // Solana
  rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  commitment: "confirmed" as const,

  // Known token mints (devnet)
  tokens: {
    SOL: {
      symbol: "SOL",
      mint: PublicKey.default, // native SOL
      decimals: 9,
      pythFeed: "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix", // SOL/USD devnet
      isStable: false,
    },
    USDC: {
      symbol: "USDC",
      mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // devnet USDC
      decimals: 6,
      pythFeed: "5SSkXsEKhepKzzDCcJDfp1qFhMSSCkLHsANq3SWCEyc1", // USDC/USD devnet
      isStable: true,
    },
    mSOL: {
      symbol: "mSOL",
      mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),
      decimals: 9,
      pythFeed: "9a6RNx3tCu1TSs6TBSfV2XRXEPEZXQ6WB7jRojZRvyeZ", // mSOL/USD devnet
      isStable: false,
    },
  },

  // Jupiter
  jupiterApiUrl: "https://quote-api.jup.ag/v6",

  // Pyth
  pythServiceUrl: "https://hermes.pyth.network",

  // Agent settings
  analysisIntervalMs: 60_000, // analyze every 60s
  proposalCooldownMs: 300_000, // min 5 min between proposals

  // API server
  apiPort: parseInt(process.env.API_PORT || "3001"),
};

export interface TokenInfo {
  symbol: string;
  mint: PublicKey;
  decimals: number;
  pythFeed: string;
  isStable: boolean;
}
