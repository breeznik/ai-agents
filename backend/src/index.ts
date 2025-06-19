// @ts-nocheck
import dotenv from "dotenv";
import { McpService } from "./service/mcp.service";
import express from 'express';
import cors from 'cors';

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
app.post("/messages", (req, res) => mcpService.handlePostMessage(req, res));
app.get("/test", (req, res) => {
    res.json({ status: "ok", message: "Logger works!" });
});

app.listen(3000, () => {
    console.log("Server listening on port 3000");
});
