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

export interface DisputeVerdict {
  resolution: "buyer_wins" | "seller_wins" | "split";
  buyerPct?: number; // for split
  confidence: number; // 0-100
  reasoning: string;
}

export class DisputeResolver {
  /**
   * Analyze a dispute and recommend a resolution.
   * Uses heuristics based on reputation, evidence quality, and trade history.
   * In production, this would integrate an LLM for evidence analysis.
   */
  analyze(dispute: DisputeCase): DisputeVerdict {
    let buyerScore = 0;
    let sellerScore = 0;
    const reasons: string[] = [];

    // Factor 1: Reputation (0-1000 scale)
    const repDiff = dispute.buyerReputation - dispute.sellerReputation;
    if (repDiff > 100) {
      buyerScore += 2;
      reasons.push(
        `Buyer has significantly higher reputation (${dispute.buyerReputation} vs ${dispute.sellerReputation}).`
      );
    } else if (repDiff < -100) {
      sellerScore += 2;
      reasons.push(
        `Seller has significantly higher reputation (${dispute.sellerReputation} vs ${dispute.buyerReputation}).`
      );
    }

    // Factor 2: Trade history
    if (dispute.sellerTradeCount > 50 && dispute.buyerTradeCount < 5) {
      sellerScore += 1;
      reasons.push(
        `Seller is established (${dispute.sellerTradeCount} trades) while buyer is new (${dispute.buyerTradeCount} trades).`
      );
    } else if (dispute.buyerTradeCount > 50 && dispute.sellerTradeCount < 5) {
      buyerScore += 1;
      reasons.push(
        `Buyer is established (${dispute.buyerTradeCount} trades) while seller is new (${dispute.sellerTradeCount} trades).`
      );
    }

    // Factor 3: Evidence provided
    const buyerEvidenceLength = dispute.evidenceBuyer.trim().length;
    const sellerEvidenceLength = dispute.evidenceSeller.trim().length;

    if (buyerEvidenceLength > 100 && sellerEvidenceLength < 20) {
      buyerScore += 3;
      reasons.push("Buyer provided detailed evidence; seller provided little or none.");
    } else if (sellerEvidenceLength > 100 && buyerEvidenceLength < 20) {
      sellerScore += 3;
      reasons.push("Seller provided detailed evidence; buyer provided little or none.");
    } else if (buyerEvidenceLength > 100 && sellerEvidenceLength > 100) {
      reasons.push("Both parties provided evidence. Weight given to other factors.");
    }

    // Factor 4: No response from respondent
    if (sellerEvidenceLength === 0) {
      buyerScore += 2;
      reasons.push("Seller did not respond to dispute.");
    } else if (buyerEvidenceLength === 0 && dispute.reason.length < 20) {
      sellerScore += 2;
      reasons.push("Buyer opened dispute with minimal reasoning and no follow-up.");
    }

    // Factor 5: Dispute reason keywords (basic heuristic)
    const reasonLower = dispute.reason.toLowerCase();
    if (
      reasonLower.includes("never received") ||
      reasonLower.includes("not delivered") ||
      reasonLower.includes("no delivery")
    ) {
      buyerScore += 1;
      reasons.push('Dispute claims non-delivery -- common legitimate complaint.');
    }
    if (
      reasonLower.includes("not as described") ||
      reasonLower.includes("wrong item") ||
      reasonLower.includes("defective")
    ) {
      buyerScore += 1;
      reasons.push("Dispute claims item/service not as described.");
    }

    // Determine outcome
    const total = buyerScore + sellerScore;
    const confidence = total > 0 ? Math.min(95, 50 + total * 8) : 40;

    if (buyerScore > sellerScore + 1) {
      return {
        resolution: "buyer_wins",
        confidence,
        reasoning: `JENNY recommends full refund to buyer.\n\nFactors:\n${reasons.map((r) => `- ${r}`).join("\n")}`,
      };
    } else if (sellerScore > buyerScore + 1) {
      return {
        resolution: "seller_wins",
        confidence,
        reasoning: `JENNY recommends funds released to seller.\n\nFactors:\n${reasons.map((r) => `- ${r}`).join("\n")}`,
      };
    } else {
      return {
        resolution: "split",
        buyerPct: 50,
        confidence: Math.max(30, confidence - 15),
        reasoning: `JENNY recommends a 50/50 split. Neither party presented a clearly stronger case.\n\nFactors:\n${reasons.map((r) => `- ${r}`).join("\n")}`,
      };
    }
  }
}
