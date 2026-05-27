import { getDb } from "../store/db.js";

export interface RequestRecord {
  id: string;
  tokenId: string;
  providerId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: number;
  logFile: string;
  error?: string;
}

export function recordRequest(record: RequestRecord) {
  const db = getDb();
  const now = Date.now();
  const date = new Date(now).toISOString().split("T")[0];

  db.prepare(`
    INSERT INTO request_index (id, timestamp, token_id, provider_id, model, input_tokens, output_tokens, latency_ms, status, log_file, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id, now, record.tokenId, record.providerId, record.model,
    record.inputTokens, record.outputTokens, record.latencyMs,
    record.status, record.logFile, record.error ?? null
  );

  db.prepare(`
    INSERT INTO usage_daily (date, token_id, provider_id, model, request_count, input_tokens, output_tokens)
    VALUES (?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(date, token_id, provider_id, model)
    DO UPDATE SET
      request_count = request_count + 1,
      input_tokens = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens
  `).run(date, record.tokenId, record.providerId, record.model, record.inputTokens, record.outputTokens);
}
