import express from "express";
import cors from "cors";
import { AgoraAgent } from "./agent";
import { CONFIG } from "./config";

export function startApiServer(agent: AgoraAgent): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", agent: "JENNY", platform: "AGORA", version: "0.1.0" });
  });

  // Marketplace stats
  app.get("/api/stats", (_req, res) => {
    res.json(agent.getStats());
  });

  // Recent activity feed
  app.get("/api/activity", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(agent.getRecentActivity(limit));
  });

  // Active listings
  app.get("/api/listings", (_req, res) => {
    res.json(agent.getListings());
  });

  // All listings (including sold/cancelled)
  app.get("/api/listings/all", (_req, res) => {
    res.json(agent.getAllListings());
  });

  // Create listing (and run fraud check)
  app.post("/api/listings", (req, res) => {
    const listing = {
      id: `listing_${Date.now()}`,
      status: "active",
      createdAt: Date.now(),
      ...req.body,
    };

    // Run fraud scan
    const fraudReport = agent.scanListing({
      id: listing.id,
      seller: listing.seller || "anonymous",
      title: listing.title || "",
      description: listing.description || "",
      priceCents: listing.priceCents || 0,
      category: listing.category || "general",
      sellerReputation: listing.sellerReputation || 500,
      sellerTradeCount: listing.sellerTradeCount || 0,
      sellerAccountAgeMs: listing.sellerAccountAgeMs || 86_400_000,
    });

    if (fraudReport.recommendation === "block") {
      res.status(403).json({
        error: "Listing blocked by fraud detection",
        fraudReport,
      });
      return;
    }

    agent.addListing(listing);
    res.json({
      listing,
      fraudReport: fraudReport.recommendation === "flag" ? fraudReport : undefined,
    });
  });

  // Orders
  app.get("/api/orders", (_req, res) => {
    res.json(agent.getOrders());
  });

  // Create order
  app.post("/api/orders", (req, res) => {
    const order = {
      id: `order_${Date.now()}`,
      status: "funded",
      createdAt: Date.now(),
      ...req.body,
    };
    agent.addOrder(order);
    res.json(order);
  });

  // Confirm delivery
  app.post("/api/orders/:id/confirm", (req, res) => {
    agent.completeOrder(req.params.id);
    res.json({ status: "completed" });
  });

  // Disputes
  app.get("/api/disputes", (_req, res) => {
    res.json(agent.getDisputes());
  });

  app.get("/api/disputes/open", (_req, res) => {
    res.json(agent.getOpenDisputes());
  });

  // Open dispute
  app.post("/api/disputes", (req, res) => {
    const dispute = {
      id: `dispute_${Date.now()}`,
      status: "open",
      createdAt: Date.now(),
      ...req.body,
    };
    agent.addDispute(dispute);
    res.json(dispute);
  });

  // Submit evidence
  app.post("/api/disputes/:id/evidence", (req, res) => {
    const disputes = agent.getDisputes();
    const dispute = disputes.find((d: any) => d.id === req.params.id);
    if (!dispute) {
      res.status(404).json({ error: "Dispute not found" });
      return;
    }

    if (req.body.party === "buyer") {
      dispute.evidenceBuyer = req.body.evidence;
    } else {
      dispute.evidenceSeller = req.body.evidence;
      dispute.status = "under_review";
    }
    res.json({ status: "evidence_submitted" });
  });

  // Trigger manual resolution (JENNY resolves)
  app.post("/api/disputes/:id/resolve", (req, res) => {
    const verdict = agent.resolveDispute(req.params.id);
    if (!verdict) {
      res.status(404).json({ error: "Dispute not found" });
      return;
    }
    res.json(verdict);
  });

  // User profiles
  app.get("/api/profiles/:owner", (req, res) => {
    const profile = agent.getProfile(req.params.owner);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(profile);
  });

  app.post("/api/profiles", (req, res) => {
    const profile = {
      reputation_score: 500,
      trades_completed: 0,
      disputes_involved: 0,
      disputes_lost: 0,
      created_at: Date.now(),
      banned: false,
      ...req.body,
    };
    agent.addProfile(profile);
    res.json(profile);
  });

  // Fraud reports
  app.get("/api/fraud", (_req, res) => {
    res.json(agent.getFraudReports());
  });

  // Leaderboard (by reputation)
  app.get("/api/leaderboard", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    res.json(agent.getLeaderboard(limit));
  });

  // ---- Demo / Sandbox endpoints (no state changes) ----

  // Scan a hypothetical listing without creating it
  app.post("/api/demo/scan", (req, res) => {
    const report = agent.demoScan({
      id: `demo_${Date.now()}`,
      seller: "demo_user",
      title: req.body.title || "",
      description: req.body.description || "",
      priceCents: req.body.priceCents || 0,
      category: req.body.category || "general",
      sellerReputation: req.body.sellerReputation ?? 500,
      sellerTradeCount: req.body.sellerTradeCount ?? 15,
      sellerAccountAgeMs: req.body.sellerAccountAgeMs ?? 86_400_000 * 30,
    });
    res.json(report);
  });

  // Resolve a hypothetical dispute without creating it
  app.post("/api/demo/resolve", (req, res) => {
    const verdict = agent.demoResolve({
      orderId: req.body.orderId || `demo_${Date.now()}`,
      buyer: req.body.buyer || "buyer",
      seller: req.body.seller || "seller",
      amountCents: req.body.amountCents || 0,
      reason: req.body.reason || "",
      evidenceBuyer: req.body.evidenceBuyer || "",
      evidenceSeller: req.body.evidenceSeller || "",
      buyerReputation: req.body.buyerReputation ?? 500,
      sellerReputation: req.body.sellerReputation ?? 500,
      buyerTradeCount: req.body.buyerTradeCount ?? 0,
      sellerTradeCount: req.body.sellerTradeCount ?? 0,
    });
    res.json(verdict);
  });

  app.listen(CONFIG.apiPort, () => {
    console.log(`[JENNY] AGORA API server running on port ${CONFIG.apiPort}`);
    console.log(`[JENNY] Endpoints:`);
    console.log(`  GET  /api/stats          - Marketplace statistics`);
    console.log(`  GET  /api/activity       - Recent activity feed`);
    console.log(`  GET  /api/listings       - Active listings`);
    console.log(`  POST /api/listings       - Create listing (fraud-scanned)`);
    console.log(`  GET  /api/orders         - All orders`);
    console.log(`  GET  /api/disputes       - All disputes`);
    console.log(`  GET  /api/disputes/open  - Open disputes`);
    console.log(`  POST /api/disputes/:id/resolve - JENNY resolves dispute`);
    console.log(`  GET  /api/leaderboard    - User reputation leaderboard`);
    console.log(`  GET  /api/fraud          - Fraud reports`);
  });

  return app;
}
