import { Connection, PublicKey } from "@solana/web3.js";
import { CONFIG } from "./config";
import { DisputeResolver, DisputeCase, DisputeVerdict } from "./dispute-resolver";
import { FraudDetector, ListingInfo, FraudReport } from "./fraud-detector";

export interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  completedTrades: number;
  totalVolumeCents: number;
  openDisputes: number;
  resolvedDisputes: number;
  flaggedListings: number;
  bannedUsers: number;
}

export interface RecentActivity {
  type: "listing" | "order" | "dispute" | "resolution" | "ban" | "fraud_flag";
  timestamp: number;
  summary: string;
  data: any;
}

export class AgoraAgent {
  private connection: Connection;
  private disputeResolver: DisputeResolver;
  private fraudDetector: FraudDetector;
  private intervalId?: NodeJS.Timeout;

  // In-memory state (would be on-chain / DB in production)
  private listings: Map<string, any> = new Map();
  private orders: Map<string, any> = new Map();
  private disputes: Map<string, any> = new Map();
  private profiles: Map<string, any> = new Map();
  private activity: RecentActivity[] = [];
  private fraudReports: Map<string, FraudReport> = new Map();
  private stats: MarketplaceStats = {
    totalListings: 0,
    activeListings: 0,
    completedTrades: 0,
    totalVolumeCents: 0,
    openDisputes: 0,
    resolvedDisputes: 0,
    flaggedListings: 0,
    bannedUsers: 0,
  };

  constructor() {
    this.connection = new Connection(CONFIG.rpcUrl, CONFIG.commitment);
    this.disputeResolver = new DisputeResolver();
    this.fraudDetector = new FraudDetector();
  }

  start() {
    console.log("=============================================");
    console.log("  AGORA - The Permissionless Marketplace");
    console.log("  Operated by JENNY (Agent #286)");
    console.log("=============================================");
    console.log();
    console.log("[JENNY] Starting marketplace operator...");
    console.log(`[JENNY] RPC: ${CONFIG.rpcUrl}`);
    console.log(`[JENNY] Scan interval: ${CONFIG.scanIntervalMs / 1000}s`);
    console.log();

    // Run scan loop
    this.scanCycle().catch(console.error);
    this.intervalId = setInterval(() => {
      this.scanCycle().catch(console.error);
    }, CONFIG.scanIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log("[JENNY] Marketplace operator stopped.");
  }

  async scanCycle() {
    console.log(`[JENNY] Scan cycle at ${new Date().toISOString()}`);

    // In production: fetch on-chain events for new listings, orders, disputes
    // For now: process any queued items

    // Check for disputes that need resolution
    for (const [id, dispute] of this.disputes) {
      if (dispute.status === "under_review" || dispute.status === "open") {
        const age = Date.now() - dispute.createdAt;

        // Auto-resolve if timed out
        if (age > CONFIG.autoResolveTimeoutMs && dispute.status === "open") {
          console.log(`[JENNY] Dispute ${id} timed out. Auto-resolving in favor of buyer (no seller response).`);
          this.resolveDispute(id);
        }

        // Resolve if both parties have submitted evidence
        if (dispute.evidenceSeller && dispute.evidenceBuyer) {
          console.log(`[JENNY] Both parties submitted evidence for dispute ${id}. Analyzing...`);
          this.resolveDispute(id);
        }
      }
    }
  }

  // ---- Fraud Detection ----

  scanListing(listing: ListingInfo): FraudReport {
    const report = this.fraudDetector.analyze(listing);

    if (report.recommendation !== "allow") {
      this.fraudReports.set(listing.id, report);
      this.stats.flaggedListings++;

      this.logActivity({
        type: "fraud_flag",
        timestamp: Date.now(),
        summary: `Flagged listing "${listing.title}" (risk: ${report.riskScore}/100, action: ${report.recommendation})`,
        data: report,
      });

      console.log(
        `[JENNY] FRAUD: Listing "${listing.title}" flagged (score: ${report.riskScore}, ${report.recommendation})`
      );
    }

    return report;
  }

  // ---- Dispute Resolution ----

  resolveDispute(disputeId: string): DisputeVerdict | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;

    const buyerProfile = this.profiles.get(dispute.buyer) || {
      reputation_score: 500,
      trades_completed: 0,
    };
    const sellerProfile = this.profiles.get(dispute.seller) || {
      reputation_score: 500,
      trades_completed: 0,
    };

    const disputeCase: DisputeCase = {
      orderId: dispute.orderId,
      buyer: dispute.buyer,
      seller: dispute.seller,
      amountCents: dispute.amountCents,
      reason: dispute.reason,
      evidenceBuyer: dispute.evidenceBuyer || "",
      evidenceSeller: dispute.evidenceSeller || "",
      buyerReputation: buyerProfile.reputation_score,
      sellerReputation: sellerProfile.reputation_score,
      buyerTradeCount: buyerProfile.trades_completed,
      sellerTradeCount: sellerProfile.trades_completed,
    };

    const verdict = this.disputeResolver.analyze(disputeCase);

    dispute.status = "resolved";
    dispute.verdict = verdict;
    dispute.resolvedAt = Date.now();
    this.stats.openDisputes--;
    this.stats.resolvedDisputes++;

    this.logActivity({
      type: "resolution",
      timestamp: Date.now(),
      summary: `Resolved dispute ${disputeId}: ${verdict.resolution} (confidence: ${verdict.confidence}%)`,
      data: verdict,
    });

    console.log(
      `[JENNY] RESOLVED dispute ${disputeId}: ${verdict.resolution} (confidence: ${verdict.confidence}%)`
    );

    return verdict;
  }

