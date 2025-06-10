import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Request } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFilePath = path.join(logDir, "requests-responses.log");

function formatLog({ type, req, resBody, statusCode }: any) {
  return [
    `--- ${type.toUpperCase()} ---`,
    `Time       : ${new Date().toISOString()}`,
    `Method     : ${req.method}`,
    `URL        : ${req.originalUrl}`,
    `Status     : ${statusCode}`,
    `Headers    : ${JSON.stringify({
      host: req.headers.host,
      userAgent: req.headers["user-agent"],
      accept: req.headers.accept,
    }, null, 2)}`,
    `Request    : ${JSON.stringify(req.body || {}, null, 2)}`,
    `Response   : ${typeof resBody === "string" ? resBody : JSON.stringify(resBody, null, 2)}`,
    `-------------------------------\n`
  ].join("\n");
}

// Call this in your handlers just before sending response
export function logResponseBody(req: Request, resBody: any, statusCode: number) {
  const log = formatLog({
    type: "RESPONSE",
    req,
    resBody,
    statusCode,
  });

  fs.appendFile(logFilePath, log, err => {
    if (err) console.error("Failed to write log:", err);
  });
}
