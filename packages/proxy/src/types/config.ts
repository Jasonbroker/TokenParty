import { z } from "zod";

export const ProviderSchema = z.object({
  id: z.string(),
  type: z.enum(["openai", "anthropic"]),
  name: z.string(),
  apiKey: z.string(),
  baseUrl: z.string().url(),
  models: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export const TokenSchema = z.object({
  key: z.string(),
  name: z.string(),
  allowedProviders: z.array(z.string()),
  rateLimit: z.number().nullable().optional(),
  enabled: z.boolean().default(true),
});

export const ConfigSchema = z.object({
  server: z.object({
    port: z.number().default(3456),
    host: z.string().default("0.0.0.0"),
    logDir: z.string().default("./logs"),
    dataDir: z.string().default("./data"),
  }),
  providers: z.array(ProviderSchema),
  tokens: z.array(TokenSchema),
});

export type Provider = z.infer<typeof ProviderSchema>;
export type Token = z.infer<typeof TokenSchema>;
export type Config = z.infer<typeof ConfigSchema>;
