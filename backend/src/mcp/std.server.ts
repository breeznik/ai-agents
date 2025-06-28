import { McpService } from "@/service/mcp.service";

async function stdio() {
    const service = new McpService();
    await service.registerStdTransport()
    console.log(
        "Server is conencted : ",
        service.server.isConnected()
    )
}

stdio().catch(console.error);

