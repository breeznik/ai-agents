import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpService } from "./mcpService";
import astraRouter from "./router/astra.route";
import { responseLogger } from "./middleware/responseLogger";
import { connectDB } from "./config/db";

dotenv.config();

const app = express();
await connectDB();

export const mcpService = new McpService();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(responseLogger);
app.get("/sse", (req, res) => mcpService.handleSSE(req, res));
app.use("/api/context", express.json(), astraRouter);
app.post("/messages", (req, res) => mcpService.handlePostMessage(req, res));
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "Logger works!" });
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
