import { Hono } from "hono";
import { authMiddleware } from "../proxy/auth.js";
import { forwardRequest } from "../proxy/forwarder.js";
import { resolveProvider } from "../proxy/router.js";
import { anthropicToOpenai } from "../adapters/anthropic-to-openai.js";

export const anthropicRoutes = new Hono();

anthropicRoutes.use("/*", authMiddleware);

anthropicRoutes.post("/v1/messages", async (c) => {
  const token = c.get("authToken");
  const body = await c.req.json();
  const model = body.model;

  const result = resolveProvider(model, token);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  const { provider } = result;

  if (provider.type === "anthropic") {
    return forwardRequest(c, provider, "/v1/messages", body, "anthropic");
  }

  const openaiBody = anthropicToOpenai(body);
  return forwardRequest(c, provider, "/chat/completions", openaiBody, "anthropic");
});

anthropicRoutes.all("/*", async (c) => {
  const token = c.get("authToken");
  const body = await c.req.json().catch(() => ({}));
  const model = body.model ?? "";

  const result = resolveProvider(model, token);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  if (result.provider.type !== "anthropic") {
    return c.json({ error: "This endpoint requires an Anthropic-compatible provider" }, 400);
  }

  const path = new URL(c.req.url).pathname.replace(/^\/anthropic/, "");
  return forwardRequest(c, result.provider, path, body, "anthropic");
});
