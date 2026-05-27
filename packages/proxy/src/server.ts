import { Hono } from "hono";
import { cors } from "hono/cors";
import { openaiRoutes } from "./routes/openai.js";
import { anthropicRoutes } from "./routes/anthropic.js";
import { apiRoutes } from "./routes/api.js";

export function createServer() {
  const app = new Hono();

  app.use("/*", cors());

  app.get("/health", (c) => c.json({ status: "ok", service: "tokenparty" }));

  app.route("/v1", openaiRoutes);
  app.route("/anthropic", anthropicRoutes);
  app.route("/api", apiRoutes);

  return app;
}
