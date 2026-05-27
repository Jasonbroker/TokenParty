import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { watch } from "chokidar";
import { ConfigSchema, type Config } from "./types/config.js";

let currentConfig: Config;
let configPath: string;
let rawContent: string;

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "");
}

function resolveConfigEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") return resolveEnvVars(obj);
  if (Array.isArray(obj)) return obj.map(resolveConfigEnvVars);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = resolveConfigEnvVars(v);
    }
    return result;
  }
  return obj;
}

export function loadConfig(filePath?: string): Config {
  configPath = filePath ?? path.resolve(process.cwd(), "config.yaml");

  if (!fs.existsSync(configPath)) {
    const examplePath = path.resolve(process.cwd(), "config.example.yaml");
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, configPath);
    } else {
      throw new Error(`Config file not found: ${configPath}`);
    }
  }

  rawContent = fs.readFileSync(configPath, "utf-8");
  const parsed = parse(rawContent);
  const resolved = resolveConfigEnvVars(parsed);
  currentConfig = ConfigSchema.parse(resolved);

  fs.mkdirSync(path.resolve(path.dirname(configPath), currentConfig.server.logDir), { recursive: true });
  fs.mkdirSync(path.resolve(path.dirname(configPath), currentConfig.server.dataDir), { recursive: true });

  return currentConfig;
}

export function getConfig(): Config {
  return currentConfig;
}

export function watchConfig(onChange?: (config: Config) => void) {
  const watcher = watch(configPath, { ignoreInitial: true });
  watcher.on("change", () => {
    try {
      const newConfig = loadConfig(configPath);
      onChange?.(newConfig);
      console.log("[config] Reloaded config.yaml");
    } catch (e) {
      console.error("[config] Failed to reload:", e);
    }
  });
  return watcher;
}

export function updateConfig(mutator: (raw: Record<string, unknown>) => void): Config {
  const parsed = parse(rawContent);
  mutator(parsed);
  const newYaml = stringify(parsed, { lineWidth: 120 });
  fs.writeFileSync(configPath, newYaml, "utf-8");
  return loadConfig(configPath);
}
