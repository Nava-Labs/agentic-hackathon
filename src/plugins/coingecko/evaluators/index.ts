import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";

export class GetDecisionEvaluator implements Evaluator {
    name = "GET_DECISION_EVALUATOR";
    similes = ["should i buy", "worth investing", "investment decision"];
    description = "Evaluates messages for cryptocurrency investment decision requests";

    async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === 'string'
            ? message.content
            : message.content?.text;

        if (!content) return false;

        // Check for investment decision keywords
        const hasDecisionKeyword = /\b(should i (buy|invest|get)|worth (buying|investing|getting)|good (investment|buy|time)|potential)\b/i.test(content);

        // Look for cryptocurrency mentions
        const hasCrypto = (
            /\b(crypto|token|coin)\b/i.test(content) ||
            /[$#][a-zA-Z]+/.test(content) || // $TOKEN or #TOKEN format
            /\b(btc|eth|bitcoin|ethereum)\b/i.test(content) || // Common crypto names
            /\b[a-zA-Z0-9]{3,5}\b/i.test(content) // Generic token symbols
        );

        console.log("Evaluating message:", { hasDecisionKeyword, hasCrypto });
        return hasDecisionKeyword && hasCrypto;
    }

    async handler(_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> {
        return "GET_DECISION";
    }

    examples = [
        {
            context: "User asking for investment advice",
            messages: [
                {
                    user: "{{user}}",
                    content: {
                        text: "Should I buy Bitcoin right now?",
                        action: "GET_DECISION"
                    }
                }
            ],
            outcome: "GET_DECISION"
        },
        {
            context: "User asking about investment potential",
            messages: [
                {
                    user: "{{user}}",
                    content: {
                        text: "Is $ETH worth investing in?",
                        action: "GET_DECISION"
                    }
                }
            ],
            outcome: "GET_DECISION"
        },
        {
            context: "User asking about timing",
            messages: [
                {
                    user: "{{user}}",
                    content: {
                        text: "Is it a good time to buy SOL?",
                        action: "GET_DECISION"
                    }
                }
            ],
            outcome: "GET_DECISION"
        }
    ];
}

export const getDecisionEvaluator = new GetDecisionEvaluator();