import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const client = new MultiServerMCPClient({
    mcpServers: {
        "mcp_obi": {
            "command": "bun",
            "args": ["run", "src/mcp/std.server.ts"],
            "transport": "stdio"
        }
    }
})


// const llm = new ChatOpenAI({ temperature: 0.3, modelName: "gpt-4o-mini" });
export const mcpTools = await client.getTools();

