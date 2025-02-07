import type { Plugin } from "@elizaos/core";
import { categoriesProvider } from "./providers/categoriesProvider.ts";
import { coinsProvider } from "./providers/coinsProvider.ts";
import { getDecision } from "./actions/getDecision.ts";
import getPrice from "./actions/getPrice.ts";
import getPricePerAddress from "./actions/getPricePerAddress.ts";
import getTrending from "./actions/getTrending.ts";
import getTrendingPools from "./actions/getTrendingPools.ts";
import getMarkets from "./actions/getMarkets.ts";
import getTopGainersLosers from "./actions/getTopGainersLosers.ts";
import getNewlyListed from "./actions/getNewlyListed.ts";

export const coingeckoPlugin: Plugin = {
  name: "coingecko",
  description: "CoinGecko Plugin for Eliza",
  actions: [
    getDecision,
    getPrice,
    getPricePerAddress,
    getTrending,
    getTrendingPools,
    getMarkets,
    getTopGainersLosers,
    getNewlyListed,
  ],
  evaluators: [],
  providers: [categoriesProvider, coinsProvider],
};

export default coingeckoPlugin;
