import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { CONFIG } from "./config";
import { PriceFeed } from "./price-feed";
import {
  TreasuryAnalyzer,
  PortfolioSnapshot,
  RiskAssessment,
  RiskParams,
} from "./treasury-analyzer";
import { StrategyEngine, StrategyProposal } from "./strategy-engine";

export interface ProposalRecord {
  proposal: StrategyProposal;
  createdAt: number;
  status: "pending" | "approved" | "rejected" | "executed";
  onChainId?: string;
}

export interface AnalysisCycleResult {
  snapshot: PortfolioSnapshot;
  risk: RiskAssessment;
  newProposals: StrategyProposal[];
  timestamp: number;
}

export class AegisAgent {
  private connection: Connection;
  private priceFeed: PriceFeed;
  private analyzer: TreasuryAnalyzer;
  private strategyEngine: StrategyEngine;
  private vaultAuthority: PublicKey;
  private riskParams: RiskParams;
  private intervalId?: NodeJS.Timeout;

  private latestSnapshot: PortfolioSnapshot | null = null;
  private latestRisk: RiskAssessment | null = null;
  private pendingProposals: ProposalRecord[] = [];
  private proposalHistory: ProposalRecord[] = [];

  constructor(vaultAuthority: PublicKey, riskParams?: RiskParams) {
    this.connection = new Connection(CONFIG.rpcUrl, CONFIG.commitment);
    this.priceFeed = new PriceFeed();
    this.analyzer = new TreasuryAnalyzer(this.connection, this.priceFeed);
    this.strategyEngine = new StrategyEngine();
    this.vaultAuthority = vaultAuthority;
    this.riskParams = riskParams || {
      maxSingleTokenBps: 3000, // 30%
      minStablecoinBps: 4000, // 40%
      maxSwapUsdCents: 500000, // $5,000
      maxDailyVolumeUsdCents: 2000000, // $20,000
    };
  }

  async runAnalysisCycle(): Promise<AnalysisCycleResult> {
    console.log(`[AEGIS] Running analysis cycle at ${new Date().toISOString()}`);

    // 1. Analyze portfolio
    const snapshot = await this.analyzer.analyzePortfolio(this.vaultAuthority);
    this.latestSnapshot = snapshot;

    console.log(
      `[AEGIS] Portfolio: $${snapshot.totalValueUsd.toFixed(2)} | ` +
      `${snapshot.holdings.length} tokens | ` +
      `${snapshot.stablecoinPercentage.toFixed(1)}% stablecoins`
    );

    // 2. Assess risk
    const risk = this.analyzer.assessRisk(snapshot, this.riskParams);
    this.latestRisk = risk;

    if (risk.alerts.length > 0) {
      console.log(`[AEGIS] Risk score: ${risk.score}/100`);
      for (const alert of risk.alerts) {
        console.log(`[AEGIS] [${alert.severity.toUpperCase()}] ${alert.message}`);
      }
    } else {
      console.log(`[AEGIS] Risk score: ${risk.score}/100 - Portfolio within parameters`);
    }

    // 3. Generate strategy proposals (only if risk warrants action)
    let newProposals: StrategyProposal[] = [];
    if (risk.score > 10) {
      newProposals = this.strategyEngine.generateStrategies(
        snapshot,
        risk,
        this.riskParams
      );

      for (const proposal of newProposals) {
        const record: ProposalRecord = {
          proposal,
          createdAt: Date.now(),
          status: "pending",
        };
        this.pendingProposals.push(record);
        console.log(
          `[AEGIS] New proposal [${proposal.priority}]: ${proposal.description}`
        );
      }
    }

    return {
      snapshot,
      risk,
      newProposals,
      timestamp: Date.now(),
    };
  }

  start() {
    console.log("[AEGIS] Starting autonomous treasury guardian...");
    console.log(`[AEGIS] Monitoring vault: ${this.vaultAuthority.toBase58()}`);
    console.log(`[AEGIS] Risk params: min stable ${this.riskParams.minStablecoinBps / 100}%, max single ${this.riskParams.maxSingleTokenBps / 100}%`);
    console.log(`[AEGIS] Analysis interval: ${CONFIG.analysisIntervalMs / 1000}s`);

    // Run immediately
    this.runAnalysisCycle().catch(console.error);

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runAnalysisCycle().catch(console.error);
    }, CONFIG.analysisIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log("[AEGIS] Agent stopped.");
  }

  // Getters for API
  async getLatestSnapshot(): Promise<PortfolioSnapshot | null> {
    if (!this.latestSnapshot) {
      return this.analyzer.analyzePortfolio(this.vaultAuthority);
    }
    return this.latestSnapshot;
  }

  async getLatestRiskAssessment(): Promise<RiskAssessment | null> {
    if (!this.latestRisk && this.latestSnapshot) {
      return this.analyzer.assessRisk(this.latestSnapshot, this.riskParams);
    }
    return this.latestRisk;
  }

  getPendingProposals(): ProposalRecord[] {
    return this.pendingProposals;
  }

  getProposalHistory(): ProposalRecord[] {
    return this.proposalHistory;
  }

  getSnapshotHistory(): PortfolioSnapshot[] {
    return this.analyzer.getSnapshots();
  }

  getVaultInfo() {
    return {
      authority: this.vaultAuthority.toBase58(),
      rpcUrl: CONFIG.rpcUrl,
    };
  }

  getRiskParams(): RiskParams {
    return this.riskParams;
  }

  getCurrentPrices() {
    return this.priceFeed.getAllPrices();
  }
}
