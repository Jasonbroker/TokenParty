import type { Context, Next } from "hono";
import { getConfig } from "../config.js";
import type { Token } from "../types/config.js";

export async function authMiddleware(c: Context, next: Next) {
  const config = getConfig();
  const authHeader = c.req.header("Authorization") ?? "";
  const key = authHeader.replace(/^Bearer\s+/i, "");

  if (!key) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const token = config.tokens.find((t) => t.key === key && t.enabled);
  if (!token) {
    return c.json({ error: "Invalid or disabled token" }, 401);
  }

  c.set("authToken", token);
  await next();
}
