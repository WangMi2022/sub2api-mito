# AGENTS.md — sub2api-deploy 双实例运维与迭代规范

本文件适用于 `/data/sub2api-deploy` 及其全部子目录（含 `sub2api/` 源码与 `workspace/`）。Codex 会自动加载本文件。

## 0. 一句话目标

本目录是 Sub2API 的**双实例灰度部署**：8080 跑上游官方镜像（稳定基线），8081 跑 `sub2api-mito` 定制主题镜像（迭代目标）。
两个实例**共用同一套 PostgreSQL / Redis 与同一业务库**。任何改动都必须保证 8080 全程可用；定制改动构建完**直接部署发布到 8081**；**推送到 GitHub 前必须先征得用户同意**。

## 1. 运行拓扑（改动前先核对，勿凭记忆）

| 服务 | 容器名 | 镜像 | 端口 | 数据目录 | 角色 |
| --- | --- | --- | --- | --- | --- |
| `sub2api` | `sub2api` | `ghcr.io/ranxi2001/sub2api:2.11.0` | `0.0.0.0:8080→8080` | `./data` | 上游基线，**只读，禁止改动/重启** |
| `sub2api-mito` | `sub2api-mito` | `sub2api-mito:<版本>-ui-<UTC时间戳>-<slug>` | `0.0.0.0:8081→8080` | `./data-mito` | 定制主题，**唯一迭代对象** |
| `postgres` | `sub2api-postgres` | `hub.1panel.dev/library/postgres:18-alpine` | 仅内部网络 | `./postgres_data` | 双方共用业务库 `sub2api` |
| `redis` | `sub2api-redis` | `hub.1panel.dev/library/redis:8-alpine` | 仅内部网络 | `./redis_data` | 双方共用 |

网络：`sub2api-deploy_sub2api-network`（bridge）。两个应用容器内均通过 `DATABASE_HOST=postgres` / `REDIS_HOST=redis` 访问，**不暴露 5432/6379 到宿主机**。

核对命令：

```bash
cd /data/sub2api-deploy
docker compose ps
docker inspect -f '{{.Name}} restarts={{.RestartCount}} health={{.State.Health.Status}} image={{.Config.Image}}' sub2api sub2api-mito
```

## 2. 硬性约束（违反即视为事故）

1. **8080 不可中断**：禁止 `stop`/`restart`/`rm`/`recreate` `sub2api` 容器，禁止改它在 compose 里的 `image` 行和 `./data` 挂载。改动前后 `sub2api` 的 `RestartCount` 必须保持 `0`、健康状态 `healthy`。
2. **共用数据库，只允许追加式、向前兼容的迁移**：8080 与 8081 读写同一库，旧镜像对新对象完全无感知。禁止 `DROP`/`TRUNCATE`/改列类型/破坏性回填/手工改生产数据。新增迁移只增不删。
3. **只在容器里构建**：宿主机 node 是 v16、go 是 1.20，均低于项目要求（前端构建需 Node 18+/pnpm 9，`backend/go.mod` 要求 go 1.27.2）。一律用 `node:24-alpine` 与 `golang:1.27.2-alpine`。
4. **禁止破坏性 Docker 操作**：不得 `docker compose down`/`down -v`、不得删除或 `prune` `postgres_data`/`redis_data`/`data`/`data-mito` 及 `sub2api-mito-*` 构建缓存卷。
5. **推送必须询问用户**：见第 8 节。任何自动流程都不得 push。
6. **密钥不进仓库、不进日志**：`.env`（`0600`）是唯一配置源，不要把值打印到输出、写进任务目录或提交。
7. **入库的规范与脚本必须脱敏**：`git@github.com:WangMi2022/sub2api-mito.git` 是**公开仓库**。
   入库文件里不得出现内网 IP/主机名、真实邮箱、密钥。真实值统一放已被 `.gitignore` 排除的本机文件
   （`.env` 的 `BUILD_HTTP_PROXY`、`.acceptance-accounts.env`）。占位符约定：
   `<build-proxy>`、`<admin-email>`、`<user-email>`。新增内容前先自查一遍。

