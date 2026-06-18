import { Hono } from "hono";
import { authMiddleware } from "../proxy/auth.js";
import { forwardRequest } from "../proxy/forwarder.js";
import { resolveProvider, listAvailableModels } from "../proxy/router.js";
import { openaiToAnthropic } from "../adapters/openai-to-anthropic.js";
import type { AppEnv } from "../types/env.js";

export const openaiRoutes = new Hono<AppEnv>();

openaiRoutes.use("/*", authMiddleware);

openaiRoutes.get("/models", (c) => {
  const token = c.get("authToken");
  const models = listAvailableModels(token);
  return c.json({
    object: "list",
    data: models.map((id) => ({
      id,
      object: "model",
      created: 1704067200,
      owned_by: "tokenparty",
    })),
  });
});

openaiRoutes.post("/chat/completions", async (c) => {
  const token = c.get("authToken");
  const body = await c.req.json();
  const model = body.model;

  const result = resolveProvider(model, token);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  const { providers } = result;

  if (providers[0].type === "openai") {
    return forwardRequest(c, providers, "/chat/completions", body, "openai");
  }

  const anthropicBody = openaiToAnthropic(body);
  return forwardRequest(c, providers, "/v1/messages", anthropicBody, "openai");
});

openaiRoutes.all("/*", async (c) => {
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

  if (result.providers[0].type !== "openai") {
    return c.json({ error: "This endpoint requires an OpenAI-compatible provider" }, 400);
  }

  const path = new URL(c.req.url).pathname.replace(/^\/v1/, "");
  return forwardRequest(c, result.providers, path, body, "openai");
});
