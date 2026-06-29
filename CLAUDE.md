# TokenParty

AI API 反向代理网关 - Token 用量监控、协议转换、请求可视化。

## 开发

```bash
pnpm install
./scripts/start.sh    # 启动 proxy + dashboard
pnpm dev              # 仅启动 proxy (port 3456)
pnpm dev:dashboard    # 仅启动 dashboard dev server (port 3457)
```

配置文件和数据统一存放在 `~/.tokenparty/`（config.yaml、data/、logs/）。

## 架构

- `packages/proxy` - Hono 反向代理服务 (TypeScript)，npm 包名 `@tokenparty/tokenparty`
- `packages/dashboard` - React + Vite Dashboard

## 端点

- `POST /v1/*` - OpenAI 兼容入口
- `POST /anthropic/*` - Anthropic 兼容入口
- `GET /api/*` - Dashboard API
- `GET /health` - 健康检查

## 发布

```bash
pnpm run build:publish
cd packages/proxy && npm publish --access=public
```

## 迭代规范

- 每完成一个 feature，更新 README.md 中的 Roadmap（打勾），并 commit
- Commit message 格式：`feat: <描述>` / `fix: <描述>`
- 迭代方向参考 README.md 中的 Roadmap