## 3. 路径速查

- 部署根 / compose：`/data/sub2api-deploy`、`/data/sub2api-deploy/docker-compose.yml`（8080 服务第 26–27 行，8081 服务第 166–172 行，其中 `image:` 在第 168 行）
- 源码（git）：`/data/sub2api-deploy/sub2api`，分支 `production`，`origin = https://github.com/ranxi2001/sub2api`
- 任务工作区：`/data/sub2api-deploy/workspace/<topic>-<yyyymmddTHHMMSSZ>-<pid>/`
- 8080 数据：`./data`；8081 数据：`./data-mito`（两者是**独立本地目录，但共用同一个业务库**，不构成业务数据隔离）
- 主题目录：`sub2api/frontend/src/themes/mito/`（含 `adaptations.mjs` 接入契约与 `README.md` 主题说明）
- 主题脚本：`sub2api/frontend/scripts/mito-theme.mjs`
- 发布脚本：`scripts/release-8081.sh`（构建 + 部署 8081 + 验证 + 生成回滚材料，用法见 `scripts/README.md`）
- 构建缓存卷：`sub2api-mito-ui-node24-modules`（前端依赖）、`sub2api-mito-go-modules`（Go module 缓存）、`sub2api-mito-pnpm-store`（pnpm store，挂在容器 `/pnpm-store`）
- 历史回滚范本：`workspace/sub2api-v2110-merge-20261014T224709Z-28495/ROLLBACK.md`

## 4. 任务工作区约定

每次迭代先建独立任务目录，命名 `<topic>-<yyyymmddTHHMMSSZ>-<pid>`（UTC 时间戳，与既有任务一致），并更新指针文件 `workspace/.<topic>-current`：

```
<task>/
  backup/            # 改动前备份：docker-compose.yml、被改源文件、前端 dist
  build/             # 本次镜像的薄层 Dockerfile + 编译产物 sub2api
  checks/            # 临时验证脚本、截图、日志
  image-tag.txt      # 本次镜像标签（单行）
  ROLLBACK.md        # 回滚材料（必写，见第 9 节）
```

不要把 `node_modules`、二进制、`dist` 留在仓库里；`sub2api` 检出内不要出现本次构建产物。

## 5. 标准迭代流程

### Step 0 摸底与冻结
确认没有其他会话正在改同一批文件（`git status -s` 干净），记录当前镜像标签与源码 commit：

```bash
cd /data/sub2api-deploy/sub2api && git status -s && git log --oneline -1
docker inspect -f '{{.Config.Image}}' sub2api-mito
```

### Step 1 备份
```bash
TASK=/data/sub2api-deploy/workspace/<topic>-<ts>-$$
mkdir -p $TASK/{backup,build,checks}
cp /data/sub2api-deploy/docker-compose.yml $TASK/backup/docker-compose.yml.before
# 被修改的源码文件也各存一份 .before-<slug>
```

### Step 2 改代码
遵守第 6 节主题规范；后端改动保持与上游一致的代码风格，中文注释仅在上游既有风格中使用。

### Step 3 构建（优先用脚本）

```bash
cd /data/sub2api-deploy
scripts/release-8081.sh --slug <短slug>          # 构建 + 直接部署 8081 + 验证 + 写回滚材料
scripts/release-8081.sh --slug <短slug> --no-deploy   # 只构建, 不部署
```

脚本把下面这些容易踩坑的步骤固化了，优先用它；只有脚本不覆盖的场景才手敲等价命令。

**前端构建环境是硬约束**，不能用 alpine：

- 依赖卷 `sub2api-mito-ui-node24-modules` 是在 **Debian bookworm + Node 24.14.0 + pnpm 9.15.9（glibc）** 下装的，
  里面只有 `@rollup/rollup-linux-x64-gnu`。换 `node:24-alpine`（musl）会报
  `Cannot find module @rollup/rollup-linux-x64-musl`。
- 构建镜像固定用 glibc 的 `node:24-bookworm-slim`；pnpm 固定 `9.15.9`（与卷内 `.modules.yaml` 的
  `packageManager` 一致，否则 pnpm 会要求清空重装）。
