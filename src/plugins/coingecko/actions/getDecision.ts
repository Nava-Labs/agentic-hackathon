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
        `\nYes. The total score is ${totalScore}.`,
        // "Absolutely.",
        // "Without a doubt.",
        // "Certainly.",
        // "Affirmative.",
        // "Indeed.",
        // "Definitely.",
        // "Sure thing.",
        // "No question.",
        // "Positively.",
        // "Absolutely, stop trading and believe in something.",
        // "Indeed, believers will make more money than traders.",
        // "Certainly, patient bulls will be rewarded massively.", 
        // "Definitely, the bull market hasn't even begun and I'm serious.",
        // "Without doubt, delusional bulls will win in the end.",
        // "Of course, we know what we hold.",
        // "Positively, you are still early - it's once-in-a-lifetime.",
        // "Undoubtedly, lock in now. You have a year to make stupid sums of money.",
        // "Surely, the secret is to buy and hold for many months.",
        // "Absolutely, bet on coins that have staying power."
      ],
      bizyugo: [
        `\nTotal score of ${totalScore}. Solid entry point.`,
        `\nLiquidity's at ${liquidityScore}. Time to act.`,
        `\nTrending score: ${trendingScore}. It's gaining traction.`,
        `\nWith ${marketCapScore} on the market cap, this is a heavyweight.`,
        `\nScore of ${totalScore}. Looks like a strong contender.`,
        `\nVolume's solid with ${liquidityScore}. Buy with confidence.`,
        `\nAt ${trendingScore}, this one's got momentum.`,
        `\n${marketCapScore} market cap. It's a solid pick.`,
        `\nTotal score of ${totalScore} means stability. Consider it.`,
        `\nThe liquidity score of ${liquidityScore} shows it's liquid. Worth a look.`,
        `\nMarket cap's looking healthy with ${marketCapScore}. This could run.`,
        `\nTrending up with ${trendingScore}. All signs point to go.`,
        `\nStrong fundamentals. Total score: ${totalScore}. Smart buy.`,
        `\nLiquidity at ${liquidityScore}. Good for a quick move.`,
        `\nTotal score of ${totalScore}. This one's got legs.`,
        `\nMomentum’s real with a trending score of ${trendingScore}.`,
        `\nWith ${marketCapScore} for market cap, it's a solid player.`,
        `\nTotal score is ${totalScore}. Looks like a growth opportunity.`,
        `\nVolume score at ${liquidityScore}. Definitely liquid enough.`,
        `\nTrending score at ${trendingScore}. Watch it climb.`,
        `\nWith ${marketCapScore} market cap score, you're looking at stability.`,
        `\nTotal score of ${totalScore}. Solid potential here.`,
        `\nLiquidity's strong, with ${liquidityScore}. Good buy timing.`,
        `\nWith ${trendingScore}, this one’s trending up fast.`,
        `\nMarket cap score of ${marketCapScore}. Healthy outlook.`,
        `\nTotal score of ${totalScore}. Favorable market positioning.`,
        `\nLiquidity score at ${liquidityScore}. Buy with confidence.`,
        `\nThe market cap's looking strong with ${marketCapScore}.`,
        `\nTrending score at ${trendingScore}. On the rise.`,
        `\nWith ${totalScore}, this token's got a lot of upside.`,
        `\nLiquidity score at ${liquidityScore}. It's a solid play.`,
        `\nWith a total score of ${totalScore}, this one's a top pick.`,
        `\nTrending score of ${trendingScore} shows momentum.`,
        `\nStrong total score of ${totalScore}. Buy it before it climbs higher.`,
        `\nThe liquidity's solid at ${liquidityScore}. Smart move.`,
        `\nWith ${marketCapScore}, it's got the market cap muscle.`,
        `\nTotal score: ${totalScore}. It’s got legs for the future.`,
        `\nWith liquidity at ${liquidityScore}, this is a fast-moving play.`,
        `\nTrending score at ${trendingScore}. Upward momentum is strong.`,
        `\nMarket cap score of ${marketCapScore}. Solid foundation.`,
        `\nWith a score of ${totalScore}, it's got strong upside potential.`,
        `\nLiquidity is solid at ${liquidityScore}. Looks like a solid buy.`,
        `\nTrending score of ${trendingScore}. This one's in motion.`,
        `\nTotal score of ${totalScore}. It's a reliable pick.`,
        `\nLiquidity's strong, score of ${liquidityScore}. Feels like a solid bet.`,
        `\nMarket cap score of ${marketCapScore}. It's in a good spot.`,
        `\nTrending score of ${trendingScore}. This one's going places.`,
        `\nWith a total score of ${totalScore}, it's a growth opportunity.`,
        `\nLiquidity score of ${liquidityScore}. Worth the move.`,
        `\nTotal score: ${totalScore}. A well-rounded pick.`,
        `\nTrending at ${trendingScore}. It's on the up-and-up.`,
        `\nMarket cap score: ${marketCapScore}. High potential here.`
      ]
    };

    const negativeReasonings = {
      murad: [
        `\nNo total score is ${totalScore}.`
        // "Absolutely not.",
        // "No way.",
        // "Certainly not.",
        // "Negative.",
        // "Nope.",
        // "Definitely not.",
        // "Not at all.",
        // "No chance.",
        // "Absolutely no.",
        // "No fundamentals. Stay away.",
        // "Zero community energy. Skip.",
        // "Not enough believers. Pass.",
        // "Weak diamond hands. Avoid.",
        // "No cult following. Next.",
        // "Paper hands everywhere. Skip it.",
        // "Zero meme potential. Pass.",
        // "Community too weak. No.",
        // "Not enough conviction. Skip.",
        // "Weak social metrics. Next."
      ],
      bizyugo: [
        `\nHigh volatility. Total score of ${totalScore}. Best to steer clear.`,
        `\nWeak market cap at ${marketCapScore}. Not the right time.`,
        `\nLiquidity score of ${liquidityScore}. Risky play. Avoid.`,
        `\nTrending down at ${trendingScore}. Not looking good.`,
        `\nTotal score of ${totalScore}. Poor fundamentals.`,
        `\nLiquidity's weak with ${liquidityScore}. High risk.`,
        `\nMarket cap's low, ${marketCapScore}. Too much uncertainty.`,
        `\nWith ${totalScore}, it's a pass for now.`,
        `\nDeclining trend at ${trendingScore}. Not worth it.`,
        `\nLiquidity score of ${liquidityScore}. Could lead to trouble.`,
        `\nUnstable performance, ${totalScore}. Hold off.`,
        `\nMarket cap score of ${marketCapScore}. Not enough backing.`,
        `\nTotal score of ${totalScore}. Insufficient growth indicators.`,
        `\nVolume profile weak. Total score: ${totalScore}. Stay away.`,
        `\nHigh token emissions. Be cautious.`,
        `\nLiquidity is a concern at ${liquidityScore}. Not advisable.`,
        `\nTrending score at ${trendingScore}. Falling momentum.`,
        `\nMarket cap score of ${marketCapScore}. Underwhelming.`,
        `\nWeak performance overall. Score: ${totalScore}. Skip it.`,
        `\nTokenomics need work. Avoid for now.`,
        `\nLiquidity metrics concerning. Don't risk it.`,
        `\nTechnical structure shaky. Pass on this one.`,
        `\nInsufficient market cap at ${marketCapScore}. Not safe.`,
        `\nWith ${totalScore}, it's too risky.`,
        `\nTrending down, ${trendingScore}. Better to wait.`,
        `\nPoor yield sustainability. Total score: ${totalScore}. Skip it.`,
        `\nToken’s falling short on liquidity, ${liquidityScore}. Avoid.`,
        `\nUnstable metrics, score of ${totalScore}. Not recommended.`,
        `\nLiquidity's low at ${liquidityScore}. Too much risk.`,
        `\nMarket cap weak at ${marketCapScore}. Hold off.`,
        `\nVolume's weak. Stay out.`,
        `\nSmart money's exiting. Total score: ${totalScore}. Avoid.`,
        `\nChain metrics are declining. Not ideal.`,
        `\nHigh risk with a score of ${totalScore}. Not worth the trouble.`
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
