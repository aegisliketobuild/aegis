import express from "express";
import cors from "cors";
import { AgoraAgent } from "./agent";
import { ChainScanner } from "./chain-scanner";
import { CONFIG } from "./config";

export function startApiServer(
  agent: AgoraAgent,
  scanner: ChainScanner
): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Health ──

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      agent: "JENNY",
      platform: "AGORA",
      version: "0.2.0",
      chain: "base",
      lastScan: scanner.getLastRefresh(),
    });
  });

  // ══════════════════════════════════════════════
  // CHAIN INTELLIGENCE (new)
  // ══════════════════════════════════════════════

  // Trending tokens (sorted by momentum, volume, or mcap)
  app.get("/api/trending", (req, res) => {
    const sort = (req.query.sort as string) || "momentum";
    const limit = parseInt(req.query.limit as string) || 20;
    res.json(scanner.getTrending(limit, sort as any));
  });

  // Meta / narrative breakdown
  app.get("/api/metas", (_req, res) => {
    res.json(scanner.getMetas());
  });

  // Chain stats (block number, gas, etc.)
  app.get("/api/chain", (_req, res) => {
    res.json(scanner.getStats());
  });

  // JENNY's insights
  app.get("/api/insights", (_req, res) => {
    res.json(scanner.getInsights());
  });

  // ══════════════════════════════════════════════
  // MARKETPLACE (kept for backwards compat + demo)
  // ══════════════════════════════════════════════

  app.get("/api/stats", (_req, res) => res.json(agent.getStats()));
  app.get("/api/activity", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(agent.getRecentActivity(limit));
  });
  app.get("/api/listings", (_req, res) => res.json(agent.getListings()));
  app.get("/api/listings/all", (_req, res) => res.json(agent.getAllListings()));

  app.post("/api/listings", (req, res) => {
    const listing = {
      id: `listing_${Date.now()}`,
      status: "active",
      createdAt: Date.now(),
      ...req.body,
    };
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
      res.status(403).json({ error: "Listing blocked", fraudReport });
      return;
    }
    agent.addListing(listing);
    res.json({ listing, fraudReport: fraudReport.recommendation === "flag" ? fraudReport : undefined });
  });

  app.get("/api/orders", (_req, res) => res.json(agent.getOrders()));
  app.post("/api/orders", (req, res) => {
    const order = { id: `order_${Date.now()}`, status: "funded", createdAt: Date.now(), ...req.body };
    agent.addOrder(order);
    res.json(order);
  });
  app.post("/api/orders/:id/confirm", (req, res) => {
    agent.completeOrder(req.params.id);
    res.json({ status: "completed" });
  });

  app.get("/api/disputes", (_req, res) => res.json(agent.getDisputes()));
  app.get("/api/disputes/open", (_req, res) => res.json(agent.getOpenDisputes()));
  app.post("/api/disputes", (req, res) => {
    const dispute = { id: `dispute_${Date.now()}`, status: "open", createdAt: Date.now(), ...req.body };
    agent.addDispute(dispute);
    res.json(dispute);
  });
  app.post("/api/disputes/:id/evidence", (req, res) => {
    const disputes = agent.getDisputes();
    const d = disputes.find((x: any) => x.id === req.params.id);
    if (!d) { res.status(404).json({ error: "Not found" }); return; }
    if (req.body.party === "buyer") d.evidenceBuyer = req.body.evidence;
    else { d.evidenceSeller = req.body.evidence; d.status = "under_review"; }
    res.json({ status: "evidence_submitted" });
  });
  app.post("/api/disputes/:id/resolve", (req, res) => {
    const verdict = agent.resolveDispute(req.params.id);
    if (!verdict) { res.status(404).json({ error: "Not found" }); return; }
    res.json(verdict);
  });

  app.get("/api/profiles/:owner", (req, res) => {
    const p = agent.getProfile(req.params.owner);
    if (!p) { res.status(404).json({ error: "Not found" }); return; }
    res.json(p);
  });
  app.post("/api/profiles", (req, res) => {
    const p = { reputation_score: 500, trades_completed: 0, disputes_involved: 0, disputes_lost: 0, created_at: Date.now(), banned: false, ...req.body };
    agent.addProfile(p);
    res.json(p);
  });
  app.get("/api/fraud", (_req, res) => res.json(agent.getFraudReports()));
  app.get("/api/leaderboard", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    res.json(agent.getLeaderboard(limit));
  });

  // Demo sandbox
  app.post("/api/demo/scan", (req, res) => {
    const report = agent.demoScan({
      id: `demo_${Date.now()}`, seller: "demo_user",
      title: req.body.title || "", description: req.body.description || "",
      priceCents: req.body.priceCents || 0, category: req.body.category || "general",
      sellerReputation: req.body.sellerReputation ?? 500,
      sellerTradeCount: req.body.sellerTradeCount ?? 15,
      sellerAccountAgeMs: req.body.sellerAccountAgeMs ?? 86_400_000 * 30,
    });
    res.json(report);
  });
  app.post("/api/demo/resolve", (req, res) => {
    const verdict = agent.demoResolve({
      orderId: req.body.orderId || `demo_${Date.now()}`,
      buyer: req.body.buyer || "buyer", seller: req.body.seller || "seller",
      amountCents: req.body.amountCents || 0, reason: req.body.reason || "",
      evidenceBuyer: req.body.evidenceBuyer || "", evidenceSeller: req.body.evidenceSeller || "",
      buyerReputation: req.body.buyerReputation ?? 500, sellerReputation: req.body.sellerReputation ?? 500,
      buyerTradeCount: req.body.buyerTradeCount ?? 0, sellerTradeCount: req.body.sellerTradeCount ?? 0,
    });
    res.json(verdict);
  });

  app.listen(CONFIG.apiPort, () => {
    console.log(`[JENNY] API server on :${CONFIG.apiPort}`);
    console.log(`  Chain:  GET /api/trending, /api/metas, /api/chain, /api/insights`);
    console.log(`  Market: GET /api/listings, /api/disputes, /api/leaderboard`);
    console.log(`  Demo:   POST /api/demo/scan, /api/demo/resolve`);
  });

  return app;
}