- pnpm store 必须显式指定到独立卷：`--store-dir=/pnpm-store`（卷 `sub2api-mito-pnpm-store`）。
  不指定时 pnpm 会在仓库根目录建 666MB 的 `.pnpm-store`，污染工作区。
- `pnpm install` 一律 `--frozen-lockfile --prefer-offline`，并带 `CI=true` 避免交互提示挂住。

```bash
docker run --rm -e CI=true -e "WANT_PNPM=pnpm@9.15.9" -e "STORE_DIR=/pnpm-store" \
  -e HTTP_PROXY=http://<build-proxy> -e HTTPS_PROXY=http://<build-proxy> \
  -v /data/sub2api-deploy/sub2api:/app \
  -v sub2api-mito-ui-node24-modules:/app/frontend/node_modules \
  -v sub2api-mito-pnpm-store:/pnpm-store \
  -w /app node:24-bookworm-slim sh -c '
    corepack enable >/dev/null 2>&1
    corepack prepare "$WANT_PNPM" --activate >/dev/null 2>&1
    cd /app/frontend
    pnpm install --frozen-lockfile --prefer-offline --store-dir="$STORE_DIR"
    pnpm run build'
```

前端产物由 vite `outDir` 直接写到 `backend/internal/web/dist`（`.gitignore` 已忽略，不要提交）；
`vite.config.ts` 已设 `emptyOutDir: true`，所以每次构建会清空该目录 —— 里面不会积累旧产物。

**`-tags embed` 的语义（最容易踩的坑）**：它把**编译那一刻磁盘上的 `dist`** 打进二进制。
所以：

- **顺序不能反**：改了前端就必须先重建前端、再编后端。只重编后端 = 镜像里还是上一版前端。
- **必须在同一个检出里完成两步**：前端在 A 检出构建、后端在 B 检出编译，二进制会带上 B 检出的
  那份 `dist`，与你刚构建的前端无关。
- 后果是**静默**的：容器 `/health` 200、commit 正确、后端修复生效，但前端还是旧的。
- `scripts/release-8081.sh` 已固化「同检出、先前端后后端」，并在编译后加了**嵌入校验**：
  比对二进制里是否含当前 `dist` 的入口 chunk（`assets/index-*.js`），不一致直接失败退出。

**后端**（`-tags embed` 把上一步的 dist 编进二进制，`-trimpath` 保持与官方构建一致）：

```bash
docker run --rm \
  -e HTTP_PROXY=http://<build-proxy> -e HTTPS_PROXY=http://<build-proxy> \
  -e VERSION_VALUE=<上游版本> -e COMMIT_VALUE=<源码sha> -e DATE_VALUE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  -v /data/sub2api-deploy/sub2api:/src \
  -v sub2api-mito-go-modules:/go/pkg/mod \
  -v $TASK/build:/out \
  -w /src/backend golang:1.27.2-alpine sh -c '
    apk add --no-cache git ca-certificates tzdata >/dev/null 2>&1 || true
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOPROXY=https://goproxy.cn,direct GOSUMDB=sum.golang.google.cn \
    go build -tags embed \
      -ldflags="-s -w -X main.Version=${VERSION_VALUE} -X main.Commit=${COMMIT_VALUE} -X main.Date=${DATE_VALUE} -X main.BuildType=release" \
      -trimpath -o /out/sub2api ./cmd/server'
```

注意用 `sh -c` 而不是 `sh -lc`：Alpine 的 `/etc/profile` 会把 PATH 覆盖掉，导致 `go: not found`。

**镜像**（薄层：复用上一版 mito 镜像的运行时、entrypoint 与依赖，只替换二进制，秒级且省盘）：

`$TASK/build/Dockerfile`

```dockerfile
FROM sub2api-mito:<上一版标签>
COPY --chown=sub2api:sub2api sub2api /app/sub2api
RUN chmod 0755 /app/sub2api
LABEL org.opencontainers.image.source="https://github.com/WangMi2022/sub2api-mito" \
      mito.source-base=<源码提交sha> \
      mito.source-manifest-sha256=<源码清单sha256>
```