  // ---- Helpers ----

  private nameOf(address: string): string {
    const profile = this.profiles.get(address);
    return profile?.username || address.slice(0, 8) + "...";
  }

  // ---- State Management (simulated, would be on-chain reads in prod) ----

  addListing(listing: any) {
    this.listings.set(listing.id, listing);
    this.stats.totalListings++;
    this.logActivity({
      type: "listing",
      timestamp: Date.now(),
      summary: `New listing: "${listing.title}" by ${this.nameOf(listing.seller)} ($${(listing.priceCents / 100).toFixed(0)})`,
      data: listing,
    });
  }

  addOrder(order: any) {
    this.orders.set(order.id, order);
    this.logActivity({
      type: "order",
      timestamp: Date.now(),
      summary: `${this.nameOf(order.buyer)} purchased "${order.title}" from ${this.nameOf(order.seller)} ($${(order.amountCents / 100).toFixed(0)})`,
      data: order,
    });
  }

  completeOrder(orderId: string) {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = "completed";
      this.stats.completedTrades++;
      this.stats.totalVolumeCents += order.amountCents;
    }
  }

  addDispute(dispute: any) {
    this.disputes.set(dispute.id, dispute);
    this.stats.openDisputes++;
    this.logActivity({
      type: "dispute",
      timestamp: Date.now(),
      summary: `Dispute: ${this.nameOf(dispute.buyer)} vs ${this.nameOf(dispute.seller)} -- "${dispute.reason.slice(0, 80)}..."`,
      data: dispute,
    });
  }

  addProfile(profile: any) {
    this.profiles.set(profile.owner, profile);
  }

  private logActivity(activity: RecentActivity) {
    this.activity.unshift(activity);
    if (this.activity.length > 500) this.activity.pop();
  }

  // ---- API Getters ----

  getStats(): MarketplaceStats {
    return {
      ...this.stats,
      activeListings: Array.from(this.listings.values()).filter(
        (l) => l.status === "active"
      ).length,
    };
  }

  getRecentActivity(limit = 50): RecentActivity[] {
    return this.activity.slice(0, limit);
  }

  getListings(): any[] {
    return Array.from(this.listings.values()).filter((l) => l.status === "active");
  }

  getAllListings(): any[] {
    return Array.from(this.listings.values());
  }

  getOrders(): any[] {
    return Array.from(this.orders.values());
  }

  getDisputes(): any[] {
    return Array.from(this.disputes.values());
  }

  getOpenDisputes(): any[] {
    return Array.from(this.disputes.values()).filter(
      (d) => d.status === "open" || d.status === "under_review"
    );
  }

  getProfile(owner: string): any {
    return this.profiles.get(owner);
  }

  getFraudReports(): FraudReport[] {
    return Array.from(this.fraudReports.values());
  }

  getLeaderboard(limit = 20): any[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.reputation_score - a.reputation_score)
      .slice(0, limit);
  }
}
