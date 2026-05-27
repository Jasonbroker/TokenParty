import fs from "node:fs";
import path from "node:path";
import { getConfig } from "../config.js";

export interface LogEntry {
  type: "request" | "response";
  timestamp: number;
  headers?: Record<string, string>;
  body?: unknown;
  streaming?: boolean;
  streamContent?: string;
  usage?: { input_tokens: number; output_tokens: number };
  error?: string;
}

export function writeLog(requestId: string, entry: LogEntry): string {
  const config = getConfig();
  const date = new Date(entry.timestamp).toISOString().split("T")[0];
  const dir = path.resolve(process.cwd(), config.server.logDir, date);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${requestId}.jsonl`;
  const filepath = path.join(dir, filename);
  fs.appendFileSync(filepath, JSON.stringify(entry) + "\n");

  return `${date}/${filename}`;
}

export function readLog(logFile: string): LogEntry[] {
  const config = getConfig();
  const filepath = path.resolve(process.cwd(), config.server.logDir, logFile);
  if (!fs.existsSync(filepath)) return [];
  const lines = fs.readFileSync(filepath, "utf-8").trim().split("\n");
  return lines.map((line) => JSON.parse(line));
}

export function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
