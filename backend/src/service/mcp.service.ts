import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { contactTool, paymentTool, reservationTool, scheduleTool } from "@/tools/tool.definition";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { contactSchema, paymentSchema, reservationSchema, scheduleSchema } from "@/utils/types";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export class McpService {
    public server: McpServer;

    private transports = {
        streamable: {} as Record<string, StreamableHTTPServerTransport>,
        sse: {} as Record<string, SSEServerTransport>,
        std: {} as StdioServerTransport
    };

    constructor() {
        this.server = new McpServer({
            name: "mcp_server",
            version: "1.0.0",
        });

        this.registerTools();
    }

    private registerTools() {

        this.server.tool(
            scheduleTool.name,
            scheduleTool.description,
            scheduleTool.paramsSchema,
            async (args: scheduleSchema) => {
                const result = await scheduleTool.cb(args);
                return {
                    content: result.content as [ContentBlock]
                };
            }
        );
        this.server.tool(
            reservationTool.name,
            reservationTool.description,
            reservationTool.paramsSchema,
            async (args: any, extra: any) => {
                const result = await reservationTool.cb(args);
                return {
                    content: result.content as [ContentBlock]
                };
            }
        );
        this.server.tool(
            contactTool.name,
            contactTool.description,
            contactTool.paramsSchema,
            async (args: contactSchema) => {
                const result = await contactTool.cb(args);
                return {
                    content: result.content as [ContentBlock]
                };
            }
        );
        this.server.tool(
            paymentTool.name,
            paymentTool.description,
            paymentTool.paramsSchema,
            async (args: any) => {
                const result = await paymentTool.cb(args);
                return {
                    content: result.content as [ContentBlock]
                };
            }
        );
    }

    public async registerStdTransport() {
        // std is unidrection  , not a statful protocol with sessiond handling , so no session setup required
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log("✅ MCP server connected over stdio");
    }

    async handleSSE(req: any, res: any) {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        const transport = new SSEServerTransport("/messages", res);
        console.log('sse connnection : ', transport.sessionId);
        this.transports.sse[transport.sessionId] = transport;
        this.server.connect(transport);
        console.log('server connected to frontend via sse')
    }


    handlePostMessage(req: any, res: any) {
        const sessionId = req.query.sessionId as string;
        const transport = this.transports.sse[sessionId];
        if (transport) {
            transport.handlePostMessage(req, res);
        } else {
            res.status(400).send("SSE connection not established");
        }
    }
}
