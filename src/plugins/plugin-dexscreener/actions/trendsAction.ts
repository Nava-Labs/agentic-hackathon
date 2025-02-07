import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
    getEmbeddingZeroVector,
} from "@elizaos/core";
import { Codex } from "@codex-data/sdk";

const codex = new Codex(process.env.CODEX_API_KEY || "");

interface TokenProfile {
    address: string;
    symbol: string;
    name: string;
    volume: string;
    marketCap?: string;
    price: number;
    isScam?: null | boolean;
}

const createTokenMemory = async (
    runtime: IAgentRuntime,
    _message: Memory,
    formattedOutput: string
) => {
    const memory: Memory = {
        userId: _message.userId,
        agentId: _message.agentId,
        roomId: _message.roomId,
        content: { text: formattedOutput },
        createdAt: Date.now(),
        embedding: getEmbeddingZeroVector(),
    };
    await runtime.messageManager.createMemory(memory);
};

export const latestBoostedTemplate = `Determine if this is a request for latest boosted tokens. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get latest boosted tokens"
- Message contains: words like "latest", "new", "recent" AND "boosted tokens"
- Example: "Show me the latest boosted tokens" or "What are the new promoted tokens?"
- Action: Get the most recent boosted tokens

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

export class LatestBoostedTokensAction implements Action {
    name = "GET_LATEST_BOOSTED_TOKENS";
    similes = [
        "FETCH_NEW_BOOSTED_TOKENS",
        "CHECK_RECENT_BOOSTED_TOKENS",
        "LIST_NEW_BOOSTED_TOKENS",
    ];
    description = "Get the latest boosted tokens from Codex SDK";
    suppressInitialMessage = true;
    template = latestBoostedTemplate;

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content =
            typeof message.content === "string"
                ? message.content
                : message.content?.text;

        if (!content) return false;

        const hasLatestKeyword = /\b(latest|new|recent)\b/i.test(content);
        const hasBoostedKeyword = /\b(boosted|promoted|featured)\b/i.test(
            content
        );
        const hasTokensKeyword = /\b(tokens?|coins?|crypto)\b/i.test(content);

        return hasLatestKeyword && (hasBoostedKeyword || hasTokensKeyword);
    }

    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options: { [key: string]: unknown } = {},
        callback?: HandlerCallback
    ): Promise<boolean> {
        elizaLogger.log("Starting GET_LATEST_BOOSTED_TOKENS handler...");

        try {
            // Using Codex SDK instead of DexScreener API
            const response = await codex.queries.listTopTokens({
                networkFilter: [1, 42161, 8453],
            });

            const tokens: TokenProfile[] = response.listTopTokens;

            const formattedOutput = tokens
                .map((token) => {
                    return `Token Address: ${token.address}\nSymbol: ${token.symbol}\nName: ${token.name}\nPrice: $${token.price}\n\n`;
                })
                .join("");

            await createTokenMemory(runtime, message, formattedOutput);

            if (callback) {
                await callback({
                    text: formattedOutput,
                    content: {
                        trending_tokens: tokens,
                        timestamp: new Date().toISOString()
                    },
                    action: this.name,
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error fetching latest boosted tokens:", error);

            if (callback) {
                await callback({
                    text: `Failed to fetch latest boosted tokens: ${error.message}`,
                    action: this.name,
                });
            }

            return false;
        }
    }

    examples = [
        [
            {
                user: "{{user}}",
                content: {
                    text: "show me the latest boosted tokens",
                },
            },
            {
                user: "{{system}}",
                content: {
                    text: "Here are the latest boosted tokens on Codex...",
                    action: "GET_LATEST_BOOSTED_TOKENS",
                },
            },
        ],
    ];
}

export const latestBoostedTokensAction = new LatestBoostedTokensAction();
