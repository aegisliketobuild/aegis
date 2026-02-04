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
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export interface MatchedKeyword {
  phrase: string;
  confidence: number;
  category: string;
}

export interface FraudReport {
  listingId: string;
  signals: FraudSignal[];
  matchedKeywords: MatchedKeyword[];
  riskScore: number;
  recommendation: "allow" | "flag" | "block";
  reasoning: string;
  meta: {
    textLength: number;
    categoryMedianCents: number;
    reputationPercentile: number;
    templateSimilarity: number;
    templateName: string | null;
    templateCategory: string | null;
    accountAgeHours: number;
    listingsLastHour: number;
  };
}

const CATEGORY_MEDIANS: Record<string, number> = {
  services: 7500,
  goods: 5500,
  digital: 4000,
  general: 4750,
};

const SCAM_PHRASES: { phrase: string; confidence: number; category: string }[] = [
  { phrase: "guaranteed profit", confidence: 0.94, category: "crypto_scam" },
  { phrase: "double your money", confidence: 0.96, category: "ponzi_scheme" },
  { phrase: "send first", confidence: 0.89, category: "advance_fee_fraud" },
  { phrase: "trust me", confidence: 0.87, category: "social_engineering" },
  { phrase: "100% legit", confidence: 0.91, category: "overcompensation" },
  { phrase: "no scam", confidence: 0.88, category: "overcompensation" },
  { phrase: "act now", confidence: 0.72, category: "urgency_manipulation" },
  { phrase: "limited time", confidence: 0.68, category: "urgency_manipulation" },
  { phrase: "wire transfer", confidence: 0.83, category: "payment_fraud" },
  { phrase: "western union", confidence: 0.95, category: "payment_fraud" },
  { phrase: "gift card", confidence: 0.79, category: "payment_fraud" },
  { phrase: "dm me", confidence: 0.65, category: "off_platform" },
  { phrase: "risk free", confidence: 0.85, category: "impossible_promise" },
  { phrase: "free money", confidence: 0.93, category: "impossible_promise" },
  { phrase: "money back", confidence: 0.58, category: "false_guarantee" },
  { phrase: "invest now", confidence: 0.81, category: "crypto_scam" },
];

const SCAM_TEMPLATES = [
  {
    name: "Crypto Doubling Scam v3",
    keywords: ["guaranteed profit", "double your money", "trust me", "100% legit"],
    category: "Financial fraud / Ponzi variant",
  },
  {
    name: "Advance Fee Fraud",
    keywords: ["send first", "trust me", "guaranteed profit"],
    category: "Advance fee / 419 scam",
  },
  {
    name: "Fake Giveaway Scam",
    keywords: ["free money", "act now", "limited time", "send first"],
    category: "Social engineering",
  },
  {
    name: "Investment Pump Scheme",
    keywords: ["invest now", "guaranteed profit", "risk free", "100% legit"],
    category: "Securities fraud",
  },
];

export class FraudDetector {
  private recentListingsBySeller: Map<string, number[]> = new Map();

