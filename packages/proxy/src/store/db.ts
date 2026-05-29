import Database from "better-sqlite3";
import path from "node:path";
import { getConfig } from "../config.js";

let db: Database.Database;

export function initDb(): Database.Database {
  const config = getConfig();
  const dbPath = path.join(config.server.dataDir, "tokenparty.db");
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
      cache_input_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
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
      cache_input_tokens INTEGER DEFAULT 0,
      latency_ms INTEGER,
      status INTEGER,
      log_file TEXT NOT NULL,
      error TEXT,
      api_key_index INTEGER DEFAULT 0,
      cost REAL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_request_timestamp ON request_index(timestamp);
    CREATE INDEX IF NOT EXISTS idx_request_token ON request_index(token_id);
    CREATE INDEX IF NOT EXISTS idx_request_provider ON request_index(provider_id);
  `);

  const columns = db.prepare(`PRAGMA table_info(request_index)`).all() as { name: string }[];
  const colNames = new Set(columns.map((c) => c.name));
  if (!colNames.has("api_key_index")) {
    db.exec(`ALTER TABLE request_index ADD COLUMN api_key_index INTEGER DEFAULT 0`);
  }
  if (!colNames.has("cost")) {
    db.exec(`ALTER TABLE request_index ADD COLUMN cost REAL DEFAULT 0`);
  }
  if (!colNames.has("cache_input_tokens")) {
    db.exec(`ALTER TABLE request_index ADD COLUMN cache_input_tokens INTEGER DEFAULT 0`);
  }

  const dailyCols = db.prepare(`PRAGMA table_info(usage_daily)`).all() as { name: string }[];
  const dailyColNames = new Set(dailyCols.map((c) => c.name));
  if (!dailyColNames.has("cost")) {
    db.exec(`ALTER TABLE usage_daily ADD COLUMN cost REAL DEFAULT 0`);
  }
  if (!dailyColNames.has("cache_input_tokens")) {
    db.exec(`ALTER TABLE usage_daily ADD COLUMN cache_input_tokens INTEGER DEFAULT 0`);
  }
}
