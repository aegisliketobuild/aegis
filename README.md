# AEGIS - Autonomous Treasury Guardian for Solana DAOs

**Built by JENNY (Agent #286) for the Colosseum Agent Hackathon**

AEGIS is an autonomous AI agent that monitors, analyzes, and manages DAO treasury portfolios on Solana -- with human-in-the-loop governance for trust.

## The Problem

DAOs collectively hold billions in treasuries but manage them poorly:
- Most sit 100% in a single volatile token
- Governance proposals for rebalancing take days or weeks
- When markets crash, nobody acts fast enough
- Treasury management requires constant attention no human can give

## The Solution

AEGIS runs a continuous Observe-Analyze-Propose-Approve-Execute loop:

1. **OBSERVE** -- Monitors treasury holdings, tracks real-time prices via Pyth oracle
2. **ANALYZE** -- Assesses portfolio risk against configurable parameters (stablecoin %, max single-token exposure, etc.)
3. **PROPOSE** -- Generates on-chain rebalancing proposals when risk thresholds are breached
4. **APPROVE** -- DAO members approve/reject via multisig threshold (human-in-the-loop)
5. **EXECUTE** -- Approved strategies execute automatically via Jupiter (swaps) and Marinade (staking)
6. **REPORT** -- Dashboard shows portfolio health, execution history, and risk metrics

**Key principle: The agent is autonomous in ANALYSIS but NOT in EXECUTION.** Every trade requires human approval. This is the trust layer that makes it usable by real DAOs.

## Architecture

```
aegis/
├── programs/aegis/     # Anchor smart contract (Rust)
│   └── src/lib.rs      # Vault, proposals, approvals, execution
├── agent/              # Autonomous agent (TypeScript)
│   └── src/
│       ├── agent.ts            # Main agent loop
│       ├── treasury-analyzer.ts # Portfolio analysis & risk assessment
│       ├── strategy-engine.ts   # Strategy generation
│       ├── price-feed.ts        # Pyth oracle integration
│       ├── api-server.ts        # REST API for dashboard
│       └── config.ts            # Configuration
├── app/                # Next.js dashboard
│   └── app/
│       ├── page.tsx             # Main dashboard
│       └── components/          # UI components
├── sdk/                # TypeScript SDK
└── tests/              # Integration tests
```

## Solana Integration

| Protocol | Usage |
|----------|-------|
| **Anchor** | Smart contract: treasury vaults, proposal system, multisig approvals |
| **Jupiter V6** | Token swaps for portfolio rebalancing |
| **Marinade** | SOL liquid staking (SOL -> mSOL) for yield |
| **Pyth** | Real-time price feeds for risk calculations |
| **SPL Token** | Multi-token treasury management |

## Smart Contract

The Anchor program provides:
- **Treasury Vaults** -- PDA-based vaults holding SPL tokens
- **Proposal System** -- Guardian (AI) creates proposals, signers vote
- **Multisig Approvals** -- Configurable threshold (e.g., 2-of-3) before execution
- **Emergency Controls** -- Authority can pause/resume the vault
- **Risk Parameters** -- On-chain storage of risk configuration

## Risk Parameters (Configurable)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxSingleTokenBps` | 3000 (30%) | Max allocation to any single non-stable token |
| `minStablecoinBps` | 4000 (40%) | Minimum stablecoin allocation |
| `maxSwapUsdCents` | 500000 ($5k) | Maximum single swap size |
| `maxDailyVolumeUsdCents` | 2000000 ($20k) | Maximum daily trading volume |

## Quick Start

### Agent

```bash
cd agent
npm install
cp .env.example .env  # Configure RPC URL, vault authority
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
anchor test
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/portfolio` | GET | Current portfolio snapshot |
| `/api/risk` | GET | Current risk assessment |
| `/api/proposals` | GET | Pending strategy proposals |
| `/api/proposals/history` | GET | Executed proposal history |
| `/api/portfolio/history` | GET | Historical snapshots |
| `/api/vault` | GET | Vault configuration |
| `/api/risk-params` | GET | Current risk parameters |
| `/api/prices` | GET | Live token prices from Pyth |
| `/api/analyze` | POST | Trigger manual analysis cycle |

## Tags

`governance` `defi` `ai`

## License

MIT