```bash
docker build -t sub2api-mito:<新标签> $TASK/build
echo sub2api-mito:<新标签> > $TASK/image-tag.txt
```

标签约定：`sub2api-mito:<上游版本>-ui-<yyyymmddTHHMMSSZ>-<短slug>`，例如
`sub2api-mito:2.11.0-ui-20261015T025829Z-group-select`。源码清单 sha256 取 `git ls-files -s | sha256sum`（可复现）。

只有当上游改动了 `Dockerfile`/entrypoint/系统依赖/Go 版本时，才走整包构建
（`scripts/release-8081.sh --full`，内部是 `docker buildx build -f sub2api/Dockerfile`）。

### Step 4 部署 8081（改完即发布）

```bash
cd /data/sub2api-deploy
grep -n "image: sub2api-mito:" docker-compose.yml          # 定位到 8081 服务那一行
# 只改 8081 服务的镜像标签（第 168 行），不要动 8080 的 image 行
docker compose up -d --no-deps --force-recreate sub2api-mito
```

**必须**带服务名与 `--no-deps`。不带服务名的 `docker compose up -d` 会连带评估/重建共享组件，属于禁止操作。

### Step 5 验证

```bash
curl -s -o /dev/null -w '8081 %{http_code}\n' http://127.0.0.1:8081/health       # 期望 200
curl -s -o /dev/null -w '8080 %{http_code}\n' http://127.0.0.1:8080/health       # 期望 200
docker exec sub2api-mito /app/sub2api --version                                  # 运行中二进制的版本与 commit
docker inspect -f '8080 restarts={{.RestartCount}} health={{.State.Health.Status}}' sub2api
docker inspect -f '8081 restarts={{.RestartCount}} health={{.State.Health.Status}} image={{.Config.Image}}' sub2api-mito
```

通过标准：8081 返回 200 且容器 `healthy`，运行镜像 ID 与本次构建一致；**8080 返回 200 且 `restarts=0`、`StartedAt` 未变**。

版本探测的正确方式（`/version` 不是接口，只会被 SPA 兜底路由返回 index.html）：
`docker exec <容器> /app/sub2api --version`，或管理员接口 `GET /api/v1/admin/system/version`。

界面类改动还需在 8081 做真实浏览器验收（登录、权限、深浅色、桌面/移动端）。可用 `mcr.microsoft.com/playwright:v1.57.0-noble` + `$TASK/checks/*.mjs`，账号从 `.env` 以环境变量注入，凭据不要写进脚本或提交。

## 6. Mito 主题改动规范

- 新样式放 `frontend/src/themes/mito/*.css`，全部用 `html[data-ui-theme='mito']` 限定作用域，并在 `themes/mito/index.ts` 中导入。
- **禁止直接手改上游共用文件**。需要挂点时，只在 `frontend/src/themes/mito/adaptations.mjs` 里登记 `before`/`after` 锚点，再用脚本应用：

```bash
cd /data/sub2api-deploy/sub2api
node frontend/scripts/mito-theme.mjs check    # 校验全部锚点与依赖契约
node frontend/scripts/mito-theme.mjs apply    # 幂等套用接入点
node frontend/scripts/mito-theme.mjs remove   # 仅撤销接入点，保留主题目录
```

- 新增/改动主题文件必须同步补 `contracts`（路径 + 关键锚点），否则 `check` 不覆盖，上游升级时会静默退回旧界面。脚本冲突时以非零码退出，不允许绕过。
- 文案改动必须同时更新 zh/en 两套 i18n（`localeKeyCompleteness` 单测会拦）。
- 视觉改动必须处理 `prefers-reduced-motion`，且不得改变权限、计费、查询逻辑。
- 自测：
  - 前端：`pnpm run typecheck && pnpm run lint:check && pnpm exec vitest run <相关 spec>`
  - 后端：`go build ./... && go test ./<改动包>`
  - 适配器：`node --test frontend/scripts/mito-theme.spec.mjs`

