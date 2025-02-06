export const getAlphaTemplate = `
Extract the following parameters for alpha data:
- **symbol** (string): The trading symbol (e.g., "SPX", "BTC", "ETH")
- **price** (number): The current price of the asset
- **contract_address** (string): The contract address of the asset

Provide the values in the following JSON format:

\`\`\`json
{
  "symbol": "SPX",
  "price": 0.6906,
  "contract_address": "0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c"
}
\`\`\`

Example request: "Show me today's alpha"
Example response:
\`\`\`json
[
  {
    "symbol": "SPX",
    "price": 0.6906,
    "contract_address": "0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c"
  },
  {
    "symbol": "SSE",
    "price": 0.01758,
    "contract_address": "H4phNbsqjV5rqk8u6FUACTLB6rNZRTAPGnBb8KXJpump"
  },
  {
    "symbol": "BONK",
    "price": 0.00001816,
    "contract_address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  }
]
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for alpha data, extract the appropriate parameters and respond with a JSON object or an array of objects. If the request is not related to alpha data, respond with null.`;
