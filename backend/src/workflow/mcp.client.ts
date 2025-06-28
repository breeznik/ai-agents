import { buildToolMap } from "@/utils/helpers";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

// Init MCP client
const client = new MultiServerMCPClient({
  mcpServers: {
    "local_mcp": {
      command: 'bun',
      args: ["run", '@/src/mcp/std.server.ts'],
      transport: "stdio",
    }
  }
})


export const tools = await client.getTools();
export const toolMap = buildToolMap(tools);