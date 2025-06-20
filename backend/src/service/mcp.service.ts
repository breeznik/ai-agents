import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { contactTool, reservationTool, scheduleTool } from "@/tools/tool.definition";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { contactSchema, reservationSchema, scheduleSchema } from "@/utils/types";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export class McpService {
    public server: McpServer;

    private transports = {
        streamable: {} as Record<string, StreamableHTTPServerTransport>,
        sse: {} as Record<string, SSEServerTransport>,
        std: {} as Record<string, StdioServerTransport>
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
            async (args: reservationSchema, extra: any) => {
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




        // this.server.tool(
        //     "payment",
        //     "this tool is used for payments",
        //     {
        //         cardHolder: z.string(),
        //         cardNumber: z.number(),
        //         cardType: z.enum(["VISA", "MASTERCARD", "AMEX"]),
        //         cvv: z.number(),
        //         expiryDate: z.number(),
        //         email: z.string(),
        //     },
        //     async ({ cardHolder,
        //         cardNumber,
        //         cardType,
        //         cvv,
        //         expiryDate,
        //         email, }) => {
        //         try {

        //             const transportkeys = Object.keys(this.transports.sse)
        //             const sessionId = transportkeys[transportkeys?.length - 1];

        //             const data = await processPayment({
        //                 sessionId, cardHolder,
        //                 cardNumber,
        //                 cardType,
        //                 cvv,
        //                 expiryDate,
        //                 email,
        //             });
        //             return {
        //                 content: [{ type: "text", text: JSON.stringify(data) }],
        //             };
        //         } catch (error) {
        //             console.error(error)
        //             return {
        //                 content: [{ type: "text", text: JSON.stringify(error) }],
        //             };
        //         }
        //     }
        // );
    }

    public registerStdTransport(sessionId: string, transport: StdioServerTransport) {
        this.transports.std[sessionId] = transport;
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

    async handleStd(req: any, res: any) {
        const transport = new StdioServerTransport(req, res);
        // Generate a unique session ID for stdio transport
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.transports.std[sessionId] = transport;
        this.server.connect(transport)
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
