import dotenv from "dotenv";
import { AgoraAgent } from "./agent";
import { startApiServer } from "./api-server";
import { seedDemoData } from "./seed";
import { ChainScanner } from "./chain-scanner";

dotenv.config();

async function main() {
  console.log();
  console.log("    _    ____  ___  ____      _    ");
  console.log("   / \\  / ___|/ _ \\|  _ \\    / \\   ");
  console.log("  / _ \\| |  _| | | | |_) |  / _ \\  ");
  console.log(" / ___ \\ |_| | |_| |  _ <  / ___ \\ ");
  console.log("/_/   \\_\\____|\\___/|_| \\_\\/_/   \\_\\");
  console.log();
  console.log("  On-Chain Intelligence Agent");
  console.log("  Operated by JENNY (Agent #286)");
  console.log("  Watching Base chain. Every block. Every token.");
  console.log();

  const agent = new AgoraAgent();
  const scanner = new ChainScanner();

  // Seed demo marketplace data (backwards compat)
  seedDemoData(agent);
  agent.start();

  // Start chain scanner -- first refresh, then every 45 seconds
  console.log("[JENNY] Starting chain scanner...");
  await scanner.refresh();
  console.log("[JENNY] Initial scan complete.");
  const scanInterval = setInterval(() => scanner.refresh(), 45_000);

  startApiServer(agent, scanner);

  process.on("SIGINT", () => {
    console.log("\n[JENNY] Shutting down...");
    clearInterval(scanInterval);
    agent.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clearInterval(scanInterval);
    agent.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
