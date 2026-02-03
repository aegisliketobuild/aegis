export interface ListingInfo {
  id: string;
  seller: string;
  title: string;
  description: string;
  priceCents: number;
  category: string;
  sellerReputation: number;
  sellerTradeCount: number;
  sellerAccountAgeMs: number;
}

export interface FraudSignal {
  type: "low_reputation" | "suspicious_price" | "spam" | "new_account" | "keyword";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface FraudReport {
  listingId: string;
  signals: FraudSignal[];
  riskScore: number; // 0-100
  recommendation: "allow" | "flag" | "block";
}

export class FraudDetector {
  private recentListingsBySeller: Map<string, number[]> = new Map();

  analyze(listing: ListingInfo, categoryAverageCents?: number): FraudReport {
    const signals: FraudSignal[] = [];
    let riskScore = 0;

    // Check 1: Low reputation seller
    if (listing.sellerReputation < 200) {
      signals.push({
        type: "low_reputation",
        severity: listing.sellerReputation < 100 ? "high" : "medium",
        message: `Seller reputation is ${listing.sellerReputation}/1000.`,
      });
      riskScore += listing.sellerReputation < 100 ? 30 : 15;
    }

    // Check 2: Suspiciously low price
    if (categoryAverageCents && listing.priceCents < categoryAverageCents * 0.3) {
      signals.push({
        type: "suspicious_price",
        severity: "high",
        message: `Price ($${(listing.priceCents / 100).toFixed(2)}) is ${Math.round((1 - listing.priceCents / categoryAverageCents) * 100)}% below category average ($${(categoryAverageCents / 100).toFixed(2)}).`,
      });
      riskScore += 25;
    }

    // Check 3: Spam detection (too many listings in short period)
    const now = Date.now();
    const recent = this.recentListingsBySeller.get(listing.seller) || [];
    const lastHour = recent.filter((t) => now - t < 3_600_000);
    lastHour.push(now);
    this.recentListingsBySeller.set(listing.seller, lastHour);

    if (lastHour.length > 20) {
      signals.push({
        type: "spam",
        severity: "high",
        message: `Seller created ${lastHour.length} listings in the last hour.`,
      });
      riskScore += 30;
    }

    // Check 4: Brand new account
    if (listing.sellerAccountAgeMs < 86_400_000) {
      // < 24h old
      signals.push({
        type: "new_account",
        severity: "low",
        message: "Seller account is less than 24 hours old.",
      });
      riskScore += 10;
    }

    // Check 5: Suspicious keywords
    const text = `${listing.title} ${listing.description}`.toLowerCase();
    const suspiciousKeywords = [
      "guaranteed profit",
      "double your money",
      "send first",
      "trust me",
      "100% legit",
      "no scam",
    ];
    for (const kw of suspiciousKeywords) {
      if (text.includes(kw)) {
        signals.push({
          type: "keyword",
          severity: "medium",
          message: `Listing contains suspicious phrase: "${kw}"`,
        });
        riskScore += 15;
        break; // only flag once
      }
    }

    riskScore = Math.min(100, riskScore);

    const recommendation: FraudReport["recommendation"] =
      riskScore >= 60 ? "block" : riskScore >= 30 ? "flag" : "allow";

    return {
      listingId: listing.id,
      signals,
      riskScore,
      recommendation,
    };
  }
}
