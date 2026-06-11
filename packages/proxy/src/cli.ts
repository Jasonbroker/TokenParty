#!/usr/bin/env node
import { serve } from "@hono/node-server";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { loadConfig, watchConfig } from "./config.js";
import { initDb, getValidAdminToken, getAdminTokenInfo, createAdminToken } from "./store/db.js";
import { cleanupLogs } from "./store/log-writer.js";
import { createServer } from "./server.js";

const args = process.argv.slice(2);
const homeDir = path.join(os.homedir(), ".tokenparty");
const pidFile = path.join(homeDir, "tokenparty.pid");
const logFile = path.join(homeDir, "logs", "daemon.log");

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: tokenparty [options]

Options:
  --port <port>      Port to listen on (default: 3456)
  --host <host>      Host to bind (default: 0.0.0.0)
  --config <path>    Path to config.yaml (default: ~/.tokenparty/config.yaml)
  --token            Show current admin token
  --daemon           Start in background (daemon mode)
  --stop             Stop the background service
  --status           Check if the background service is running
  --log              Show daemon log output
  -h, --help         Show this help message
  -v, --version      Show version

Data is stored in ~/.tokenparty/ (config, logs, database).
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  const pkgPath = path.resolve(import.meta.dirname, "../package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  console.log(`tokenparty v${pkg.version}`);
  process.exit(0);
}

fs.mkdirSync(homeDir, { recursive: true });
fs.mkdirSync(path.dirname(logFile), { recursive: true });

function readPid(): number | null {
  try {
    const pid = parseInt(fs.readFileSync(pidFile, "utf-8").trim(), 10);
    if (isNaN(pid)) return null;
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

function writePid(pid: number) {
  fs.writeFileSync(pidFile, String(pid));
}

function removePid() {
  try { fs.unlinkSync(pidFile); } catch {}
}

// --- --status ---
if (args.includes("--status")) {
  const pid = readPid();
  if (pid) {
    console.log(`tokenparty is running (PID: ${pid})`);
  } else {
    console.log("tokenparty is not running");
  }
  process.exit(0);
}

// --- --stop ---
if (args.includes("--stop")) {
  const pid = readPid();
  if (!pid) {
    console.log("tokenparty is not running");
    process.exit(0);
  }
  try {
    process.kill(pid, "SIGTERM");
    console.log(`tokenparty stopped (PID: ${pid})`);
    removePid();
  } catch (e: any) {
    console.error(`Failed to stop process ${pid}: ${e.message}`);
    removePid();
  }
  process.exit(0);
}

// --- --log ---
if (args.includes("--log")) {
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, "utf-8").split("\n");
    console.log(lines.slice(-50).join("\n"));
  } else {
    console.log("No daemon log found");
  }
  process.exit(0);
}

// --- --daemon ---
if (args.includes("--daemon")) {
  const existing = readPid();
  if (existing) {
    console.log(`tokenparty is already running (PID: ${existing})`);
    console.log("Use --stop to stop it first, or --status to check.");
    process.exit(1);
  }

  const daemonArgs = process.argv.slice(1).filter((a) => a !== "--daemon");
  const out = fs.openSync(logFile, "a");

  const child = spawn(process.execPath, daemonArgs, {
    detached: true,
    stdio: ["ignore", out, out],
    env: { ...process.env, TOKENPARTY_DAEMON: "1" },
  });

  child.unref();
  writePid(child.pid!);
  console.log(`tokenparty started in background (PID: ${child.pid})`);
  console.log(`Log: ${logFile}`);
  process.exit(0);
}

// --- Normal startup ---

const configPath = getArg("config") ?? path.join(homeDir, "config.yaml");
const config = loadConfig(configPath);

const port = getArg("port") ? Number(getArg("port")) : config.server.port;
const host = getArg("host") ?? config.server.host;

initDb();

if (args.includes("--token")) {
  let token = getValidAdminToken();
  if (!token) token = createAdminToken();
  const info = getAdminTokenInfo()!;
  console.log(`Admin token: ${info.token}`);
  console.log(`Expires:     ${new Date(info.expires_at).toISOString().slice(0, 10)}`);
  process.exit(0);
}

function ensureAdminToken() {
  let token = getValidAdminToken();
  if (!token) {
    token = createAdminToken();
    console.log(`[tokenparty] New admin token generated`);
  }
  const info = getAdminTokenInfo()!;
  console.log(`[tokenparty] Admin token: ${info.token} (expires: ${new Date(info.expires_at).toISOString().slice(0, 10)})`);
}

ensureAdminToken();

// Write PID for daemon mode detection (restart support)
if (process.env.TOKENPARTY_DAEMON === "1") {
  writePid(process.pid);
}

{
  const result = cleanupLogs();
  if (result.deletedDays.length > 0) {
    console.log(`[tokenparty] Log cleanup: deleted ${result.deletedDays.length} day(s), freed ${result.freedMB}MB`);
  }
}

const app = createServer();

watchConfig((newConfig) => {
  console.log(`[tokenparty] Config reloaded`);
});

serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  const addr = info.address === "0.0.0.0" ? "localhost" : info.address;
  console.log(`[tokenparty] Proxy running at http://${addr}:${info.port}`);
  console.log(`[tokenparty] Dashboard:          http://${addr}:${info.port}/`);
  console.log(`[tokenparty] OpenAI endpoint:    /v1/*`);
  console.log(`[tokenparty] Anthropic endpoint: /anthropic/*`);
  console.log(`[tokenparty] Config:             ${configPath}`);
});
