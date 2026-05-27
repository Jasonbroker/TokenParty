import { getConfig } from "../config.js";
import type { Provider, Token } from "../types/config.js";

export interface RouteResult {
  provider: Provider;
}

export function resolveProvider(model: string, token: Token): RouteResult | { error: string } {
  const config = getConfig();

  const candidateProviders = config.providers.filter(
    (p) => p.enabled && p.models.includes(model)
  );

  if (candidateProviders.length === 0) {
    return { error: `No provider available for model: ${model}` };
  }

  for (const allowedId of token.allowedProviders) {
    const match = candidateProviders.find((p) => p.id === allowedId);
    if (match) return { provider: match };
  }

  return { error: `Token not authorized for any provider serving model: ${model}` };
}

export function listAvailableModels(token: Token): string[] {
  const config = getConfig();
  const models = new Set<string>();

  for (const provider of config.providers) {
    if (!provider.enabled) continue;
    if (!token.allowedProviders.includes(provider.id)) continue;
    for (const model of provider.models) {
      models.add(model);
    }
  }

  return [...models];
}
