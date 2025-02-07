export const getPriceByAddressTemplate = `
Extract the following parameters for token price data:
- **chainId** (string): The blockchain network ID (e.g., "ethereum", "polygon", "binance-smart-chain"). Normalize chain IDs to lowercase names such as "ethereum", "polygon", "binance-smart-chain", "avalanche", "fantom", "arbitrum", "optimism", etc.
- **tokenAddress** (string): The contract address of the token. The address should be the complete string with its original case (case-sensitive).
- **include_market_cap** (boolean, optional): Whether to include market cap data (default: true).

Provide the values in the following JSON format:

\`\`\`json
{
    "chainId": "ethereum",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "include_market_cap": true
}
\`\`\`

### Example Requests and Responses:

**Example request**: "What's the price of USDC on Ethereum? Address: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
**Example response**:
\`\`\`json
{
    "chainId": "ethereum",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "include_market_cap": true
}
\`\`\`

**Example request**: "Check the price for this token on Polygon: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
**Example response**:
\`\`\`json
{
    "chainId": "polygon",
    "tokenAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "include_market_cap": true
}
\`\`\`

**Example request**: "Get price for BONK token on Solana with address HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
**Example response**:
\`\`\`json
{
    "chainId": "solana",
    "tokenAddress": "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
}
\`\`\`

### Instructions:
Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, use the last question made and if the request is for token price data and includes both a chain and address, extract the appropriate parameters and respond with a JSON object. If the request is not related to token price data or missing required information (chainId or tokenAddress), respond with null.
`;

