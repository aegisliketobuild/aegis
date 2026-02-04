export interface DisputeCase {
  orderId: string;
  buyer: string;
  seller: string;
  amountCents: number;
  reason: string;
  evidenceBuyer: string;
  evidenceSeller: string;
  buyerReputation: number;
  sellerReputation: number;
  buyerTradeCount: number;
  sellerTradeCount: number;
}

export interface VerdictFactor {
  name: string;
  weight: number;
  favors: "buyer" | "seller" | "neutral";
  detail: string;
}

export interface DisputeVerdict {
  resolution: "buyer_wins" | "seller_wins" | "split";
  buyerPct?: number;
  confidence: number;
  reasoning: string;
  factors: VerdictFactor[];
  meta: {
    buyerDisputeRate: number;
    sellerDisputeRate: number;
    reputationDelta: number;
    claimType: string;
    claimWinRate: number;
    precedentCase: { id: string; similarity: number; outcome: string } | null;
    escrowAction: string;
    repUpdate: { buyer: number; seller: number };
  };
}

const CLAIM_TYPES: {
  keywords: string[];
  type: string;
  buyerWinRate: number;
}[] = [
  {
    keywords: [
      "never received",
      "not delivered",
      "no delivery",
      "did not arrive",
      "never arrived",
      "won't respond",
      "will not respond",
      "vanished",
    ],
    type: "NON_DELIVERY",
    buyerWinRate: 84,
  },
  {
    keywords: [
      "not as described",
      "wrong item",
      "defective",
      "different from",
      "doesn't match",
      "not what",
      "copy-paste",
      "template",
      "generic",
    ],
    type: "NOT_AS_DESCRIBED",
    buyerWinRate: 71,
  },
  {
    keywords: ["broken", "damaged", "not working"],
    type: "DAMAGED_GOODS",
    buyerWinRate: 78,
  },
  {
    keywords: [
      "never completed",
      "incomplete",
      "half done",
      "unfinished",
      "partial",
    ],
    type: "INCOMPLETE_SERVICE",
    buyerWinRate: 76,
  },
];

const PRECEDENT_CASES = [
  {
    id: "AGR-1847",
    tags: ["non_delivery", "seller_silent", "buyer_high_rep"],
    outcome: "Buyer wins, full refund",
    similarity: 0.91,
  },
  {
    id: "AGR-2103",
    tags: ["not_as_described", "both_evidence", "seller_higher_rep"],
    outcome: "Split 60/40 buyer",
    similarity: 0.78,
  },
  {
    id: "AGR-1592",
    tags: ["serial_disputer", "seller_evidence", "buyer_low_rep"],
    outcome: "Seller wins, funds released",
    similarity: 0.85,
  },
  {
    id: "AGR-2244",
    tags: ["non_delivery", "both_evidence", "similar_rep"],
    outcome: "Buyer wins, full refund",
    similarity: 0.82,
  },
];

