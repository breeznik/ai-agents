import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse";
import { z } from "zod";
import { getLounge, getSchedule } from "./utils/tools";

export class McpService {
    private server: McpServer;
    private transport: SSEServerTransport | null = null;

    constructor() {
        this.server = new McpServer({
            name: "mcp_server",
            version: "1.0.0",
        });

        this.registerTools();
    }

    private registerTools() {
        this.server.tool(
            "add",
            "This function let's you add two numeric values",
            { a: z.number(), b: z.number() },
            async ({ a, b }) => ({
                content: [{ type: "text", text: String(a + b) }],
            })
        );

        this.server.tool(
            "getLounge",
            "this tool provides you the lounge names to be selected",
            {},
            async () => {
                const lounges = await getLounge();
                return {
                    content: [{ type: "text", text: JSON.stringify(lounges) }],
                };
            }
        );

        this.server.tool(
            "get_schedule",
            "this tool provides you the schedule for flights",
            {
                airportid: z.string(),
                direction: z.string(),
                traveldate: z.string().regex(/^\d{8}$/, {
                    message: "traveldate must be in yyyymmdd format (e.g. 20250531)",
                }),
            },
            async ({ airportid, direction, traveldate }) => {
                const data = await getSchedule({ airportid, direction, traveldate });
                return {
                    content: [{ type: "text", text: JSON.stringify(data.flightschedule) }],
                };
            }
        );
    }

    handleSSE(req: any, res: any) {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        console.log("SSE request received" , req)
        this.transport = new SSEServerTransport("/messages", res);
        this.server.connect(this.transport);
    }

    handlePostMessage(req: any, res: any) {
        if (this.transport) {
            this.transport.handlePostMessage(req, res);
        } else {
            res.status(400).send("SSE connection not established");
        }
    }
}
