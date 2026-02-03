import { PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { AegisAgent } from "./agent";
import { startApiServer } from "./api-server";

dotenv.config();

async function main() {
  console.log("===========================================");
  console.log("  AEGIS - Autonomous Treasury Guardian");
  console.log("  Built by JENNY for Solana DAOs");
  console.log("===========================================");
  console.log();

  // Vault authority to monitor (configurable via env)
  const vaultAuthority = new PublicKey(
    process.env.VAULT_AUTHORITY || "11111111111111111111111111111111"
  );

  // Optional risk parameter overrides from env
  const riskParams = {
    maxSingleTokenBps: parseInt(process.env.MAX_SINGLE_TOKEN_BPS || "3000"),
    minStablecoinBps: parseInt(process.env.MIN_STABLECOIN_BPS || "4000"),
    maxSwapUsdCents: parseInt(process.env.MAX_SWAP_USD_CENTS || "500000"),
    maxDailyVolumeUsdCents: parseInt(process.env.MAX_DAILY_VOLUME_USD_CENTS || "2000000"),
  };

  // Create and start the agent
  const agent = new AegisAgent(vaultAuthority, riskParams);
  agent.start();

  // Start the API server
  startApiServer(agent);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n[AEGIS] Shutting down...");
    agent.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    agent.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
