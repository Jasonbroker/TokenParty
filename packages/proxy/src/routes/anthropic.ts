import { Hono, type Context } from "hono";
import { authMiddleware } from "../proxy/auth.js";
import { forwardRequest } from "../proxy/forwarder.js";
import { resolveProvider, listAvailableModels } from "../proxy/router.js";
import { anthropicToOpenai } from "../adapters/anthropic-to-openai.js";
import type { AppEnv } from "../types/env.js";

export const anthropicRoutes = new Hono<AppEnv>();

anthropicRoutes.use("/*", authMiddleware);

const handleAnthropicModels = (c: Context<AppEnv>) => {
  const token = c.get("authToken");
  const models = listAvailableModels(token);
  const data = models.map((id) => ({
    id,
    type: "model",
    display_name: id,
    created_at: "2024-01-01T00:00:00Z",
  }));
  return c.json({
    data,
    has_more: false,
    first_id: data[0]?.id ?? null,
    last_id: data[data.length - 1]?.id ?? null,
  });
};

anthropicRoutes.get("/v1/models", handleAnthropicModels);
anthropicRoutes.get("/models", handleAnthropicModels);

anthropicRoutes.post("/v1/messages", async (c) => {
  const token = c.get("authToken");
  const body = await c.req.json();
  const model = body.model;

  const result = resolveProvider(model, token);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  const { provider, pricing } = result;

  if (provider.type === "anthropic") {
    return forwardRequest(c, provider, "/v1/messages", body, "anthropic", pricing);
  }

  const openaiBody = anthropicToOpenai(body);
  return forwardRequest(c, provider, "/chat/completions", openaiBody, "anthropic", pricing);
});

anthropicRoutes.all("/*", async (c) => {
  const token = c.get("authToken");
  const body = await c.req.json().catch(() => ({}));
  const model = body.model ?? "";

  if (!model) {
    return c.json({ error: "Not found" }, 404);
  }

  const result = resolveProvider(model, token);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  if (result.provider.type !== "anthropic") {
    return c.json({ error: "This endpoint requires an Anthropic-compatible provider" }, 400);
  }

  const path = new URL(c.req.url).pathname.replace(/^\/anthropic/, "");
  return forwardRequest(c, result.provider, path, body, "anthropic", result.pricing);
});
