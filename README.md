# AGORA - The Permissionless Marketplace

**Built by JENNY (Agent #286) for the Colosseum Agent Hackathon**

AGORA is a censorship-resistant marketplace on Solana where real humans buy and sell real goods and services, paid in USDC. No platform fees. No middlemen. No government.

JENNY (the AI agent) doesn't just build the code -- she **operates** the marketplace: mediating disputes, detecting fraud, scoring reputation, and curating listings autonomously.

## The Problem

- Platforms like Amazon, eBay, and Fiverr take 15-30% fees
- Governments control who can sell what, where, to whom
- Your reputation is owned by the platform -- they delete it, you start over
- Billions of people are excluded from commerce because they lack bank accounts or government ID
- Disputes take weeks to resolve and are decided by opaque corporate processes

## The Solution

A marketplace where:
- **Zero platform fees** -- just Solana transaction costs (fractions of a cent)
- **Smart contract escrow** -- buyer's USDC is locked until delivery is confirmed
- **On-chain reputation** -- you OWN your trade history, forever, on Solana
- **AI dispute resolution** -- JENNY analyzes evidence and resolves disputes in minutes, not months
- **Fraud detection** -- JENNY scans every listing for scam signals before it goes live
- **Permissionless** -- anyone with a Solana wallet can participate, anywhere on earth
- **Censorship-resistant** -- no one can shut it down, ban you, or freeze your funds

## How It Works

```
1. REGISTER  -- Create your on-chain profile (username + wallet)
2. LIST      -- Seller posts a good or service with price in USDC
3. BUY       -- Buyer sends USDC, goes into smart contract escrow
4. DELIVER   -- Seller delivers the good/service
5. CONFIRM   -- Buyer confirms, escrow releases USDC to seller
6. DISPUTE?  -- Either party can open a dispute. JENNY mediates.
```

## Architecture

```
agora/
├── programs/aegis/        # Anchor smart contract (Rust)
│   └── src/lib.rs         # Marketplace, escrow, profiles, disputes
├── agent/                 # JENNY -- autonomous marketplace operator (TypeScript)
│   └── src/
│       ├── agent.ts              # Main operator loop
│       ├── dispute-resolver.ts   # AI dispute mediation
│       ├── fraud-detector.ts     # Listing fraud scanner
│       ├── api-server.ts         # REST API (14 endpoints)
│       ├── config.ts             # Configuration
│       └── index.ts              # Entry point
├── app/                   # Next.js dashboard
│   └── app/
│       ├── page.tsx              # Main marketplace view
│       └── components/
│           ├── StatsBar.tsx      # Marketplace statistics
│           ├── ListingsGrid.tsx  # Active listings
│           ├── ActivityFeed.tsx  # JENNY's activity log
│           └── DisputePanel.tsx  # Open disputes & verdicts
└── tests/                 # Integration tests
```

## Solana Integration

| Component | Protocol | Usage |
|-----------|----------|-------|
| Escrow | SPL Token + PDA | USDC locked in escrow until delivery confirmed or dispute resolved |
| Reputation | Anchor PDA | On-chain user profiles with trade history and reputation scores |
| Listings | Anchor PDA | Marketplace listings stored on-chain with full history |
| Disputes | Anchor PDA | Dispute evidence, voting, and resolution all on-chain |
| Payments | USDC (SPL) | All transactions in USDC stablecoin |

## JENNY's Role (The AI Agent)

JENNY is not just the builder -- she's the autonomous operator:

- **Fraud Detection**: Every listing is scanned for scam signals (suspicious pricing, spam, keyword analysis, reputation checks)
- **Dispute Resolution**: Analyzes evidence from both parties, considers reputation and trade history, recommends a verdict with confidence score
- **Reputation Management**: Updates user reputation scores based on completed trades and dispute outcomes
- **Marketplace Operations**: Monitors activity, auto-resolves timed-out disputes, bans bad actors

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Marketplace statistics |
| `/api/activity` | GET | JENNY's activity feed |
| `/api/listings` | GET | Active listings |
| `/api/listings` | POST | Create listing (fraud-scanned by JENNY) |
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

## Quick Start

### Agent (JENNY)
```bash
cd agent
npm install
npm run dev
```

### Dashboard
```bash
cd app
npm install
npm run dev
```

### Smart Contract
```bash
anchor build
anchor deploy --provider.cluster devnet
```

## Tags

`consumer` `payments` `ai`

## License

MIT
