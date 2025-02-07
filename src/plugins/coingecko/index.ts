import type { Plugin } from "@elizaos/core";
import { categoriesProvider } from "./providers/categoriesProvider.ts";
import { coinsProvider } from "./providers/coinsProvider.ts";
import { getDecision } from "./actions/getDecision.ts";
import { getDecisionEvaluator } from "./evaluators/index.ts";

export const coingeckoPlugin: Plugin = {
  name: "coingecko",
  description: "CoinGecko Plugin for Eliza",
  actions: [
    getDecision,
    // getPrice,
    // getPricePerAddress,
    // getTrending,
    // getTrendingPools,
    // getMarkets,
    // getTopGainersLosers,
    // getNewlyListed,
  ],
  evaluators: [getDecisionEvaluator],
  providers: [categoriesProvider, coinsProvider],
};

export default coingeckoPlugin;