  analyze(listing: ListingInfo, categoryAverageCents?: number): FraudReport {
    const signals: FraudSignal[] = [];
    let riskScore = 0;
    const text = `${listing.title} ${listing.description}`.toLowerCase();
    const textLength = text.length;

    const categoryMedianCents =
      categoryAverageCents ||
      CATEGORY_MEDIANS[listing.category] ||
      CATEGORY_MEDIANS.general;
    const reputationPercentile = Math.round(listing.sellerReputation / 10);
    const accountAgeHours = Math.max(
      1,
      Math.round(listing.sellerAccountAgeMs / 3_600_000)
    );

    // Check 1: Reputation
    if (listing.sellerReputation < 200) {
      signals.push({
        type: "low_reputation",
        severity: listing.sellerReputation < 100 ? "high" : "medium",
        message: `Reputation ${listing.sellerReputation}/1000 (${reputationPercentile}th percentile). Accounts under 200 have 4.7x dispute rate.`,
      });
      riskScore += listing.sellerReputation < 100 ? 30 : 15;
    }

    // Check 2: Price anomaly
    if (listing.priceCents > 0 && listing.priceCents < categoryMedianCents * 0.3) {
      const pctBelow = Math.round(
        (1 - listing.priceCents / categoryMedianCents) * 100
      );
      signals.push({
        type: "suspicious_price",
        severity: "high",
        message: `$${(listing.priceCents / 100).toFixed(2)} is ${pctBelow}% below category median $${(categoryMedianCents / 100).toFixed(2)}`,
      });
      riskScore += 25;
    }

    // Check 3: Velocity / spam
    const now = Date.now();
    const recent = this.recentListingsBySeller.get(listing.seller) || [];
    const lastHour = recent.filter((t) => now - t < 3_600_000);
    lastHour.push(now);
    this.recentListingsBySeller.set(listing.seller, lastHour);
    const listingsLastHour = lastHour.length;

    if (listingsLastHour > 20) {
      signals.push({
        type: "spam",
        severity: "high",
        message: `${listingsLastHour} listings in last hour (threshold: 20)`,
      });
      riskScore += 30;
    }

    // Check 4: Account age
    if (listing.sellerAccountAgeMs < 86_400_000) {
      signals.push({
        type: "new_account",
        severity: "low",
        message: `Account age: ${accountAgeHours}h. 73% of blocked listings come from accounts < 24h old.`,
      });
      riskScore += 10;
    }

    // Check 5: Semantic keyword matching -- find ALL matches
    const matchedKeywords: MatchedKeyword[] = [];
    for (const kw of SCAM_PHRASES) {
      if (text.includes(kw.phrase)) {
        matchedKeywords.push(kw);
      }
    }
    if (matchedKeywords.length > 0) {
      riskScore += Math.min(40, matchedKeywords.length * 12);
      signals.push({
        type: "keyword",
        severity: matchedKeywords.length >= 3 ? "high" : "medium",
        message: `${matchedKeywords.length} of ${SCAM_PHRASES.length} fraud patterns matched`,
      });
    }

    // Check 6: Template matching
    let bestTemplate: {
      name: string;
      similarity: number;
      category: string;
    } | null = null;
    for (const tmpl of SCAM_TEMPLATES) {
      const matchCount = tmpl.keywords.filter((k) => text.includes(k)).length;
      const similarity = matchCount / tmpl.keywords.length;
      if (
        similarity > 0.5 &&
        (!bestTemplate || similarity > bestTemplate.similarity)
      ) {
        bestTemplate = {
          name: tmpl.name,
          similarity: Math.round(similarity * 100) / 100,
          category: tmpl.category,
        };
      }
    }
    if (bestTemplate && bestTemplate.similarity >= 0.7) {
      riskScore += 15;
      signals.push({
        type: "template_match",
        severity: "high",
        message: `Matches "${bestTemplate.name}" (${Math.round(bestTemplate.similarity * 100)}% similarity)`,
      });
    }

    riskScore = Math.min(100, riskScore);
    const recommendation: FraudReport["recommendation"] =
      riskScore >= 60 ? "block" : riskScore >= 30 ? "flag" : "allow";

    // Generate reasoning paragraph
    let reasoning: string;
    if (recommendation === "block") {
      reasoning = `This listing exhibits ${matchedKeywords.length > 0 ? matchedKeywords.length + " high-confidence fraud indicators" : "multiple risk factors"} in a ${textLength}-character listing from ${accountAgeHours < 24 ? "a brand-new" : "an"} account with ${listing.sellerReputation}/1000 reputation.`;
      if (bestTemplate) {
        reasoning += ` Content matches known scam template "${bestTemplate.name}" with ${Math.round(bestTemplate.similarity * 100)}% similarity (category: ${bestTemplate.category}).`;
      }
      if (
        listing.priceCents > 0 &&
        listing.priceCents < categoryMedianCents * 0.5
      ) {
        reasoning += ` Below-median pricing ($${(listing.priceCents / 100).toFixed(2)} vs $${(categoryMedianCents / 100).toFixed(2)} category median) is consistent with bait tactics.`;
      }
      reasoning += " Recommendation: Block listing. Flag seller for monitoring.";
    } else if (recommendation === "flag") {
      reasoning = `Listing shows ${signals.length} risk indicator${signals.length !== 1 ? "s" : ""} warranting review but below automatic block threshold.`;
      if (matchedKeywords.length > 0) {
        reasoning += ` Detected ${matchedKeywords.length} suspicious phrase${matchedKeywords.length !== 1 ? "s" : ""}.`;
      }
      reasoning +=
        " Recommendation: Allow with monitoring. Escalate if further signals emerge.";
    } else {
      reasoning =
        "No significant fraud signals detected. Listing appears legitimate based on seller profile, pricing, and content analysis. Approved for marketplace.";
    }

    return {
      listingId: listing.id,
      signals,
      matchedKeywords,
      riskScore,
      recommendation,
      reasoning,
      meta: {
        textLength,
        categoryMedianCents,
        reputationPercentile,
        templateSimilarity: bestTemplate?.similarity || 0,
        templateName: bestTemplate?.name || null,
        templateCategory: bestTemplate?.category || null,
        accountAgeHours,
        listingsLastHour,
      },
    };
  }
}
