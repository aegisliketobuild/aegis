import express from "express";
import cors from "cors";
import { AegisAgent } from "./agent";
import { CONFIG } from "./config";

export function startApiServer(agent: AegisAgent): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", agent: "AEGIS", version: "0.1.0" });
  });

  // Get current portfolio snapshot
  app.get("/api/portfolio", async (_req, res) => {
    try {
      const snapshot = await agent.getLatestSnapshot();
      res.json(snapshot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get risk assessment
  app.get("/api/risk", async (_req, res) => {
    try {
      const risk = await agent.getLatestRiskAssessment();
      res.json(risk);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending strategy proposals
  app.get("/api/proposals", async (_req, res) => {
    try {
      const proposals = agent.getPendingProposals();
      res.json(proposals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get proposal history
  app.get("/api/proposals/history", async (_req, res) => {
    try {
      const history = agent.getProposalHistory();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get portfolio history (snapshots)
  app.get("/api/portfolio/history", async (_req, res) => {
    try {
      const snapshots = agent.getSnapshotHistory();
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get vault configuration
  app.get("/api/vault", async (_req, res) => {
    try {
      const vault = agent.getVaultInfo();
      res.json(vault);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get risk parameters
  app.get("/api/risk-params", async (_req, res) => {
    try {
      const params = agent.getRiskParams();
      res.json(params);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get current prices
  app.get("/api/prices", async (_req, res) => {
    try {
      const prices = agent.getCurrentPrices();
      res.json(Object.fromEntries(prices));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger manual analysis cycle
  app.post("/api/analyze", async (_req, res) => {
    try {
      const result = await agent.runAnalysisCycle();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(CONFIG.apiPort, () => {
    console.log(`AEGIS API server running on port ${CONFIG.apiPort}`);
  });

  return app;
}
