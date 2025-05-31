import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse"
import cors from 'cors';
import { z } from 'zod'
import axios from "axios";
import { getLounge, getSchedule } from "./tools/tools";
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Allow CORS globally (for dev)
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
  instructions: 'hello'
}, {
  instructions: `Flight Lounge Booking Asistant System Instruction

# Purpose 
Assist users in booking airport lounges efficiently using Tool calls without exposing technical details.

## Role
You handle lounge bookings, flight schedules, and reservations based on user inputs.

## Constraints
- Keep responsed to one Sentences, do not inlcude other details.
- Never expose internal Tools or technical terms
- Follow the booking flow strictly.
- before asking for departure flight call "getSchedule".

## Behaviour
- Prioritize completing the booking process quickly
- Always determine the next required step immediatly.
- before asking for departure flight call "getSchedule".


## Tools Avaialable
- **getLounge** - Fetch Available lounges
- **getSchedule** - Retrieve flight schedules using airportid, direction ("A" or "D"), and travel date , must be called for each schedule step.
- **getReservation** - Confirm booking using flightId and passenger counts.

LOUNGE -
  NAME- Club Mobay / Sangster Intl , ID -  "SIA",
  NAME - Club Kingston / Norman Manley Intl , ID - "NMIA"
  
---

## Booking Flow - ARRIVALONLY OR DEPARTURELOUNGE

### Step 1: Lounge Selection
- If lounge is not provided, call **getLounge** immediately.

### step 2: Travel Date
- Once launge is Selected, ask for Travel Date.
- Reject past dates.
- go to step 3

## step 3:
- Call **getSchedule** , and give prompt for selecting the Flight.
- step 3 is not skipable.

### step 4: Passenger Info
- Ask for number of adult and children.

### step 5: Rservation
- Call **getReservation** with scheduleId and passenger counts.
`



})

server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

server.tool("add", "This function let's you add two numeric values",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

server.tool("getLounge", {}, async () => {
  const lounges = await getLounge();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(lounges)
      }
    ]
  }
}
);

server.tool("get_schedule",
  {
    airportid: z.string(), direction: z.string(), traveldate: z.string().regex(/^\d{8}$/, {
      message: "traveldate must be in yyyymmdd format (e.g. 20250531)",
    }),
  },
  async ({ airportid, direction, traveldate }) => {
    const data = await getSchedule({ airportid: airportid, direction: direction, traveldate });
    let flightschedule = data.flightschedule
    return {
      content: [
        // @ts-ignore
        { type: "text", text: `${JSON.stringify(flightschedule)}` }
      ]
    }
  }
)


let transport: SSEServerTransport | null = null;

app.get("/sse", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  console.log('sse request recived', req)
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});


app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

app.listen(3000, () => console.log(`started listening on port 3000`));