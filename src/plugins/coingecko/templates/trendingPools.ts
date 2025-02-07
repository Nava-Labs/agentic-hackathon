export const getTrendingPoolsTemplate = `
Determine if this is a request for trending pools. If it is, perform the corresponding action based on the following situations:

### Situation 1: "Get all trending pools"
- **Message contains**: Phrases like "all trending pools", "show all pools", "list all pools".
- **Example**: "Show me all trending pools" or "List all pools".
- **Action**: Set \`limit = 100\`.

### Situation 2: "Get specific number of pools"
- **Message contains**: A number followed by "pools" or "top" followed by a number and "pools".
- **Example**: "Show top 5 pools" or "Get me 20 trending pools".
- **Action**: Set \`limit = specified number\`.

### Situation 3: "Default trending pools request"
- **Message contains**: General phrases like "trending pools", "hot pools", "popular pools".
- **Example**: "What are the trending pools?" or "Show me hot pools".
- **Action**: Set \`limit = 10\`.

For all situations, respond with a JSON object in the following format:
\`\`\`json
{
    "limit": number
}
\`\`\`

### Example Request and Response:

**Example request**: "Show me all trending pools"
**Example response**:
\`\`\`json
{
    "limit": 100
}
\`\`\`

**Example request**: "Get me 5 top trending pools"
**Example response**:
\`\`\`json
{
    "limit": 5
}
\`\`\`

**Example request**: "What are the trending pools?"
**Example response**:
\`\`\`json
{
    "limit": 10
}
\`\`\`

### Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

