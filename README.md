<p align="center">
  <img src="https://em-content.zobj.net/source/apple/391/party-popper_1f389.png" width="80" />
</p>

<h1 align="center">TokenParty</h1>

<p align="center">
  <strong>Self-hosted AI gateway — proxy, observe, and control your LLM API traffic.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api-reference">API</a> •
  <a href="#dashboard">Dashboard</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@zhouzhengchang/token-party"><img src="https://img.shields.io/npm/v/@zhouzhengchang/token-party?color=cb3837&logo=npm" alt="npm" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Hono-4.6-E36002?logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## Why TokenParty?

Running multiple AI providers across a team? TokenParty sits between your apps and the upstream APIs, giving you a single unified endpoint with full visibility into who's using what, how much it costs, and what's happening in real-time.

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│  Your Apps  │──────▶│  TokenParty  │──────▶│  OpenAI / Claude │
│  (any SDK)  │◀──────│   Gateway    │◀──────│   / any LLM      │
└─────────────┘       └──────────────┘       └─────────────────┘
                            │
                      ┌─────┴─────┐
                      │ Dashboard │
                      └───────────┘
```

## Features

**🔀 Protocol Translation** — Send OpenAI-format requests to Anthropic models (and vice versa). Your apps don't need to care which provider is behind the scenes.

**📊 Real-Time Dashboard** — Monitor token usage, request volume, latency, and costs per key/provider/model with interactive charts.

**🔑 Multi-Tenant Key Management** — Issue scoped API keys with per-provider access control and rate limits. Rotate keys without touching your apps.

**📡 Streaming First** — Full SSE streaming support with transparent protocol conversion between OpenAI and Anthropic stream formats.

**🗄️ Request Logging** — Every request/response pair is logged as structured JSONL with full headers, bodies, and usage metadata.

**⚡ Hot Reload Config** — Edit `config.yaml` and changes apply instantly. No restarts, no downtime.

**🪶 Minimal Footprint** — Single binary-like deployment. SQLite for persistence. No Redis, no Postgres, no external dependencies.

## Quick Start

### Install from npm

```bash
npm install -g @zhouzhengchang/token-party
tokenparty
```

Open `http://localhost:3456` to access the dashboard — configure providers and tokens from there.

### Docker

Create these two files anywhere on your server:

**docker-compose.yaml**
```yaml
services:
  tokenparty:
    image: node:22-slim
    entrypoint: sh -c "apt-get update && apt-get install -y python3 make g++ && npm install -g @zhouzhengchang/token-party && tokenparty"
    ports:
      - "3456:3456"
    volumes:
      - npm_global:/usr/local
      - ./tokenparty-data:/root/.tokenparty
    restart: unless-stopped

volumes:
  npm_global:
```

```bash
docker compose up -d        # start
docker compose logs -f       # view logs
docker compose restart       # restart — auto picks up new npm version
docker compose down          # stop
```

The npm package is installed on first launch; subsequent restarts use the cached volume for instant startup. Restart the container to pick up new npm versions. The `tokenparty-data/` directory persists config, database, and logs. Edit `config.yaml` for hot-reloaded configuration changes.

### From source

```bash
git clone https://github.com/user/TokenParty.git
cd TokenParty
pnpm install

# Launch proxy + dashboard (config auto-generated on first run)
pnpm dev
pnpm dev:dashboard
```

### Use it immediately

Point any OpenAI-compatible SDK at your proxy:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3456/v1",
    api_key="tp-example-token"
)

# This can route to Claude, GPT-4o, or any configured provider
response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

Or use the Anthropic SDK format:

```python
import anthropic

client = anthropic.Anthropic(
    base_url="http://localhost:3456/anthropic",
    api_key="tp-example-token"
)

message = client.messages.create(
    model="gpt-4o",  # Yes, GPT-4o through the Anthropic SDK format
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## Architecture

```
TokenParty/
├── packages/
│   ├── proxy/          # Hono reverse proxy (TypeScript)
│   │   ├── src/
│   │   │   ├── adapters/       # Protocol translators (OpenAI ↔ Anthropic)
│   │   │   ├── proxy/          # Auth, routing, forwarding logic
│   │   │   ├── metrics/        # Usage collection → SQLite
│   │   │   ├── routes/         # HTTP route handlers
│   │   │   ├── store/          # Database & log writer
│   │   │   └── types/          # Shared type definitions
│   └── dashboard/      # React + Vite + Tailwind + Recharts
│       └── src/
│           └── pages/          # Overview, Requests, Providers, Keys
├── scripts/
│   └── start.sh        # One-command launcher
└── pnpm-workspace.yaml
```

| Component | Tech | Role |
|-----------|------|------|
| Gateway | Hono + Node.js | Reverse proxy with streaming SSE |
| Storage | better-sqlite3 (WAL) | Usage aggregation & request index |
| Logs | JSONL files | Full request/response audit trail |
| Dashboard | React 19 + Vite 6 | Real-time monitoring UI |
| Config | YAML + chokidar | Hot-reloadable provider/key setup |

## Configuration

```yaml
server:
  port: 3456
  host: 0.0.0.0
  logDir: ./logs
  dataDir: ./data

providers:
  - id: anthropic-main
    type: anthropic
    name: "Anthropic"
    apiKey: ${ANTHROPIC_API_KEY}    # env var interpolation
    baseUrl: https://api.anthropic.com
    group: production               # custom group for key access control
    models:
      - claude-sonnet-4-20250514
      - claude-opus-4-20250514
    enabled: true

  - id: openai-main
    type: openai
    name: "OpenAI"
    apiKey: ${OPENAI_API_KEY}
    baseUrl: https://api.openai.com/v1
    group: production
    models:
      - gpt-4o
      - gpt-4o-mini
      - o3-mini
    enabled: true

tokens:
  - key: tp-team-alice
    name: "Alice"
    allowedProviders: ["group:production"]  # access all providers in "production" group
    rateLimit: 100
    enabled: true

  - key: tp-team-bob
    name: "Bob"
    allowedProviders: [openai-main]         # or specify individual provider IDs
    rateLimit: 50
    enabled: true
```

Environment variables in `${VAR}` format are resolved at startup.

## API Reference

### Proxy Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | OpenAI-compatible chat |
| `POST` | `/v1/responses` | OpenAI Responses API |
| `GET` | `/v1/models` | List available models |
| `POST` | `/anthropic/v1/messages` | Anthropic-compatible messages |
| `GET` | `/health` | Health check |

All proxy endpoints require `Authorization: Bearer <your-token>` header.

### Dashboard API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stats?days=7` | Usage statistics |
| `GET` | `/api/requests?limit=50` | Request history |
| `GET` | `/api/requests/:id` | Request detail + logs |
| `GET/POST/PUT/DELETE` | `/api/providers` | Provider CRUD |
| `GET/POST/PUT/DELETE` | `/api/keys` | Key management |

## Dashboard

The built-in dashboard provides at-a-glance visibility:

- **Overview** — Daily token usage charts, total requests, input/output token counts
- **Requests** — Paginated request log with model, latency, status, and full request/response inspection
- **Providers** — Manage upstream providers, toggle enable/disable, view supported models
- **Keys** — Issue and revoke API keys, set per-key provider access and rate limits

## Development

```bash
# Start proxy in watch mode
pnpm dev

# Start dashboard dev server (separate terminal)
pnpm dev:dashboard

# Build everything
pnpm build
```

The proxy uses `tsx watch` for instant reload on code changes. The dashboard uses Vite with HMR.

## Roadmap

- [x] npm package (`npm install -g @zhouzhengchang/token-party`)
- [x] Load balancing across multiple keys per provider
- [x] Token allowedProviders grouping (`*` / `group:<name>` / manual)
- [x] Custom provider groups (assign providers to named groups, keys reference groups)
- [x] Cost estimation with per-model pricing config
- [x] Docker image & docker-compose
- [x] Provider fallback / retry
- [x] Usage quota per token
- [ ] Admin authentication for dashboard

## License

MIT

---

<p align="center">
  <sub>Built with ❤️ and way too many tokens.</sub>
</p>