## 7. 上游合并更新（ranxi2001/sub2api）

原点 `origin = https://github.com/ranxi2001/sub2api`，本地长期分支 `production`（当前基线已合并上游 `v2.11.0`）。**禁止 force push、禁止 rebase 已发布提交。**

1. 备份：打 `pre-<上游版本>-merge` tag / `backup/pre-<上游版本>-merge` 分支，并记录当前 8081 镜像与 dist。
2. 用独立 worktree 合并，避免污染生产检出：
   ```bash
   cd /data/sub2api-deploy/sub2api
   git fetch origin --tags
   git worktree add /data/sub2api-deploy/workspace/<task>/merge production
   ```
3. 在 worktree 内执行 `mito-theme.mjs remove` → 合并上游（`git merge origin/production` 或 `git merge <上游tag>`）→ 解决冲突 → `apply` → `check`。
   锚点或契约报错时，**先读新版布局再逐条更新 `adaptations.mjs`**，禁止无条件覆盖新版文件。
4. 编译 + 单测通过后把改动落回生产检出（确保主题目录与主题脚本未被上游覆盖）。
5. 核对迁移：新迁移只增不删；记录 `schema_migrations` 最新版本与新增对象。
6. 按第 5 节重新构建镜像并部署 8081，完成 Step 5 验证。
7. 更新 `ROLLBACK.md`（见第 9 节）。

主题适配基线 commit 为 `a519cfeb66c253dd39d7728d20d55b7cf9f79897`（见 `themes/mito/README.md`），任何版本都不保证免适配。

## 8. 推送策略（强制：先问用户）

唯一推送目标是 `git@github.com:WangMi2022/sub2api-mito.git`（本机 SSH 身份已认证为 `WangMi2022`，分支 `production`）。

- **每次推送前都必须停下来询问用户**，例如：「改动已部署并验证通过，是否 push 到 `WangMi2022/sub2api-mito`（branch `production`，commit `<sha>`）？」
- 得到明确同意后才执行：
  ```bash
  cd /data/sub2api-deploy/sub2api
  git push git@github.com:WangMi2022/sub2api-mito.git production
  ```
- 禁止：push 到 `origin`（无写权限）、force push、未经同意的 tag/其他分支推送、提交或推送 `.env`、密钥、构建产物。
- 用户未同意或未作答时：**保持本地提交**，在最终回复里说明已提交的 commit sha 与「未推送」状态。
- 推送后回报 commit sha、分支、`git log --oneline -3`、与远端差异。

## 9. 回滚

每次发布都必须写 `<task>/ROLLBACK.md`，内容固定包含：

- 本次发布：容器、镜像标签、源码 commit、compose 行号、上游版本
- 当前与上一版（含更早稳定版）镜像标签，作为首选回滚点
- 8080 全程未改动的说明
- 数据库：已应用迁移清单、迁移前 `pg_dump` 备份路径、向前兼容说明
- 备份文件清单

回滚操作：

```bash
cd /data/sub2api-deploy
cp docker-compose.yml <task>/backup/docker-compose.yml.before-rollback
# 把 8081 服务的 image 行改回目标标签
docker compose up -d --no-deps --force-recreate sub2api-mito
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/health
docker inspect -f '{{.RestartCount}} {{.State.Health.Status}}' sub2api    # 必须仍是 0 / healthy
```

- 代码回滚走 `backup/pre-*` 分支或 tag，不要覆盖其他会话的未提交改动。
- 迁移向前兼容：回滚程序版本**不需要**回滚数据库；如需数据恢复，用快照 `pg_restore` 到独立库核对后再切换，禁止直接覆盖生产库。

## 10. 验收测试账号（仅用于 8081 验收）

需要登录才能验收时，用这两个**验收账号**，**不要再猜 `.env` 里的 bootstrap 密码**：

| 用途 | 账号（邮箱） | 角色 | 密码位置 |
| --- | --- | --- | --- |
| 管理员验收（分组/用户组/订阅等后台页面） | `<admin-email>` | admin | 见下 |
| 普通用户验收（用户端页面、权限边界） | `<user-email>` | user | 见下 |

