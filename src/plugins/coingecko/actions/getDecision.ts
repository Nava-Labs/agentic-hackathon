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

    console.log("agent runtime: ", runtime.character.name)

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
        `\nStrong metrics with a total score of ${totalScore}. Consider investing.`,
        // "Positive indicators. Worth a look.",
        // "Stable and liquid. Potential buy.",
        // "Trending up. Investment viable.",
        // "Solid fundamentals. Favorable prospect.",
        // "Market interest high. Looks good.",
        // "Stable growth. Investment-worthy.",
        // "Gaining traction. Promising asset.",
        // "Robust liquidity. Consider purchase.",
        // "Significant market cap. Good choice.",
        // "Protocol metrics looking strong. Worth considering.",
        // "Solid TVL growth. Potential upside.",
        // "Strong on-chain activity. Consider entry.",
        // "Healthy volume metrics. Investment viable.",
        // "Technical analysis suggests uptrend.",
        // "Good liquidity depth. Entry possible.",
        // "Protocol revenue growing. Worth watching.",
        // "Market structure favorable. Consider long.",
        // "Tokenomics look solid. Potential hold.",
        // "Yield metrics attractive. Worth farming."
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
        `\nHigh volatility.\n Best to avoid.\n Here's the total score: ${totalScore}.`,
        // "Weak metrics. Not advisable.",
        // "Unstable and illiquid. Risky.",
        // "Negative indicators. Avoid.",
        // "Poor fundamentals. Not recommended.",
        // "Low market interest. Unfavorable.",
        // "Declining trend. Not a good choice.",
        // "Weak liquidity. High risk.",
        // "Insufficient market cap. Avoid.",
        // "Unstable performance. Not ideal.",
        // "Protocol TVL declining. Not worth risk.",
        // "Weak protocol revenue. Skip for now.",
        // "Poor yield sustainability. Avoid.",
        // "Technical structure bearish. Pass.",
        // "Token emissions too high. Careful.",
        // "Liquidity metrics concerning. Wait.",
        // "Tokenomics need work. Not yet.",
        // "Volume profile weak. Stay out.",
        // "Smart money exiting. Be careful.",
        // "Chain metrics declining. Hold off."
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

    if (totalScore >= 70 && stabilityScore >= 70) {
      decision = "YES";
      reasoning = getRandomReasoning(positiveReasonings, personality);
    } else if (totalScore < 70 && stabilityScore < 50) {
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
