# AGENT.md

本目录的完整规范写在 [`AGENTS.md`](./AGENTS.md)（Codex 自动加载的文件名）。请以 AGENTS.md 为唯一事实来源，本文件仅为兼容旧命名。

## 版本升级规则

执行版本升级时，先执行 `docker compose pull sub2api` 并更新 `8080`（`sub2api`）官方目标版本；确认 `/health=200`、容器 `healthy`、实际版本和 `restarts=0` 后，再将同一官方版本合并到 `8081`（`sub2api-mito`），保留已有 Mito 定制功能与界面后构建部署。8080 验证期间保持旧版 8081 可用，每次只重建一个应用服务并使用 `--no-deps`，不重建共享 PostgreSQL/Redis。升级完成后两个实例必须使用同一官方版本基线，具体备份、迁移和验证流程以 `AGENTS.md` 第 7 节为准；日常定制仍只发布 8081。
