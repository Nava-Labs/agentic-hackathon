import type { Plugin } from "@elizaos/core";
import { getTodaysAlpha } from "./actions/index.ts";

export const alphaPlugin: Plugin = {
  name: "alphaPlugin",
  description:
    "Fetch tweets from a specific Twitter user's account when asked by the user.",
  actions: [getTodaysAlpha],
};

export default alphaPlugin;
