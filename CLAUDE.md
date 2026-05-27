# TokenParty

AI API 反向代理网关 - Token 用量监控、协议转换、请求可视化。

## 开发

```bash
pnpm install
pnpm dev          # 启动 proxy (port 3456)
pnpm dev:dashboard  # 启动 dashboard dev server (port 3457)
```

## 架构

- `packages/proxy` - Hono 反向代理服务 (TypeScript)
- `packages/dashboard` - React + Vite Dashboard

## 配置

复制 `packages/proxy/config.example.yaml` → `config.yaml`，编辑 provider 和 token。

## 端点

- `POST /v1/*` - OpenAI 兼容入口
- `POST /anthropic/*` - Anthropic 兼容入口
- `GET /api/*` - Dashboard API
- `GET /health` - 健康检查