**密码不在本文件里**（本文件会入库/推送，明文密钥不入库 —— 见第 2 节第 6 条）。
密码存放在**本机、已被 `.gitignore` 排除**的文件：

```
/data/sub2api-deploy/.acceptance-accounts.env   (权限 0600)
  ACCEPT_ADMIN_EMAIL / ACCEPT_ADMIN_PASSWORD
  ACCEPT_USER_EMAIL  / ACCEPT_USER_PASSWORD
```

直接用 `--env-file` 注入验收脚本，不要把它们复制到别处：

```bash
docker run --rm --network host --env-file .acceptance-accounts.env ... node checks/accept.mjs
```

使用约定：

- 这两个是**验收账号**，只用于 8081 的浏览器/接口验收。确认密码有效性用
  `POST /api/v1/auth/login`，不要写进任何提交（`.gitignore` 之外的仓库文件、镜像、README 都不行）。
- 凭据从环境变量注入脚本，不要硬编码在 `checks/*.mjs` 里；临时 env 文件（如 `checks/.env.accept`）
  用完立刻删除，不要留在任务目录。
- 普通用户账号用来验证权限边界（例如管理员接口应返回 401/403、菜单隐藏）。
- 验收产生的数据（用户组、订阅、密钥、用量）用完必须清理；禁止删除生产数据。
  清理顺序：先用 API 撤销/删除（软删除），再核对**验收前该表的基线**。若验收前该表为空
  （或该行确为本次新建），可用 `DELETE ... WHERE id=<本次id>` 精确删除以恢复原状；
  删除前必须查外键引用（`api_keys`/`user_subscriptions`/`user_group_policies`/`subscription_plans`），
  并保留 `RETURNING` 输出作为证据。**禁止**无条件 `DELETE`/`TRUNCATE`。
- 如果你在应用里改了这两个账号的密码，请同步更新本节。

## 11. 侧边栏导航结构（改菜单前必读）

- **侧边栏是两级结构**：一级 = 分区标题（灰色小字，不可点），二级 = 缩进的条目
  （`.mito-sidebar-section-children`，`padding-left: 0.75rem` + 1px 引导线）。
  `adminNavItems` 仍是扁平列表（带 `sectionTitle` 标记），由 `groupMitoSidebarSections`
  转成 `adminNavSections` 分组后交给模板渲染。
- **分区标题由 Mito 主题层注入**：`frontend/src/themes/mito/sidebarSections.ts` 的 `SIDEBAR_SECTIONS`
  声明「分区 → 条目路径」，`applyMitoSidebarSections` 在 `adminNavItems` 里插入标题项
  （`{ path: '__section__<id>', sectionTitle }`），模板用 `v-if="item.sectionTitle"` 渲染为
  `.sidebar-section-title`（复用上游已有样式，含收起态）。**上游主题返回原始扁平列表**。
- 改分区只改 `sidebarSections.ts` 的路径清单；**不要在 AppSidebar 里硬编码标题**。
- 分区的两条安全约束（有单测）：
  1. 未匹配任何分区的条目落入末尾「其他」区，**绝不丢弃**；
  2. 某分区条目被 feature flag 全部隐藏时，该分区标题不渲染（不留空标题）。
- 模板结构：`v-for="section in adminNavSections"` 外层分区，内层 `v-for="item in section.items"`；
  条目内部仍是 `v-if="item.children?.length"` → `v-else`。**改这块必须保证标签平衡** ——
  少一个 `</div>` 单测能过但 `vite build` 会报 `Element is missing end tag`；
  `AppSidebar.spec.ts` 有源码级平衡守卫（div/router-link/button/span），改完先跑它。
- **AppSidebar 的结构代码不是主题 seam**：分组、自定义菜单挂载、a11y 属性都是本 fork 的产品代码，
  已从 `adaptations.mjs` 的 AppSidebar edits 里移除；只保留纯视觉 seam（主题切换按钮、usage 标题等）。
  这样 `mito-theme.mjs remove` 不会把导航结构剥掉。改动 AppSidebar 前先确认它是否真的只服务于主题。
