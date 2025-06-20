import { McpService } from "@/service/mcp.service";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function stdio() {
    const service = new McpService();

    // Start stdio transport
    const transport = new StdioServerTransport();
    service.registerStdTransport("stdio", transport);

    // ❗ Connect the server to the stdio transport
    service.server.connect(transport); // <-- This is the missing line

    process.stdin.resume();
    console.log("MCP stdio server running...");
}

stdio().catch(console.error);
