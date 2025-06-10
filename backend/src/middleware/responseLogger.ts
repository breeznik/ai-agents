import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM-compatible __dirname
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

export const responseLogger = (req: Request, res: Response, next: NextFunction) => {
  // Deep copy of req.body for logging only, do not mutate req.body
  const requestCopy = JSON.parse(JSON.stringify(req.body || {}));

  // We cannot get response body here without patching, so just log after response finished
  res.on("finish", () => {
    // Note: no response body here, so pass empty or placeholder
    const log = formatLog({
      type: "RESPONSE",
      req,
      resBody: "[Response body logging requires manual call in handler]",
      statusCode: res.statusCode,
    });

    fs.appendFile(logFilePath, log, err => {
      if (err) console.error("Failed to write log:", err);
    });
  });

  next();
};
