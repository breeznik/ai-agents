import express from "express";
import {
  McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse";
import cors from "cors";
import { z } from "zod";
import { getLounge, getSchedule } from "./tools/tools";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});



server.tool(
  "add",
  "This function let's you add two numeric values",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);

server.tool("getLounge", "this tool provides you the lounge namees to be selected", {}, async () => {
  const lounges = await getLounge();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(lounges),
      },
    ],
  };
});

server.tool(
  "get_schedule",
  "this tool is provides you schedule for flight",
  {
    airportid: z.string(),
    direction: z.string(),
    traveldate: z.string().regex(/^\d{8}$/, {
      message: "traveldate must be in yyyymmdd format (e.g. 20250531)",
    }),
  },
  async ({ airportid, direction, traveldate }) => {
    const data = await getSchedule({
      airportid: airportid,
      direction: direction,
      traveldate,
    });
    let flightschedule = data.flightschedule;
    return {
      content: [
        // @ts-ignore
        { type: "text", text: `${JSON.stringify(flightschedule)}` },
      ],
    };
  }
);

let transport: SSEServerTransport | null = null;

app.get("/sse", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  console.log("sse request recived", req);
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

app.listen(3000, () => console.log(`started listening on port 3000`));
