import { getDb } from "../store/db.js";

export interface RequestRecord {
  id: string;
  tokenId: string;
  providerId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheInputTokens?: number;
  latencyMs: number;
  status: number;
  logFile: string;
  error?: string;
  apiKeyIndex?: number;
  pricing?: { inputPrice?: number; outputPrice?: number; cacheInputPrice?: number };
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  cacheInputTokens: number,
  pricing?: { inputPrice?: number; outputPrice?: number; cacheInputPrice?: number }
): number {
  if (!pricing) return 0;
  const nonCachedInput = Math.max(0, inputTokens - cacheInputTokens);
  const inputCost = (nonCachedInput / 1_000_000) * (pricing.inputPrice ?? 0);
  const cacheCost = (cacheInputTokens / 1_000_000) * (pricing.cacheInputPrice ?? pricing.inputPrice ?? 0);
  const outputCost = (outputTokens / 1_000_000) * (pricing.outputPrice ?? 0);
  return inputCost + cacheCost + outputCost;
}

export function recordRequest(record: RequestRecord) {
  const db = getDb();
  const now = Date.now();
  const date = new Date(now).toISOString().split("T")[0];
  const cacheInputTokens = record.cacheInputTokens ?? 0;
  const cost = calculateCost(record.inputTokens, record.outputTokens, cacheInputTokens, record.pricing);

  db.prepare(`
    INSERT INTO request_index (id, timestamp, token_id, provider_id, model, input_tokens, output_tokens, cache_input_tokens, latency_ms, status, log_file, error, api_key_index, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id, now, record.tokenId, record.providerId, record.model,
    record.inputTokens, record.outputTokens, cacheInputTokens, record.latencyMs,
    record.status, record.logFile, record.error ?? null, record.apiKeyIndex ?? 0, cost
  );

  db.prepare(`
    INSERT INTO usage_daily (date, token_id, provider_id, model, request_count, input_tokens, output_tokens, cache_input_tokens, cost)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    ON CONFLICT(date, token_id, provider_id, model)
    DO UPDATE SET
      request_count = request_count + 1,
      input_tokens = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens,
      cache_input_tokens = cache_input_tokens + excluded.cache_input_tokens,
      cost = cost + excluded.cost
  `).run(date, record.tokenId, record.providerId, record.model, record.inputTokens, record.outputTokens, cacheInputTokens, cost);
}
