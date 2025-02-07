import type { IAgentRuntime, Memory, State, Action } from "@elizaos/core";
import getTrending from "./getTrending.ts";
import axios from "axios";
import { getApiConfig, validateCoingeckoConfig } from "../environment.ts";
import { PriceResponse } from "../types.ts";

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

// export const getDecisionTemplate = `Determine if this is a request for investment advice or decision about a cryptocurrency. If it is one of the specified situations, perform the corresponding action:

// Situation 1: "Investment Decision Request"
// - Message contains: phrases like "should I buy", "worth investing", "good investment" AND mentions a cryptocurrency
// - Example: "Should I buy Bitcoin?" or "Is ETH worth investing right now?"
// - Action: Analyze the cryptocurrency for investment decision

// Previous conversation for context:
// {{conversation}}

// You are replying to: {{message}}
// `;

async function fetchCoinList(): Promise<CoinGeckoCoin[]> {
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/coins/list?include_platform=true",
  );
  return response.data;
}

async function fetchMarketData(ids: string[]): Promise<CoinGeckoMarketData[]> {
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&ids=${ids.join(",")}`,
  );
  return response.data;
}

async function findCoin(coinQuery: string): Promise<CoinGeckoMarketData | null> {
  const coins = await fetchCoinList();
  const query = coinQuery.toLowerCase().trim();

  const exactSymbolMatch = coins.filter((coin) => coin.symbol === query);
  if (!exactSymbolMatch.length) return null;

  const mcLookup = await fetchMarketData(exactSymbolMatch.map((coin) => coin.id));
  return mcLookup[0];
}

export const getDecision: Action = {
  name: "GET_DECISION",
  description:
    "Determine whether to BUY, HOLD, or AVOID a cryptocurrency based on market metrics.",
  similes: ["SHOULD_I_BUY", "BUY_OR_NOT", "INVESTMENT_DECISION"],
  suppressInitialMessage: true,
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

    console.log("agent runtime: ", runtime.character.name)

    if (!coinQuery) {
      if (callback)
        callback({
          text: "Can't recognize the coin name, ID, or contract address. Try again?",
        });
      return true;
    }

    const coin = await findCoin(coinQuery);
    if (!coin) {
      if (callback)
        callback({
          text: `Can't recognize the coin name, ID, or contract address. Try again?`,
        });
      return true;
    }

    const config = await validateCoingeckoConfig(runtime);
    const { baseUrl, apiKey, headerKey } = getApiConfig(config);
    console.log("coinId: ", coin.id)
    const response = await axios.get<PriceResponse>(
      `${baseUrl}/simple/price`,
      {
        params: {
          ids: coin.id,
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true
        },
        headers: {
          'accept': 'application/json',
          [headerKey]: apiKey
        }
      }
    );


    const priceData = Object.values(response.data)[0] as any;
    console.log("priceData: ", priceData);

    const MAGIC_NUMBER = {
      "Murad": 700,
      "bizyugo": 500
    };
    const trendingScore = ((MAGIC_NUMBER[runtime.character.name] - coin.market_cap_rank) / MAGIC_NUMBER[runtime.character.name]) * 100;

    const marketCap = priceData.usd_market_cap;
    const marketCapScore =
      marketCap > 1_000_000_000 ? 100 : (marketCap / 1_000_000_000) * 100;

    const volume24h = priceData.usd_24h_vol;
    const liquidityScore =
      volume24h > 10_000_000 ? 100 : (volume24h / 10_000_000) * 100;

    const totalScore =
      trendingScore * 0.5 +
      marketCapScore * 0.25 +
      liquidityScore * 0.25;

    const positiveReasonings = {
      murad: [
        "Yes.",
        "Absolutely.",
        "Without a doubt.",
        "Certainly.",
        "Affirmative.",
        "Indeed.",
        "Definitely.",
        "Sure thing.",
        "No question.",
        "Positively."
      ],
      bizyugo: [
        "Strong metrics. Consider investing.",
        "Positive indicators. Worth a look.",
        "Stable and liquid. Potential buy.",
        "Trending up. Investment viable.",
        "Solid fundamentals. Favorable prospect.",
        "Market interest high. Looks good.",
        "Stable growth. Investment-worthy.",
        "Gaining traction. Promising asset.",
        "Robust liquidity. Consider purchase.",
        "Significant market cap. Good choice."
      ]
    };

    const negativeReasonings = {
      murad: [
        "No.",
        "Absolutely not.",
        "No way.",
        "Certainly not.",
        "Negative.",
        "Nope.",
        "Definitely not.",
        "Not at all.",
        "No chance.",
        "Absolutely no."
      ],
      bizyugo: [
        "High volatility. Best to avoid.",
        "Weak metrics. Not advisable.",
        "Unstable and illiquid. Risky.",
        "Negative indicators. Avoid.",
        "Poor fundamentals. Not recommended.",
        "Low market interest. Unfavorable.",
        "Declining trend. Not a good choice.",
        "Weak liquidity. High risk.",
        "Insufficient market cap. Avoid.",
        "Unstable performance. Not ideal."
      ]
    };

    // Function to get a random reasoning from the specified personality array
    function getRandomReasoning(reasonings: any, personality: any) {
      const selectedReasonings = reasonings[personality];
      const randomIndex = Math.floor(Math.random() * selectedReasonings.length);
      return selectedReasonings[randomIndex];
    }

    // Determine character personality type
    function getPersonalityType(runtime: any) {
      if (runtime.character.name === "Murad") return "murad";
      if (runtime.character.name === "bizyugo") return "bizyugo";
      return "bizyugo"; // Default to 'bizyugo' if unknown character
    }

    // Example usage within your decision-making logic
    let decision: string;
    let reasoning: string;
    const personality = getPersonalityType(runtime);

    if (totalScore >= 50) {
      decision = "YES";
      reasoning = getRandomReasoning(positiveReasonings, personality);
    } else if (totalScore < 50) {
      decision = "NO";
      reasoning = getRandomReasoning(negativeReasonings, personality);
    }

    const responseText = `Decision: ${decision}\n\nReasoning: ${reasoning}`;
    if (callback) {
      callback({
        text: responseText,
        content: {
          decision,
          reasoning,
          metrics: {
            trendingScore,
            marketCapScore,
            liquidityScore,
          },
        },
      });
    }

    return true;
  },
  examples: [
    [
      { user: "{{user}}", content: { text: "Should I buy {{coinQuery}}?" } },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check market conditions for {{coinQuery}}.",
        },
      },
      {
        user: "{{system}}",
        content: {
          text: "Decision: BUY\n\nReasoning: {{dynamic}}",
          action: "GET_DECISION",
        },
      },
    ],
    [
      { user: "{{user}}", content: { text: "Is {{coinQuery}} worth investing in right now?" } },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check market conditions for {{coinQuery}}.",
        },
      },
      {
        user: "{{system}}",
        content: {
          text: "Decision: BUY\n\nReasoning: {{dynamic}}",
          action: "GET_DECISION",
        },
      },
    ],
    [
      { user: "{{user}}", content: { text: "What do you think about buying {{coinQuery}}?" } },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check market conditions for {{coinQuery}}.",
        },
      },
      {
        user: "{{system}}",
        content: {
          text: "Decision: BUY\n\nReasoning: {{dynamic}}",
          action: "GET_DECISION",
        },
      },
    ],
    [
      { user: "{{user}}", content: { text: "Is it a good time to get some {{coinQuery}}?" } },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check market conditions for {{coinQuery}}.",
        },
      },
      {
        user: "{{system}}",
        content: {
          text: "Decision: BUY\n\nReasoning: {{dynamic}}",
          action: "GET_DECISION",
        },
      },
    ],
    [
      { user: "{{user}}", content: { text: "Do you recommend buying {{coinQuery}} at current price?" } },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check market conditions for {{coinQuery}}.",
        },
      },
      {
        user: "{{system}}",
        content: {
          text: "Decision: BUY\n\nReasoning: {{dynamic}}",
          action: "GET_DECISION",
        },
      },
    ],
    [
      { user: "{{user}}", content: { text: "should i buy {{coinQuery}}?" } },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check market conditions for {{coinQuery}}.",
        },
      },
      {
        user: "{{system}}",
        content: {
          text: "Decision: BUY\n\nReasoning: {{dynamic}}",
          action: "GET_DECISION",
        },
      },
    ],
  ],
};