- `searchNavItems` 必须过滤掉标题项（`filter(item => !item.sectionTitle)`），否则 Ctrl+K 会出现假条目。
- **自定义菜单可挂到内置父菜单下**：`CustomMenuItem.parent_id`（配置项 `custom_menu_items` JSON 的字段，
  **不是数据库表**）。可选父菜单在 `frontend/src/utils/sidebarCustomMenus.ts` 的 `SIDEBAR_PARENT_OPTIONS`，
  由设置页与侧边栏共用（`attachCustomMenuItems`），避免两边漂移。
- `parent_id` 指向的父菜单**不存在或当前被 feature flag 隐藏**时，条目回落到顶级而不是消失 ——
  父菜单改名/关开关不能让管理员配置的入口静默消失。后端只做结构校验（`^/[a-zA-Z0-9/_-]*$`），
  不绑定当前导航树，这样改菜单名不会导致保存失败。

## 12. 概念辨析：`groups` 与 `user_groups`（改动前必读）

两套「组」是**正交**的，界面上也是两个独立菜单，不要混用：

| | `groups`（菜单：分组管理 / Groups） | `user_groups`（菜单：用户组管理 / User Groups） |
| --- | --- | --- |
| 作用 | 计费分组：平台、倍率、日/周/月限额、`subscription_type` | 用户归属：专属倍率/专属 RPM/模型限制；未分组禁止登录 |
| 绑定 | `api_keys.group_id`、`user_subscriptions.group_id` | `users.user_group_id` |
| 交叉表 | — | `user_group_policies(user_group_id, group_id)` |

关键事实：

- **订阅（`user_subscriptions`）绑的是计费分组**：`group_id` 有外键 → `groups(id) ON DELETE CASCADE`，
  只有 `subscription_type='subscription'` 的分组才能被分配，限额取自该分组的 `daily/weekly/monthly_limit_usd`。
  即使 API Key 所在分组是订阅型，计费也按该分组的限额走。
- 「分配订阅」弹窗原本只列订阅型分组。2026-10-15 起支持**按用户组分配**（选用户组 → 展开成员 → 合并去重后
  走既有 `bulk-assign`），但**计费仍绑计费分组**，两者不可互换。
- 因此「订阅分组」下拉为空通常不是 bug：库里若没有 `subscription_type='subscription'` 的分组就是空的。
  建一个订阅型分组就有了（可在分组管理里设置订阅类型）。

## 13. 常见坑

- 宿主机工具链过旧：`node v16`、`go 1.20` —— 构建一律进容器。
- `frontend/node_modules` 是空目录，真实依赖在卷 `sub2api-mito-ui-node24-modules`，必须挂载。
- 前端构建镜像必须是 glibc（`node:24-bookworm-slim`），不能是 alpine；否则缺 musl 原生包。见 Step 3。
- pnpm store 必须 `--store-dir=/pnpm-store`，否则会在仓库根目录生成 `.pnpm-store`（约 666MB）污染工作区。
- 依赖卷与本机 `node_modules` 不能混用；`--allow-reinstall` 会清空依赖卷重装，只在卷损坏时用。
- 构建期需要出网代理：真实值在本机 `.env` 的 `BUILD_HTTP_PROXY`（不入库），compose 通过
  `${BUILD_HTTP_PROXY:-}` 注入 `HTTP(S)_PROXY`；发布脚本会自动读取该键。
  容器内拉 Go 依赖用 `GOPROXY=https://goproxy.cn,direct`（国内镜像，可公开）。
- 想确认**镜像里到底是哪份前端**，直接查二进制嵌的入口，别只看 commit：
  `strings <binary> | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | sort -u`
  再与 `grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' dist/index.html` 比对。二者不同即说明前后端不同源。
- 判断「镜像对应哪个 commit」也不能只信二进制自报的 `main.Commit`：它由构建时传入，
  与源码改动可以不一致。**以 `mito.source-base` label + 实际 diff 为准**，必要时用上面的入口比对复核。
