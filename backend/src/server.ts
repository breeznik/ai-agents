import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse"
import cors from 'cors';
import { z } from 'zod'
import axios from "axios";
const app = express();

// Allow CORS globally (for dev)
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});

//get schedule api
server.tool("get_todo",
  { id: z.number() },
  async ({ id }) => {
    console.log('inside request', id)
    const response = await axios.get(`https://jsonplaceholder.typicode.com/todos/${id}`);
    console.log('await resolved ', response.data)
    return {
      content: [
        // @ts-ignore
        { type: "text", text: String(response.data.title) }
      ]
    }
  }
)

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

server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

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