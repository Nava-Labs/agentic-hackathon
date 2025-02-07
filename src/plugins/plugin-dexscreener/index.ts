import type { Plugin } from "@elizaos/core"
import { TokenPriceAction } from "./actions/tokenAction.ts"
import { TokenPriceEvaluator } from "./evaluators/tokenEvaluator.ts"
import { TokenPriceProvider } from "./providers/tokenProvider.ts"
import { LatestBoostedTokensAction } from "./actions/trendsAction.ts"

export * as actions from "./actions/index.ts"
export * as evaluators from "./evaluators/index.ts"
export * as providers from "./providers/index.ts"

export const dexScreenerPlugin: Plugin = {
	name: "dexscreener",
	description: "Dex Screener Plugin with Token Price Action, Token Trends, Evaluators and Providers",
	actions: [new TokenPriceAction(), new LatestBoostedTokensAction()],
	evaluators: [],
	providers: [],
}

export default dexScreenerPlugin