export class DisputeResolver {
  analyze(dispute: DisputeCase): DisputeVerdict {
    const factors: VerdictFactor[] = [];
    let buyerScore = 0;
    let sellerScore = 0;

    const reputationDelta =
      dispute.buyerReputation - dispute.sellerReputation;
    const buyerEvLen = dispute.evidenceBuyer.trim().length;
    const sellerEvLen = dispute.evidenceSeller.trim().length;

    // Compute dispute rates (simulated from trade counts)
    const buyerDisputes = Math.min(
      3,
      Math.ceil(dispute.buyerTradeCount * 0.027)
    );
    const sellerDisputes = Math.min(
      2,
      Math.ceil(dispute.sellerTradeCount * 0.06)
    );
    const buyerDisputeRate =
      dispute.buyerTradeCount > 0
        ? Math.round((buyerDisputes / dispute.buyerTradeCount) * 1000) / 10
        : 0;
    const sellerDisputeRate =
      dispute.sellerTradeCount > 0
        ? Math.round((sellerDisputes / dispute.sellerTradeCount) * 1000) / 10
        : 0;

    // Factor 1: Reputation
    if (Math.abs(reputationDelta) > 100) {
      const w = Math.min(
        4.0,
        Math.round((Math.abs(reputationDelta) / 130) * 10) / 10
      );
      if (reputationDelta > 0) {
        buyerScore += w;
        factors.push({
          name: "Reputation advantage",
          weight: w,
          favors: "buyer",
          detail: `Buyer ${dispute.buyerReputation} vs seller ${dispute.sellerReputation} (delta +${reputationDelta})`,
        });
      } else {
        sellerScore += w;
        factors.push({
          name: "Reputation advantage",
          weight: w,
          favors: "seller",
          detail: `Seller ${dispute.sellerReputation} vs buyer ${dispute.buyerReputation} (delta +${Math.abs(reputationDelta)})`,
        });
      }
    }

    // Factor 2: Evidence quality
    if (buyerEvLen > 100 && sellerEvLen < 20) {
      buyerScore += 4.1;
      factors.push({
        name: "Evidence quality",
        weight: 4.1,
        favors: "buyer",
        detail: `Buyer: ${buyerEvLen} chars (detailed) | Seller: ${sellerEvLen > 0 ? sellerEvLen + " chars (sparse)" : "none"}`,
      });
    } else if (sellerEvLen > 100 && buyerEvLen < 20) {
      sellerScore += 4.1;
      factors.push({
        name: "Evidence quality",
        weight: 4.1,
        favors: "seller",
        detail: `Seller: ${sellerEvLen} chars (detailed) | Buyer: ${buyerEvLen > 0 ? buyerEvLen + " chars (sparse)" : "none"}`,
      });
    } else if (buyerEvLen > 50 && sellerEvLen > 50) {
      factors.push({
        name: "Evidence quality",
        weight: 0,
        favors: "neutral",
        detail: `Both submitted evidence (buyer: ${buyerEvLen}, seller: ${sellerEvLen})`,
      });
    }

    // Factor 3: Non-response penalty
    if (sellerEvLen === 0) {
      buyerScore += 3.8;
      factors.push({
        name: "Non-response penalty",
        weight: 3.8,
        favors: "buyer",
        detail: "Seller failed to respond to dispute",
      });
    } else if (buyerEvLen === 0 && dispute.reason.length < 30) {
      sellerScore += 3.8;
      factors.push({
        name: "Non-response penalty",
        weight: 3.8,
        favors: "seller",
        detail: "Buyer opened dispute with no evidence or follow-up",
      });
    }

    // Factor 4: Behavioral pattern
    if (sellerDisputeRate > 15 && dispute.sellerTradeCount > 3) {
      buyerScore += 2.4;
      factors.push({
        name: "Behavioral pattern",
        weight: 2.4,
        favors: "buyer",
        detail: `Seller dispute rate ${sellerDisputeRate}% (elevated, baseline < 10%)`,
      });
    } else if (buyerDisputeRate > 15 && dispute.buyerTradeCount > 3) {
      sellerScore += 2.4;
      factors.push({
        name: "Behavioral pattern",
        weight: 2.4,
        favors: "seller",
        detail: `Buyer dispute rate ${buyerDisputeRate}% (elevated, baseline < 10%)`,
      });
    }

    // Factor 5: Trade history
    if (dispute.sellerTradeCount > 50 && dispute.buyerTradeCount < 5) {
      sellerScore += 1.8;
      factors.push({
        name: "Trade history",
        weight: 1.8,
        favors: "seller",
        detail: `Seller: ${dispute.sellerTradeCount} trades (established) | Buyer: ${dispute.buyerTradeCount} (new)`,
      });
    } else if (
      dispute.buyerTradeCount > 50 &&
      dispute.sellerTradeCount < 10
    ) {
      buyerScore += 1.8;
      factors.push({
        name: "Trade history",
        weight: 1.8,
        favors: "buyer",
        detail: `Buyer: ${dispute.buyerTradeCount} trades (established) | Seller: ${dispute.sellerTradeCount} (new)`,
      });
    }

    // Factor 6: Claim classification
    const reasonLower =
      `${dispute.reason} ${dispute.evidenceBuyer}`.toLowerCase();
    let claimType = "GENERAL";
    let claimWinRate = 50;
    for (const ct of CLAIM_TYPES) {
      if (ct.keywords.some((k) => reasonLower.includes(k))) {
        claimType = ct.type;
        claimWinRate = ct.buyerWinRate;
        break;
      }
    }
    if (claimWinRate > 60) {
      const w = Math.round(((claimWinRate - 50) / 22) * 10) / 10;
      buyerScore += w;
      factors.push({
        name: "Claim type precedent",
        weight: w,
        favors: "buyer",
        detail: `${claimType.replace(/_/g, " ")} -- ${claimWinRate}% buyer win rate historically`,
      });
    }

    // Find precedent
    const caseTags: string[] = [];
    if (claimType === "NON_DELIVERY") caseTags.push("non_delivery");
    if (claimType === "NOT_AS_DESCRIBED") caseTags.push("not_as_described");
    if (sellerEvLen === 0) caseTags.push("seller_silent");
    if (reputationDelta > 200) caseTags.push("buyer_high_rep");
    if (reputationDelta < -200) caseTags.push("seller_higher_rep");
    if (buyerDisputeRate > 15) caseTags.push("serial_disputer");
    if (sellerEvLen > 100) caseTags.push("seller_evidence");
    if (buyerEvLen < 20) caseTags.push("buyer_low_rep");
    if (buyerEvLen > 100 && sellerEvLen > 100) caseTags.push("both_evidence");
    if (Math.abs(reputationDelta) < 100) caseTags.push("similar_rep");

    let precedent: {
      id: string;
      similarity: number;
      outcome: string;
    } | null = null;
    for (const pc of PRECEDENT_CASES) {
      const matchCount = pc.tags.filter((t) => caseTags.includes(t)).length;
      const sim = Math.round((matchCount / pc.tags.length) * 100) / 100;
      if (sim > 0.5 && (!precedent || sim > precedent.similarity)) {
        precedent = { id: pc.id, similarity: sim, outcome: pc.outcome };
      }
    }

    // Compute verdict
    const netScore = buyerScore - sellerScore;
    const confidence = Math.min(
      95,
      Math.max(35, Math.round(50 + Math.abs(netScore) * 6))
    );

    let resolution: DisputeVerdict["resolution"];
    let reasoning: string;
    let escrowAction: string;
    let repBuyer: number;
    let repSeller: number;

    if (netScore > 2) {
      resolution = "buyer_wins";
      escrowAction = `Release $${(dispute.amountCents / 100).toFixed(2)} USDC to buyer`;
      repBuyer = 5;
      repSeller = -25;
      reasoning = `The buyer (${dispute.buyer}) presented ${buyerEvLen > 100 ? "detailed, timestamped " : ""}evidence of ${claimType.toLowerCase().replace(/_/g, " ")}`;
      if (sellerEvLen === 0) {
        reasoning +=
          ". The seller failed to respond, which constitutes a strong inference of liability under AGORA marketplace rules";
      }
      reasoning += ".";
      if (reputationDelta > 200) {
        reasoning += ` The significant reputation gap (${dispute.buyerReputation} vs ${dispute.sellerReputation}) further supports this ruling.`;
      }
      if (sellerDisputeRate > 15 && dispute.sellerTradeCount > 3) {
        reasoning += ` The seller's elevated dispute rate (${sellerDisputeRate}%) indicates a pattern of reliability issues.`;
      }
    } else if (netScore < -2) {
      resolution = "seller_wins";
      escrowAction = `Release $${(dispute.amountCents / 100).toFixed(2)} USDC to seller`;
      repBuyer = -15;
      repSeller = 5;
      reasoning = `The seller (${dispute.seller}) provided ${sellerEvLen > 100 ? "compelling " : ""}evidence supporting their fulfillment of the transaction.`;
      if (buyerDisputeRate > 15 && dispute.buyerTradeCount > 3) {
        reasoning += ` The buyer's elevated dispute rate (${buyerDisputeRate}%) suggests a pattern of frivolous disputes.`;
      }
      if (buyerEvLen < 20) {
        reasoning +=
          " The buyer failed to provide substantive evidence to support their claim.";
      }
    } else {
      resolution = "split";
      escrowAction = `Split $${(dispute.amountCents / 100).toFixed(2)} USDC 50/50 between parties`;
      repBuyer = 0;
      repSeller = -5;
      reasoning = `Neither party presented a decisively stronger case. ${buyerEvLen > 100 && sellerEvLen > 100 ? "Both provided detailed evidence" : "Evidence was limited on both sides"}, and reputation/history factors do not clearly favor either party. A 50/50 split is the fairest outcome given available information.`;
    }

    return {
      resolution,
      buyerPct: resolution === "split" ? 50 : undefined,
      confidence,
      reasoning,
      factors,
      meta: {
        buyerDisputeRate,
        sellerDisputeRate,
        reputationDelta,
        claimType,
        claimWinRate,
        precedentCase: precedent,
        escrowAction,
        repUpdate: { buyer: repBuyer, seller: repSeller },
      },
    };
  }
}
