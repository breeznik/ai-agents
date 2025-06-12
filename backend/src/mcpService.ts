import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse";
import { z } from "zod";
import { getLounge ,getSchedule , processPayment, reserveCart, setContact } from "./utils/tools";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import ControllerModel from "./models/controller.model";
export class McpService {
    private server: McpServer;

    private transports = {
        streamable: {} as Record<string, StreamableHTTPServerTransport>,
        sse: {} as Record<string, SSEServerTransport>
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
            "getLounge",
            "this tool provides you the lounge names to be selected",
            {},
            async () => {
                const transportkeys = Object.keys(this.transports.sse)
                const sessionId = transportkeys[transportkeys?.length - 1];
                console.log('current session id : ', sessionId)
                const lounges = await getLounge({ sessionId });
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
                flightId: z.string(),
            },
            async ({ airportid, direction, traveldate, flightId }) => {
                const transportKeys = Object.keys(this.transports.sse);
                const sessionId = transportKeys[transportKeys.length - 1]; // fallback if needed

                const data = await getSchedule({
                    sessionId,
                    airportid,
                    direction,
                    traveldate,
                    flightId,
                });

                return {
                    content: [{ type: "text", text: JSON.stringify(data) }],
                };
            }
        );

        this.server.tool(
            "get_reservation",
            "this tool is used to determine if product can be reserved or if it's in standby",
            {
                adulttickets: z.number(),
                childtickets: z.number(),
                productid: z.enum(["DEPARTURELOUNGE", "ARRIVALONLY", "ARRIVALBUNDLE"]),
            },
            async ({ adulttickets, childtickets, productid, }) => {
                try {
                    const transportkeys = Object.keys(this.transports.sse)
                    const sessionId = transportkeys[transportkeys?.length - 1];
                    console.log('researvation called with session ', sessionId)
                    const data = await reserveCart({ sessionId, adulttickets, childtickets, productid });
                    return {
                        content: [{ type: "text", text: JSON.stringify(data) }],
                    };
                } catch (error) {
                    console.error(error)
                    return {
                        content: [{ type: "text", text: JSON.stringify(error) }],
                    }
                }
            }
        );

        this.server.tool(
            "set_contact_details",
            "this tool is used to set contact information to contact through passenger",
            {
                email: z.string(),
                firstname: z.string(),
                lastname: z.string(),
                phone: z.string(),
            },
            async ({ email, firstname, lastname, phone, }) => {
                try {
                    const transportkeys = Object.keys(this.transports.sse)
                    const sessionId = transportkeys[transportkeys?.length - 1];
                    const data = await setContact({ sessionId, email, firstname, lastname, phone });
                    return {
                        content: [{ type: "text", text: JSON.stringify(data) }],
                    };
                } catch (error) {
                    console.error(error)
                    return {
                        content: [{ type: "text", text: JSON.stringify(error) }],
                    };
                }
            }
        );
        this.server.tool(
            "payment",
            "this tool is used for payments",
            {
                cardHolder: z.string(),
                cardNumber: z.number(),
                cardType: z.enum(["VISA", "MASTERCARD", "AMEX"]),
                cvv: z.number(),
                expiryDate: z.number(),
                email: z.string(),
            },
            async ({cardHolder,
                cardNumber,
                cardType,
                cvv,
                expiryDate,
                email, }) => {
                try {

                    const transportkeys = Object.keys(this.transports.sse)
                    const sessionId = transportkeys[transportkeys?.length - 1];
                    const data = await processPayment({
                        sessionId, cardHolder,
                        cardNumber,
                        cardType,
                        cvv,
                        expiryDate,
                        email,
                    });
                    return {
                        content: [{ type: "text", text: JSON.stringify(data) }],
                    };
                } catch (error) {
                    console.error(error)
                    return {
                        content: [{ type: "text", text: JSON.stringify(error) }],
                    };
                }
            }
        );
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
