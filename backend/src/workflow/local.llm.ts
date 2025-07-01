import { ChatOllama } from "@langchain/ollama";

export const localLLM = new ChatOllama({
    model: "gemma3:4b",
    temperature: 0,
});
