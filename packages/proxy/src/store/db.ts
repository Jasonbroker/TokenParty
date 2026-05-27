import Database from "better-sqlite3";
import path from "node:path";
import { getConfig } from "../config.js";

let db: Database.Database;

export function initDb(): Database.Database {
  const config = getConfig();
  const dbPath = path.resolve(process.cwd(), config.server.dataDir, "tokenparty.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  runMigrations(db);
  return db;
}

export function getDb(): Database.Database {
  return db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_daily (
      date TEXT NOT NULL,
      token_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model TEXT NOT NULL,
      request_count INTEGER DEFAULT 0,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      PRIMARY KEY (date, token_id, provider_id, model)
    );

    CREATE TABLE IF NOT EXISTS request_index (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      token_id TEXT,
      provider_id TEXT,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      latency_ms INTEGER,
      status INTEGER,
      log_file TEXT NOT NULL,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_request_timestamp ON request_index(timestamp);
    CREATE INDEX IF NOT EXISTS idx_request_token ON request_index(token_id);
    CREATE INDEX IF NOT EXISTS idx_request_provider ON request_index(provider_id);
  `);
}
