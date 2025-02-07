import { composeContext, elizaLogger, generateObject, ModelClass } from "@elizaos/core";
import type { Action, HandlerCallback, IAgentRuntime, Memory, State, Content } from "@elizaos/core";
import { getAlphaTemplate } from "../templates/alpha";
import { z } from "zod";


export const GetTrendingSchema = z.object({
  symbol: z.string().optional(),
  price: z.number().optional(),
  contract_address: z.string().optional(),
});

export type GetTrendingContent = z.infer<typeof GetTrendingSchema> & Content;

export const isGetTrendingContent = (obj: unknown): obj is GetTrendingContent => {
  return GetTrendingSchema.safeParse(obj).success;
};



export const getTodaysAlpha: Action = {
  name: "TODAYS_ALPHA",
  description: "Fetch recent tweets from a specific Twitter user",
  similes: ["ALPHA", "GET_ALPHA", "GET_TODAYS_ALPHA"],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    const rapidApiKey = process.env.RAPID_API_KEY;
    if (!rapidApiKey) {
      throw new Error("RAPID_API_KEY environment variable is not set");
    }
    return false;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback: HandlerCallback
  ): Promise<boolean> => {
    async function getCurrentNews(searchTerm: string) {
      try {
        // Extract username from input
        const usernameMatch = searchTerm.match(/@(\w+)/);
        if (!usernameMatch) {
          console.error("Please provide a Twitter username with @ symbol (e.g., @username)");
          return false;
        }

        const username = usernameMatch[1];
        const RAPID_API_KEY = process.env.RAPID_API_KEY;


        if (!RAPID_API_KEY) {
          console.error("RAPID_API_KEY environment variable is not set");
          return false;
        }

        // let currentState = state;
        // if (!currentState) {
        //   currentState = (await runtime.composeState(message)) as State;
        // } else {
        //   currentState = await runtime.updateRecentMessageState(currentState);
        // }


        // elizaLogger.log("Composing alpha context...");
        // const alphaContext = composeContext({
        //   state: currentState,
        //   template: getAlphaTemplate,
        // });

        // elizaLogger.log("Generating content from template...");

        // const result = await generateObject({
        //   runtime,
        //   context: alphaContext,
        //   modelClass: ModelClass.LARGE,
        //   // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        //   schema: GetTrendingSchema as any
        // });

        // if (!isGetTrendingContent(result.object)) {
        //   elizaLogger.error("Invalid trending request format");
        //   return false;
        // }

        // Fetch user tweets using RapidAPI
        const response = await fetch(
          `https://twitter154.p.rapidapi.com/user/tweets?username=${username}&include_replies=false&include_pinned=false`,
          {
            headers: {
              'X-RapidAPI-Key': RAPID_API_KEY,
              // 'X-RapidAPI-Host': 'twitter241.p.rapidapi.com'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.error("Authentication failed. Please check your RapidAPI key.")
            return false;
          }
          if (response.status === 404) {
            console.error("Twitter user not found.")
            return false;
          }
          console.error(`HTTP error! status: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Extract tweets from the results array
        const tweets = data.results?.map(tweet => ({
          created_at: tweet.creation_date,
          text: tweet.text,
          id: tweet.tweet_id,
          // Additional metadata if needed
          favorite_count: tweet.favorite_count,
          retweet_count: tweet.retweet_count,
          reply_count: tweet.reply_count,
          quote_count: tweet.quote_count,
          views: tweet.views,
          user: {
            name: tweet.user.name,
            username: tweet.user.username,
            profile_image_url: tweet.user.profile_pic_url
          }
        })) || [];

        if (!tweets || tweets.length === 0) {
          console.error(`No recent tweets found from @${username}.`);
          return false;
        }

        // Format the response - taking only the first 5 tweets
        const formattedTweets = tweets
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          .map((tweet: any) => {
            const date = new Date(tweet.created_at).toLocaleDateString();
            return `[${date}] ${tweet.text}\n`;
          })
          .join("\n");


        if (callback) {
          callback({
            text: `Recent tweets from @${username}:\n\n${formattedTweets}`,
            content: {
              trending: tweets,
              timestamp: new Date().toISOString()
            }
          });
        }


        console.log('Parsed Tweets >>>>', formattedTweets);
        return true;
      } catch (error) {
        const errorMessage = error.response?.status === 429 ?
          "Rate limit exceeded. Please try again later." :
          `Error fetching trending data: ${error.message}`;

        if (callback) {
          callback({
            text: errorMessage,
            content: {
              error: error.message,
              statusCode: error.response?.status
            },
          });
        }

        return false;
      }
    }
    const searchTerm = message.content.text;
    return await getCurrentNews(searchTerm);
  },
  examples: [
    [
      {
        "user": "{{user1}}",
        "content": {
          "text": "Show me tweets from @elonmusk"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check @elonmusk tweets for you",
          action: "TODAYS_ALPHA",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the some alpha we gathered: \n{{dynamic}}",
        },
      },

    ],
  ],
};
