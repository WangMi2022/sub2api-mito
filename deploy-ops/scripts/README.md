# scripts/

## release-8081.sh

构建并**直接发布** `sub2api-mito` 定制主题镜像到 8081。行为约束来自 `../AGENTS.md`：
8080 实例全程不动、只在容器内构建、只重建 `sub2api-mito` 服务、**不 push 到任何远端**。

### 用法

```bash
cd /data/sub2api-deploy
scripts/release-8081.sh --slug <短slug>              # 构建 + 部署 8081 + 验证 + 写回滚材料
scripts/release-8081.sh --slug <短slug> --no-deploy  # 只构建, 不部署
scripts/release-8081.sh --help
```

`--slug` 会进镜像标签，例如 `--slug group-select` →
`sub2api-mito:2.11.0-ui-20261015T025829Z-group-select`。

### 选项

| 选项 | 说明 |
| --- | --- |
| `--slug SLUG` | 镜像短标签，默认 `misc`；只允许小写字母、数字、连字符 |
| `--base IMAGE` | 薄层基础镜像，默认取当前 8081 已部署镜像 |
| `--no-deploy` | 只构建不部署 |
| `--full` | 走仓库 `Dockerfile` 整包构建（上游改了 entrypoint / 系统依赖 / Go 版本时用） |
| `--skip-tests` | 跳过 `typecheck` / `lint:check`（`mito-theme check` 仍会执行） |
| `--skip-dist-backup` | 不备份现有前端 `dist` |
| `--allow-dirty` | 允许 git 工作区有未提交改动 |
| `--allow-reinstall` | 清空 `node_modules` 卷后重装依赖，**仅在依赖卷损坏时使用** |
| `--node-image IMG` | node 构建镜像，默认 `node:24-bookworm-slim`（必须 glibc） |
| `--pnpm-version V` | pnpm 版本，默认 `9.15.9`（必须与依赖卷一致） |
| `--proxy URL` | 容器内构建代理，默认 `http://<build-proxy>`，传 `none` 关闭 |

### 流程

1. **前置检查** — 确认 8080/8081 容器存在，记录 8080 的 `StartedAt` 与 `RestartCount`，
   校验依赖卷与构建镜像的 libc/pnpm 版本一致，确认 compose 里 `sub2api-mito` 的 `image` 行唯一。
2. **备份** — compose、git 状态、现有前端 `dist`、可用回滚镜像清单、`schema_migrations` 计数。
3. **构建** — 依赖安装（store 落独立卷）→ 主题契约检查 + `typecheck`/`lint` → 前端构建 →
   后端 `go build -tags embed` → 薄层镜像（只替换二进制）。
4. **部署** — 只改 compose 第 168 行（8081 的 `image`）→ `docker compose up -d --no-deps --force-recreate sub2api-mito`。
5. **验证** — 8081 `/health` 200 且等 `healthy`；运行镜像 ID 与本次构建一致；
   8080 `/health` 200 且 `restarts=0`、`StartedAt` 未变。
6. **回滚材料** — 写 `<task>/ROLLBACK.md`、`image-tag.txt`，并更新 `workspace/.sub2api-<slug>-current`。

任务目录：`workspace/sub2api-<slug>-<UTC时间戳>-<pid>/`。

### 失败时

脚本以非零码退出，并在 stderr 提示任务目录。compose 只在 Step 4 被改动，
恢复用 `<task>/backup/docker-compose.yml.before`。8080 不受影响。

### 构建环境是硬约束

依赖卷 `sub2api-mito-ui-node24-modules` 由 **Debian bookworm + Node 24.14.0 + pnpm 9.15.9（glibc）** 装入：

- 前端构建镜像**必须 glibc**（`node:24-bookworm-slim`）。用 `node:24-alpine` 会报
  `Cannot find module @rollup/rollup-linux-x64-musl`。
- pnpm 固定 `9.15.9`，与卷内 `.modules.yaml` 的 `packageManager` 一致，否则 pnpm 会要求清空重装。
- store 必须 `--store-dir=/pnpm-store`（卷 `sub2api-mito-pnpm-store`），否则 pnpm 会在仓库根目录生成
  约 666MB 的 `.pnpm-store`；脚本检测到该目录会直接失败。
- 后端构建容器内用 `sh -c` 而非 `sh -lc`：Alpine 的 `/etc/profile` 会覆盖 PATH 导致 `go: not found`。

脚本会在构建前校验上述一致性，不匹配时直接报错退出，而不是静默安装一份新依赖。

### 推送

脚本**从不 push**。改动部署并验证通过后，若用户明确同意，再执行：

```bash
git -C /data/sub2api-deploy/sub2api push git@github.com:WangMi2022/sub2api-mito.git production
```
