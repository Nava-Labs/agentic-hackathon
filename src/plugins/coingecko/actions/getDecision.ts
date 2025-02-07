import { IAgentRuntime, Memory, State, Action } from "@elizaos/core";
import getTrending from "./getTrending.ts";
import getPrice from "./getPrice.ts";
import getTopGainersLosers from "./getTopGainersLosers.ts";
import axios from "axios";

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

async function fetchCoinList(): Promise<CoinGeckoCoin[]> {
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/coins/list?include_platform=true",
  );
  return response.data;
}

async function findCoinId(coinQuery: string): Promise<string | null> {
  const coins = await fetchCoinList();
  const query = coinQuery.toLowerCase().trim();

  const exactIdMatch = coins.find((coin) => coin.id === query);
  if (exactIdMatch) return exactIdMatch.id;

  const exactNameMatch = coins.find(
    (coin) => coin.name.toLowerCase() === query,
  );
  if (exactNameMatch) return exactNameMatch.id;

  const symbolMatches = coins.filter(
    (coin) => coin.symbol.toLowerCase() === query,
  );
  if (symbolMatches.length === 1) return symbolMatches[0].id;
  if (symbolMatches.length > 1) return symbolMatches[0].id;

  for (const coin of coins) {
    if (
      Object.values(coin.platforms).some(
        (address) => address.toLowerCase() === query,
      )
    ) {
      return coin.id;
    }
  }

  return null;
}

export const getDecision: Action = {
  name: "GET_DECISION",
  description:
    "Determine whether to BUY, HOLD, or AVOID a cryptocurrency based on market metrics.",
  similes: ["SHOULD_I_BUY", "BUY_OR_NOT", "INVESTMENT_DECISION"],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: { coinQuery?: string },
    callback?: (response: { text: string; content?: any }) => void,
  ): Promise<boolean> => {
    let coinQuery = String(
      options.coinQuery || message?.content?.coinName || state?.coinName || "",
    ).trim();
    if (!coinQuery && message?.content?.text) {
      coinQuery =
        message.content.text.match(/buy\s+([a-zA-Z0-9]+)/i)?.[1] || "";
    }

    if (!coinQuery) {
      if (callback)
        callback({
          text: "Can't recognize the coin name, ID, or contract address. Try again?",
        });
      return true;
    }

    const coinId = await findCoinId(coinQuery);
    if (!coinId) {
      if (callback)
        callback({
          text: `Can't recognize the coin name, ID, or contract address. Try again?`,
        });
      return true;
    }

    const trendingData = (await getTrending.handler(
      runtime,
      message,
      state,
      {},
    )) as {
      content?: { trending?: { coins?: { id: string; score: number }[] } };
    };
    const priceData = (await getPrice.handler(runtime, message, state, {})) as {
      content?: { price?: number; marketCap?: number; volume24h?: number };
    };
    const topGainersLosers = (await getTopGainersLosers.handler(
      runtime,
      message,
      state,
      {},
    )) as { content?: { volatility?: number; priceChange24h?: number } };

    const trendingCoin = trendingData?.content?.trending?.coins?.find(
      (c) => c.id === coinId,
    );
    const trendingScore = trendingCoin ? 100 - trendingCoin.score * 10 : 30;

    const volatility = topGainersLosers?.content?.volatility ?? 100;
    const stabilityScore = 100 - Math.min(volatility, 100);

    const marketCap = priceData?.content?.marketCap ?? 0;
    const marketCapScore =
      marketCap > 10_000_000_000 ? 100 : (marketCap / 10_000_000_000) * 100;

    const volume24h = priceData?.content?.volume24h ?? 0;
    const liquidityScore =
      volume24h > 100_000_000 ? 100 : (volume24h / 100_000_000) * 100;

    const totalScore =
      trendingScore * 0.3 +
      stabilityScore * 0.3 +
      marketCapScore * 0.2 +
      liquidityScore * 0.2;

    let decision: "YES" | "NO";
    let reasoning: string;

    if (totalScore >= 70 && stabilityScore >= 70) {
      decision = "YES";
      reasoning = `This coin (${coinQuery}) is trending, has stable price movement, strong liquidity, and holds a significant market cap. It is a strong investment opportunity.`;
    } else if (totalScore < 70 && stabilityScore < 50) {
      decision = "NO";
      reasoning = `This coin (${coinQuery}) is experiencing high volatility, lacks liquidity, and does not have a strong market cap. Best to avoid for now.`;
    }
    // } else {
    //   decision = "HOLD";
    //   reasoning = `This coin (${coinQuery}) has mixed trends, some stability, but is not strong enough for a confident buy. Consider monitoring further before making a move.`;
    // }

    const responseText = `Decision: ${decision}\n\nReasoning: ${reasoning}`;
    if (callback) {
      callback({
        text: responseText,
        content: {
          decision,
          reasoning,
          metrics: {
            trendingScore,
            stabilityScore,
            marketCapScore,
            liquidityScore,
            volatility,
            priceChange24h: topGainersLosers?.content?.priceChange24h ?? 0,
          },
        },
      });
    }

    return true;
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Should I buy Ethereum?" } },
      {
        user: "{{agent}}",
        content: { text: "Let me check market conditions for Ethereum." },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Decision: BUY\n\nReasoning: Ethereum is trending, has stable price movement, strong liquidity, and holds a significant market cap.",
        },
      },
    ],
  ],
};
