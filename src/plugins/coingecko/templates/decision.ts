export const getDecisionTemplate = `
Extract the following parameters for investment decision analysis:
- **coinId** (string): The ID/symbol of the cryptocurrency to analyze
- **vs_currency** (string, optional): Target currency for price data (default: "usd")
- **include_market_cap** (boolean, optional): Include market cap data (default: true)
- **include_24hr_vol** (boolean, optional): Include 24h volume data (default: true)
- **include_24hr_change** (boolean, optional): Include 24h price change data (default: true)

The analysis will result in one of three decisions:
- BUY: Strong trending indicators + price stability + sufficient market cap
- HOLD: Mixed signals or unclear trends
- AVOID: Weak market presence or high volatility

Provide the values in the following JSON format:

\`\`\`json
{
    "coinId": "<coin_id>",
    "vs_currency": "<currency>",
    "include_market_cap": true,
    "include_24hr_vol": true,
    "include_24hr_change": true
}
\`\`\`

Example request: "Should I invest in Bitcoin right now?"
Example response:
\`\`\`json
{
    "coinId": "bitcoin",
    "vs_currency": "usd",
    "include_market_cap": true,
    "include_24hr_vol": true,
    "include_24hr_change": true
}
\`\`\`

Example request: "Is ETH a good buy today?"
Example response:
\`\`\`json
{
    "coinId": "ethereum",
    "vs_currency": "usd",
    "include_market_cap": true,
    "include_24hr_vol": true,
    "include_24hr_change": true
}
\`\`\`

Decision Criteria:
- Trending Score: Based on presence in trending lists
- Stability Score: Based on 24h price volatility
- Market Cap Score: Based on minimum market cap threshold
- Overall Score: Combined weighted average of all scores

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for an investment decision/recommendation, extract the appropriate parameters and respond with a JSON object. If the request is not related to investment decisions, respond with null.`;