- **可能多个会话同时在这台机器上改代码**。发现 `git status` 出现不是自己改的文件时：
  **不要**提交、不要回退、不要 `git stash`（会影响对方）。做法是
  `git worktree add --detach <task>/build-src <自己的commit>`，从隔离检出构建，
  这样镜像只含自己的改动；并在 `ROLLBACK.md` 记录此事。构建完 `git worktree remove --force`。
- **隔离检出与嵌入校验的关系**：在 worktree 里构建时，前端与后端都在该 worktree 内完成，
  所以二者同源、校验自然通过；但**不要**「在 worktree 里编后端、在仓库检出里建前端」（或反之），
  那正是嵌入不一致的典型来源。发布脚本会在最后拦下这种组合。
- **同一仓库的并发会话之间不要互相清理产物**：`backend/internal/web/dist`、构建缓存卷、
  任务目录都可能是对方正在用的。清理前先确认没有其他会话在构建。
- `backend/internal/web/dist` 是构建产物（`.gitignore` 忽略），不要提交。
- 健康检查用 `/health`（返回 200 即已开始服务，容器 `Health` 字段有 30s `start_period`，刚起时是 `starting`，要等 `healthy`）。
- `/version`、`/api/v1/version` **都不是**版本接口：前者是 SPA 兜底路由（返回 index.html，HTTP 200 但内容是 HTML），后者 404。版本用 `docker exec <容器> /app/sub2api --version` 或 `GET /api/v1/admin/system/version`（需管理员鉴权）。
- 两个实例共用同一业务库：在 8081 上的验收操作会写入真实数据（用户、用量、日志、设置），测试数据用完必须清理，禁止删除生产数据。
- **`.env` 里的 `ADMIN_PASSWORD` 只是首次初始化的 bootstrap 密码，之后已在界面上被改过**，直接拿它登录会得到
  `401 INVALID_CREDENTIALS`。做浏览器验收请用第 10 节的测试账号，不要试图改库或绕过鉴权。
- 登录页有「登录协议」闸门：未同意时提交按钮是 `disabled`，需要勾 `#login-agreement-consent`（或走弹窗接受）才能提交。
- 后台页有 driver.js 新手引导（onboarding tour），它带来**两重**干扰，验收脚本必须同时处理：
  1. 引导浮层（`body.driver-active`）会**拦截所有点击**导致 Playwright 超时 —— 先移除引导状态与覆盖层，
     并对关键点击加 `{ force: true }`：`document.body.classList.remove('driver-active','driver-fade')` 后删除 `[class*="driver-"]` 元素。
  2. tour 激活时在 **document 捕获阶段**注册 keydown 监听器拦截 Esc/Enter/方向键，会**吃掉每页第一次 Escape**，
     让「Esc 收起下拉」这类断言假失败。根治办法是在 `addInitScript` 里预置已读标记（键名
     `` `${storageKey}_${userId}_${role}_v4_interactive` ``，如 `admin_guide_1_admin_v4_interactive='true'`），
     让 tour 不启动。**不要**因为这种现象就去改上游组件。
- 浏览器验收脚本的 `node_modules`（`playwright-core`）按任务目录各装一份；新任务目录不会自动带上，
  可从上一个任务目录 `checks/node_modules` 复制，避免重复联网安装。
- 涉及界面改动但暂时拿不到凭据时，可先做不依赖登录的核验：核对 8081 实际下发的 chunk 里包含本次改动的标记
  （例如 `curl http://127.0.0.1:8081/assets/<chunk>.js | grep <marker>`），并确认与本地 `dist` 逐字节一致（`cmp`）。
  这只是产物层证据，**不能替代**真实登录后的浏览器验收。
- 迁移执行器只单向遍历、忽略未知版本，因此新库结构不会阻塞旧镜像运行。

## 14. 汇报口径

中文，简洁。至少给出：改动文件、新镜像标签、部署命令、8081 与 8080 的验证结果（含 `restarts=0`）、回滚点位置、推送状态（未推送 / 已推送 + commit sha）。
