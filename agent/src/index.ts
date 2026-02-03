import dotenv from "dotenv";
import { AgoraAgent } from "./agent";
import { startApiServer } from "./api-server";

dotenv.config();

async function main() {
  console.log();
  console.log("    _    ____  ___  ____      _    ");
  console.log("   / \\  / ___|/ _ \\|  _ \\    / \\   ");
  console.log("  / _ \\| |  _| | | | |_) |  / _ \\  ");
  console.log(" / ___ \\ |_| | |_| |  _ <  / ___ \\ ");
  console.log("/_/   \\_\\____|\\___/|_| \\_\\/_/   \\_\\");
  console.log();
  console.log("  The Permissionless Marketplace");
  console.log("  Operated by JENNY (Agent #286)");
  console.log("  No fees. No middlemen. No government.");
  console.log();

  const agent = new AgoraAgent();
  agent.start();
  startApiServer(agent);

  process.on("SIGINT", () => {
    console.log("\n[JENNY] Shutting down marketplace...");
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
