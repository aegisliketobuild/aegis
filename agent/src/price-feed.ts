import { CONFIG, TokenInfo } from "./config";

interface PriceData {
  symbol: string;
  price: number;
  confidence: number;
  timestamp: number;
}

export class PriceFeed {
  private prices: Map<string, PriceData> = new Map();

  async fetchPrices(): Promise<Map<string, PriceData>> {
    const tokens = Object.values(CONFIG.tokens);
    const feedIds = tokens.map((t) => t.pythFeed).filter(Boolean);

    try {
      const url = `${CONFIG.pythServiceUrl}/v2/updates/price/latest?ids[]=${feedIds.join("&ids[]=")}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.parsed) {
        for (let i = 0; i < data.parsed.length; i++) {
          const parsed = data.parsed[i];
          const token = tokens[i];
          if (!token || !parsed?.price) continue;

          const price = parseFloat(parsed.price.price) * Math.pow(10, parsed.price.expo);
          const confidence = parseFloat(parsed.price.conf) * Math.pow(10, parsed.price.expo);

          this.prices.set(token.symbol, {
            symbol: token.symbol,
            price,
            confidence,
            timestamp: parsed.price.publish_time,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch Pyth prices:", error);
    }

    return this.prices;
  }

  getPrice(symbol: string): number | null {
    return this.prices.get(symbol)?.price ?? null;
  }

  getAllPrices(): Map<string, PriceData> {
    return this.prices;
  }
}
