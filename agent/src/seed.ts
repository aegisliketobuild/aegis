import { AgoraAgent } from "./agent";

const DEMO_USERS = [
  { owner: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", username: "maria_designs", reputation_score: 870, trades_completed: 47, trades_as_seller: 38, trades_as_buyer: 9, disputes_involved: 1, disputes_lost: 0, total_volume_cents: 284000, created_at: Date.now() - 86_400_000 * 30, banned: false },
  { owner: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", username: "devtools_sam", reputation_score: 720, trades_completed: 23, trades_as_seller: 20, trades_as_buyer: 3, disputes_involved: 2, disputes_lost: 1, total_volume_cents: 156000, created_at: Date.now() - 86_400_000 * 14, banned: false },
  { owner: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", username: "crypto_nomad", reputation_score: 950, trades_completed: 112, trades_as_seller: 89, trades_as_buyer: 23, disputes_involved: 3, disputes_lost: 0, total_volume_cents: 892000, created_at: Date.now() - 86_400_000 * 90, banned: false },
  { owner: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", username: "anon_trader", reputation_score: 430, trades_completed: 8, trades_as_seller: 3, trades_as_buyer: 5, disputes_involved: 2, disputes_lost: 2, total_volume_cents: 42000, created_at: Date.now() - 86_400_000 * 5, banned: false },
  { owner: "So11111111111111111111111111111111111111112", username: "libre_market", reputation_score: 810, trades_completed: 64, trades_as_seller: 55, trades_as_buyer: 9, disputes_involved: 1, disputes_lost: 0, total_volume_cents: 510000, created_at: Date.now() - 86_400_000 * 60, banned: false },
  { owner: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", username: "jade_writes", reputation_score: 680, trades_completed: 19, trades_as_seller: 17, trades_as_buyer: 2, disputes_involved: 0, disputes_lost: 0, total_volume_cents: 95000, created_at: Date.now() - 86_400_000 * 21, banned: false },
];

const DEMO_LISTINGS = [
  { seller: DEMO_USERS[0].owner, title: "Custom Logo Design -- 3 Concepts + Revisions", description: "Professional logo design for your brand, project, or DAO. Includes 3 initial concepts, 2 rounds of revisions, and final files in SVG/PNG/PDF. Delivered in 48 hours.", category: "services", priceCents: 7500, sellerReputation: 870, sellerTradeCount: 47, sellerAccountAgeMs: 86_400_000 * 30 },
  { seller: DEMO_USERS[1].owner, title: "Solana Smart Contract Audit (up to 500 lines)", description: "Security review of your Anchor/Solana program. Covers common vulnerabilities: reentrancy, overflow, PDA validation, signer checks, CPI safety. Written report with severity ratings.", category: "services", priceCents: 25000, sellerReputation: 720, sellerTradeCount: 23, sellerAccountAgeMs: 86_400_000 * 14 },
  { seller: DEMO_USERS[2].owner, title: "Handmade Leather Wallet -- Minimalist Design", description: "Hand-stitched full-grain leather wallet. Fits 6 cards + cash. Available in black, brown, or tan. Ships worldwide within 5 business days. Each one is unique.", category: "goods", priceCents: 4500, sellerReputation: 950, sellerTradeCount: 112, sellerAccountAgeMs: 86_400_000 * 90 },
  { seller: DEMO_USERS[4].owner, title: "1-Hour Spanish Tutoring Session (Native Speaker)", description: "Conversational Spanish lesson via video call. All levels welcome. Focus on practical communication, not textbook grammar. Flexible scheduling.", category: "services", priceCents: 2000, sellerReputation: 810, sellerTradeCount: 64, sellerAccountAgeMs: 86_400_000 * 60 },
  { seller: DEMO_USERS[5].owner, title: "Blog Post / Article Writing (1000-2000 words)", description: "Well-researched article on crypto, tech, or business topics. SEO-optimized. Includes one round of revisions. 3-day turnaround.", category: "services", priceCents: 5000, sellerReputation: 680, sellerTradeCount: 19, sellerAccountAgeMs: 86_400_000 * 21 },
  { seller: DEMO_USERS[2].owner, title: "Vintage Mechanical Keyboard -- Cherry MX Blues", description: "Restored IBM Model M style keyboard with Cherry MX Blue switches. Full NKRO, USB-C, custom keycaps. Clicky and built like a tank.", category: "goods", priceCents: 12000, sellerReputation: 950, sellerTradeCount: 112, sellerAccountAgeMs: 86_400_000 * 90 },
  { seller: DEMO_USERS[0].owner, title: "Social Media Brand Kit -- Full Package", description: "Complete visual identity for your social presence: profile pic, banner, 5 post templates, color palette, typography guide. Works for Twitter/X, Discord, and Instagram.", category: "services", priceCents: 15000, sellerReputation: 870, sellerTradeCount: 47, sellerAccountAgeMs: 86_400_000 * 30 },
  { seller: DEMO_USERS[4].owner, title: "Private VPN Server Setup (1 Year)", description: "I will set up a dedicated WireGuard VPN server on a privacy-respecting provider. No logs. Your own IP. Full root access. Includes setup guide and ongoing support.", category: "digital", priceCents: 8000, sellerReputation: 810, sellerTradeCount: 64, sellerAccountAgeMs: 86_400_000 * 60 },
];

const DEMO_COMPLETED_ORDERS = [
  { buyer: DEMO_USERS[3].owner, seller: DEMO_USERS[0].owner, amountCents: 7500, title: "Logo design for DeFi project" },
  { buyer: DEMO_USERS[5].owner, seller: DEMO_USERS[2].owner, amountCents: 4500, title: "Leather wallet (black)" },
  { buyer: DEMO_USERS[0].owner, seller: DEMO_USERS[1].owner, amountCents: 25000, title: "Anchor program audit" },
  { buyer: DEMO_USERS[3].owner, seller: DEMO_USERS[4].owner, amountCents: 2000, title: "Spanish lesson" },
  { buyer: DEMO_USERS[1].owner, seller: DEMO_USERS[5].owner, amountCents: 5000, title: "Blog post about Solana DePIN" },
];

const DEMO_DISPUTE = {
  id: "dispute_demo_001",
  orderId: "order_demo_006",
  buyer: DEMO_USERS[3].owner,
  seller: DEMO_USERS[1].owner,
  reason: "Service not delivered as described. Paid for a full smart contract audit but received only a 2-paragraph summary with no severity ratings or specific vulnerability analysis.",
  evidenceBuyer: "I hired devtools_sam for a smart contract audit. The listing promised a full security review covering reentrancy, overflow, PDA validation, signer checks, and CPI safety with a written report and severity ratings. What I received was a 2-paragraph message saying 'looks fine, no major issues found' with no specifics. I asked for the detailed report and got no response for 3 days. This is not what was advertised.",
  evidenceSeller: "",
  amountCents: 25000,
  status: "open",
  createdAt: Date.now() - 3_600_000 * 6, // 6 hours ago
};

export function seedDemoData(agent: AgoraAgent) {
  console.log("[JENNY] Seeding marketplace with demo data...");

  // Register users
  for (const user of DEMO_USERS) {
    agent.addProfile(user);
  }
  console.log(`[JENNY] Registered ${DEMO_USERS.length} users`);

  // Create listings
  for (const listingData of DEMO_LISTINGS) {
    const listing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: "active",
      createdAt: Date.now() - Math.floor(Math.random() * 86_400_000 * 3),
      ...listingData,
    };

    // Run fraud scan on each listing
    agent.scanListing({
      id: listing.id,
      seller: listing.seller,
      title: listing.title,
      description: listing.description,
      priceCents: listing.priceCents,
      category: listing.category,
      sellerReputation: listing.sellerReputation,
      sellerTradeCount: listing.sellerTradeCount,
      sellerAccountAgeMs: listing.sellerAccountAgeMs,
    });

    agent.addListing(listing);
  }
  console.log(`[JENNY] Created ${DEMO_LISTINGS.length} listings`);

  // Add completed orders
  for (const orderData of DEMO_COMPLETED_ORDERS) {
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: "completed",
      createdAt: Date.now() - Math.floor(Math.random() * 86_400_000 * 7),
      ...orderData,
    };
    agent.addOrder(order);
    agent.completeOrder(order.id);
  }
  console.log(`[JENNY] Added ${DEMO_COMPLETED_ORDERS.length} completed trades`);

  // Add open dispute
  agent.addDispute(DEMO_DISPUTE);
  console.log("[JENNY] Added 1 open dispute (awaiting seller evidence)");

  console.log("[JENNY] Demo data loaded. Marketplace is live.\n");
}
