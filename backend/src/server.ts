import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpService } from "./mcpService";
import astraRouter from "./router/astra.route";

dotenv.config();

const app = express();

export const mcpService = new McpService();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.get("/sse", (req, res) => mcpService.handleSSE(req, res));
app.use("/api/context", express.json(), astraRouter);
app.post("/messages", (req, res) => mcpService.handlePostMessage(req, res));


app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
