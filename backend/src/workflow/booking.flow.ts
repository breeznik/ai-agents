import { ChatOpenAI } from "@langchain/openai";
import { mcpTools } from "./mcp.client";

// --- LLM Setup ---
const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o",
}).bindTools(mcpTools);

const messageObj = (role: string, input: string) => ({ role, content: input });

const testing = await llm.invoke([messageObj("user", "would you please share the tool information do you have")]);
console.log(testing.content)