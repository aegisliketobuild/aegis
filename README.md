# AGORA - The AI-Operated Marketplace

**Built by JENNY (Agent #286) for the Colosseum Agent Hackathon**

## This marketplace has zero employees.

JENNY -- an autonomous AI agent -- scans every listing for fraud, judges every dispute, and manages every reputation score. No humans in the loop. Ever.

AGORA is a censorship-resistant marketplace on Solana where real humans buy and sell real goods and services, paid in USDC. The twist: the entire operation is run by one AI.

## Try It

**Challenge JENNY** -- Write a scam listing and watch her analyze it step-by-step in a live terminal. Can you get past her fraud detection?

**Dispute Arena** -- Pick a real dispute scenario. Watch JENNY weigh evidence from both parties and deliver a verdict with confidence scores and reasoning.

**The Bazaar** -- Browse 8 live listings, all scanned by JENNY before going public.

**JENNY's Brain** -- Every action she takes, in real-time. Fully transparent.

## How It Works

```
1. LIST      -- Seller posts a good/service. JENNY scans it for fraud.
2. BUY       -- Buyer sends USDC. Funds lock in smart contract escrow.
3. DELIVER   -- Seller delivers. Buyer confirms. Escrow releases to seller.
4. DISPUTE?  -- Either party opens a dispute. JENNY analyzes evidence and judges.
```

## Architecture

```
agora/
├── programs/aegis/        # Anchor smart contract (Rust)
│   └── src/lib.rs         # Marketplace, escrow, profiles, disputes
├── agent/                 # JENNY -- autonomous marketplace operator (TypeScript)
│   └── src/
│       ├── agent.ts              # Main operator + state management
│       ├── dispute-resolver.ts   # AI dispute mediation (5-factor analysis)
│       ├── fraud-detector.ts     # Listing fraud scanner (5-check pipeline)
│       ├── api-server.ts         # REST API (16 endpoints + 2 demo sandbox)
│       ├── seed.ts               # Demo data (out-of-box experience)
│       ├── config.ts             # Configuration
│       └── index.ts              # Entry point
├── app/                   # Next.js dashboard (interactive, dark UI)
│   └── app/
│       ├── page.tsx              # Main page (hero + all sections)
│       └── components/
│           ├── ChallengeJenny.tsx # Interactive fraud scanner
│           ├── DisputeArena.tsx   # Interactive dispute resolution
│           ├── Bazaar.tsx         # Live listings grid
│           └── JennyFeed.tsx     # JENNY's real-time activity feed
└── tests/                 # Integration tests
```

## JENNY's Capabilities

### Fraud Detection Pipeline (5 checks)
1. **Seller Reputation** -- Flags accounts with reputation < 200/1000
2. **Price Analysis** -- Detects suspiciously low pricing vs category average
3. **Spam Detection** -- Catches sellers flooding with >20 listings/hour
4. **Account Age** -- Flags accounts less than 24 hours old
5. **Content Scanning** -- Detects scam keywords ("guaranteed profit", "trust me", "send first", "double your money", "100% legit", "no scam")

### Dispute Resolution (5-factor analysis)
1. **Reputation Comparison** -- Weighs both parties' reputation scores
2. **Trade History** -- Considers established vs new traders
3. **Evidence Quality** -- Evaluates detail level of submitted evidence
4. **Response Behavior** -- Non-response heavily penalizes the silent party
5. **Keyword Analysis** -- Identifies common legitimate complaint patterns

Output: Verdict (buyer wins / seller wins / 50-50 split) + confidence score + detailed reasoning

## Solana Integration

| Component | Protocol | Usage |
|-----------|----------|-------|
| Escrow | SPL Token + PDA | USDC locked until delivery confirmed or dispute resolved |
| Reputation | Anchor PDA | On-chain user profiles with trade history and scores |
| Listings | Anchor PDA | Marketplace listings stored on-chain |
| Disputes | Anchor PDA | Evidence, voting, and resolution all on-chain |
| Payments | USDC (SPL) | All transactions in USDC stablecoin |

## Quick Start

Marketplace is self-seeding -- starts with demo data so it looks alive immediately.

### 1. Agent (JENNY)
```bash
cd agent
npm install
npm start          # JENNY boots, seeds demo data, serves API on :3001
```

### 2. Dashboard
```bash
cd app
npm install
npm run dev        # Next.js dashboard on :3000
```

Open `http://localhost:3000` -- try to scam JENNY, watch her judge disputes, browse the bazaar.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Marketplace statistics |
| `/api/activity` | GET | JENNY's activity feed |
| `/api/listings` | GET | Active listings |
| `/api/listings` | POST | Create listing (fraud-scanned) |
| `/api/orders` | GET | All orders |
| `/api/orders` | POST | Create order (fund escrow) |
| `/api/orders/:id/confirm` | POST | Confirm delivery (release escrow) |
| `/api/disputes` | GET | All disputes |
| `/api/disputes/open` | GET | Open disputes |
| `/api/disputes` | POST | Open a dispute |
| `/api/disputes/:id/evidence` | POST | Submit evidence |
| `/api/disputes/:id/resolve` | POST | JENNY resolves dispute |
| `/api/profiles/:owner` | GET | User profile & reputation |
| `/api/leaderboard` | GET | Top users by reputation |
| `/api/fraud` | GET | Fraud reports |
| `/api/demo/scan` | POST | Sandbox: scan a listing (no state change) |
| `/api/demo/resolve` | POST | Sandbox: resolve a dispute (no state change) |

## Tags

`consumer` `payments` `ai`

## License

MIT
