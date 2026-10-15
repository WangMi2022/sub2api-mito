#!/usr/bin/env bash
# =============================================================================
# release-8081.sh — 构建并直接发布 sub2api-mito 定制主题镜像到 8081
# =============================================================================
# 严格遵守 /data/sub2api-deploy/AGENTS.md:
#   * 8080 实例 (sub2api) 全程不重启、不重建、不改镜像
#   * 只在容器内构建 (宿主机 node v16 / go 1.20 太旧)
#   * 只重建 sub2api-mito 服务 (--no-deps --force-recreate)
#   * 绝不 push 到任何远端
#   * 不在仓库里留下 node_modules / store / dist 等构建残留
#
# 用法:
#   scripts/release-8081.sh --slug <短标签> [选项]
# =============================================================================
set -euo pipefail

DEPLOY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$DEPLOY_ROOT/sub2api"
COMPOSE_FILE="$DEPLOY_ROOT/docker-compose.yml"
WORKSPACE_DIR="$DEPLOY_ROOT/workspace"

UPSTREAM_SERVICE="sub2api"
MITO_SERVICE="sub2api-mito"
UPSTREAM_CONTAINER="sub2api"
MITO_CONTAINER="sub2api-mito"
PG_CONTAINER="sub2api-postgres"

# 前端依赖卷是用 Debian bookworm + Node 24 + pnpm 9.15.9 (glibc) 装的,
# 因此构建镜像必须是 glibc; 换 alpine 会因缺少 musl 原生包而失败。
NODE_BUILD_IMAGE="node:24-bookworm-slim"
GO_BUILD_IMAGE="golang:1.27.2-alpine"
PNPM_VERSION="9.15.9"
NODE_VOLUME="sub2api-mito-ui-node24-modules"
GO_VOLUME="sub2api-mito-go-modules"
PNPM_STORE_VOLUME="sub2api-mito-pnpm-store"
PNPM_STORE_DIR="/pnpm-store"
# 构建期出网代理。真实值不入库: 依次从 $MITO_BUILD_PROXY、部署根的 .env
# (BUILD_HTTP_PROXY)、本机 .deploy.local.env 读取; 都没有则不加代理。
DEFAULT_PROXY=""

SLUG="misc"
BASE_IMAGE=""
DO_DEPLOY=1
FULL_BUILD=0
SKIP_TESTS=0
ALLOW_DIRTY=0
ALLOW_REINSTALL=0
BACKUP_DIST=1
BUILD_PROXY=""
TASK=""

# 解析本机代理配置(不打印真实值)
resolve_local_proxy() {
  if [ -n "${MITO_BUILD_PROXY:-}" ]; then printf '%s' "$MITO_BUILD_PROXY"; return; fi
  local f
  for f in "$DEPLOY_ROOT/.env" "$DEPLOY_ROOT/.deploy.local.env"; do
    [ -f "$f" ] || continue
    local v
    v="$(grep -m1 -E '^[[:space:]]*(BUILD_HTTP_PROXY|MITO_BUILD_PROXY)=' "$f" 2>/dev/null | cut -d= -f2- || true)"
    v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
    if [ -n "$v" ]; then printf '%s' "$v"; return; fi
  done
}
BUILD_PROXY="$(resolve_local_proxy)"

info() { printf '[release-8081] %s\n' "$*"; }
warn() { printf '[release-8081] WARN: %s\n' "$*" >&2; }
die()  { printf '[release-8081] ERROR: %s\n' "$*" >&2; exit 1; }
step() { printf '\n=== %s ===\n' "$*"; }

usage() {
  cat <<'USAGE_EOF'
release-8081.sh — 构建并直接发布 sub2api-mito 定制主题镜像到 8081

用法:
  scripts/release-8081.sh --slug <短标签> [选项]

选项:
  --slug SLUG         镜像短标签, 默认 misc (例: --slug group-select)
  --base IMAGE        薄层基础镜像, 默认取当前 8081 已部署镜像
  --no-deploy         只构建不部署
  --full              走仓库 Dockerfile 整包构建 (上游改了 entrypoint/依赖时用)
  --skip-tests        跳过 typecheck / lint:check (mito-theme check 仍会执行)
  --skip-dist-backup  不备份现有前端 dist
  --allow-dirty       允许 git 工作区有未提交改动
  --allow-reinstall   允许清空 node_modules 卷后重装 (仅在卷损坏时使用)
  --node-image IMG    node 构建镜像, 默认 node:24-bookworm-slim (必须 glibc)
  --pnpm-version V    pnpm 版本, 默认 9.15.9 (必须与依赖卷一致)
  --proxy URL         容器内构建代理, 默认取自 .env 的 BUILD_HTTP_PROXY, 传 none 关闭
  -h, --help          显示帮助
USAGE_EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --slug) SLUG="${2:?--slug 需要参数}"; shift 2 ;;
    --base) BASE_IMAGE="${2:?--base 需要参数}"; shift 2 ;;
    --no-deploy|--build-only) DO_DEPLOY=0; shift ;;
    --full) FULL_BUILD=1; shift ;;
    --skip-tests) SKIP_TESTS=1; shift ;;
    --skip-dist-backup) BACKUP_DIST=0; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --allow-reinstall) ALLOW_REINSTALL=1; shift ;;
    --node-image) NODE_BUILD_IMAGE="${2:?--node-image 需要参数}"; shift 2 ;;
    --pnpm-version) PNPM_VERSION="${2:?--pnpm-version 需要参数}"; shift 2 ;;
    --proxy) BUILD_PROXY="${2:?--proxy 需要参数}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数: $1 (用 --help 查看用法)" ;;
  esac
done

case "$SLUG" in
  [a-z0-9]*) ;;
  *) die "--slug 必须以小写字母或数字开头" ;;
esac
case "$SLUG" in
  *[!a-z0-9-]*) die "--slug 只允许小写字母、数字和连字符" ;;
esac

on_fail() {
  printf '[release-8081] 失败。\n' >&2
  if [ -n "$TASK" ] && [ -d "$TASK" ]; then
    printf '[release-8081] 备份与部分产物在 %s\n' "$TASK" >&2
  fi
  printf '[release-8081] 若 8081 未成功部署, compose 的 image 行恢复用:\n' >&2
  printf '[release-8081]   %s/backup/docker-compose.yml.before\n' "${TASK:-<task>}" >&2
  printf '[release-8081] 8080 未被本脚本改动。\n' >&2
}
trap on_fail ERR

# -----------------------------------------------------------------------------
# Step 0 前置检查
# -----------------------------------------------------------------------------
step "Step 0 前置检查"

for c in docker git curl; do command -v "$c" >/dev/null 2>&1 || die "缺少命令: $c"; done
[ -f "$COMPOSE_FILE" ] || die "找不到 $COMPOSE_FILE"
[ -d "$REPO_DIR/.git" ] || die "$REPO_DIR 不是 git 仓库"

docker inspect "$UPSTREAM_CONTAINER" >/dev/null 2>&1 \
  || die "8080 容器 $UPSTREAM_CONTAINER 不存在 —— 停止操作"
docker inspect "$MITO_CONTAINER" >/dev/null 2>&1 \
  || die "8081 容器 $MITO_CONTAINER 不存在 —— 请先确认部署拓扑"

UPSTREAM_STARTED_AT="$(docker inspect -f '{{.State.StartedAt}}' "$UPSTREAM_CONTAINER")"
UPSTREAM_RESTARTS_BEFORE="$(docker inspect -f '{{.RestartCount}}' "$UPSTREAM_CONTAINER")"
UPSTREAM_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$UPSTREAM_CONTAINER")"
UPSTREAM_HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$UPSTREAM_CONTAINER")"
CURRENT_MITO_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$MITO_CONTAINER")"

info "8080 $UPSTREAM_CONTAINER image=$UPSTREAM_IMAGE restarts=$UPSTREAM_RESTARTS_BEFORE health=$UPSTREAM_HEALTH"
info "8081 $MITO_CONTAINER image=$CURRENT_MITO_IMAGE"
[ "$UPSTREAM_HEALTH" = "healthy" ] || warn "8080 当前健康状态为 $UPSTREAM_HEALTH, 请留意"

if [ "$FULL_BUILD" = "0" ]; then
  [ -n "$BASE_IMAGE" ] || BASE_IMAGE="$CURRENT_MITO_IMAGE"
  docker image inspect "$BASE_IMAGE" >/dev/null 2>&1 \
    || die "基础镜像不存在: $BASE_IMAGE (用 --base 指定)"
  info "薄层基础镜像: $BASE_IMAGE"
fi

docker image inspect "$NODE_BUILD_IMAGE" >/dev/null 2>&1 || {
  info "本地缺少 $NODE_BUILD_IMAGE, 尝试拉取"
  docker pull "$NODE_BUILD_IMAGE" >/dev/null 2>&1 \
    || die "无法获取 $NODE_BUILD_IMAGE, 用 --node-image 指定已有镜像"
}
docker image inspect "$GO_BUILD_IMAGE" >/dev/null 2>&1 || die "缺少构建镜像: $GO_BUILD_IMAGE"

for vol in "$NODE_VOLUME" "$GO_VOLUME"; do
  docker volume inspect "$vol" >/dev/null 2>&1 || die "缺少缓存卷: $vol"
done
docker volume inspect "$PNPM_STORE_VOLUME" >/dev/null 2>&1 \
  || docker volume create "$PNPM_STORE_VOLUME" >/dev/null \
  || die "无法创建 pnpm store 卷: $PNPM_STORE_VOLUME"

COMPOSE_MITO_IMAGE_LINES="$(grep -c '^[[:space:]]*image:[[:space:]]*sub2api-mito:' "$COMPOSE_FILE" || true)"
[ "$COMPOSE_MITO_IMAGE_LINES" = "1" ] \
  || die "compose 里 sub2api-mito 的 image 行有 $COMPOSE_MITO_IMAGE_LINES 处, 预期 1 处, 停止操作"

cd "$REPO_DIR"
if [ "$ALLOW_DIRTY" = "0" ] && [ -n "$(git status --porcelain)" ]; then
  git status --short | head -20
  die "git 工作区有未提交改动。先提交, 或用 --allow-dirty 明确接受"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SRC_SHA="$(git rev-parse HEAD)"
SRC_MANIFEST_SHA="$(git ls-files -s | sha256sum | cut -d' ' -f1)"
UPSTREAM_VERSION="$(sh "$REPO_DIR/backend/scripts/resolve-version.sh" | tr -d '\r\n')"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
NEW_TAG="sub2api-mito:${UPSTREAM_VERSION}-ui-${TS}-${SLUG}"

info "分支=$BRANCH commit=$SRC_SHA"
info "上游版本=$UPSTREAM_VERSION  新镜像标签=$NEW_TAG"

TASK="$WORKSPACE_DIR/sub2api-${SLUG}-${TS}-$$"
mkdir -p "$TASK/backup" "$TASK/build" "$TASK/checks"
printf '%s\n' "$NEW_TAG" > "$TASK/image-tag.txt"
info "任务目录: $TASK"

# -----------------------------------------------------------------------------
# Step 1 备份
# -----------------------------------------------------------------------------
step "Step 1 备份"

cp "$COMPOSE_FILE" "$TASK/backup/docker-compose.yml.before"
git -C "$REPO_DIR" status --porcelain > "$TASK/build/git-status.txt" 2>&1 || true
git -C "$REPO_DIR" log --oneline -3 > "$TASK/build/git-log.txt" 2>&1 || true
info "已备份 compose 与 git 状态"

if [ "$BACKUP_DIST" = "1" ] && [ -d "$REPO_DIR/backend/internal/web/dist" ]; then
  tar czf "$TASK/backup/dist-before-${SLUG}.tar.gz" -C "$REPO_DIR/backend/internal/web" dist
  info "已备份前端 dist -> backup/dist-before-${SLUG}.tar.gz"
fi

docker images sub2api-mito --format '{{.Tag}}' | head -8 > "$TASK/build/rollback-images.txt" 2>/dev/null || true

if docker exec -i "$PG_CONTAINER" psql -U sub2api -d sub2api -tAc \
     "select count(*) from schema_migrations;" > "$TASK/build/migrations-count.txt" 2>/dev/null; then
  docker exec -i "$PG_CONTAINER" psql -U sub2api -d sub2api -tAc \
    "select filename from schema_migrations order by filename desc limit 1;" \
    > "$TASK/build/migrations-latest.txt" 2>/dev/null || true
  info "迁移: $(tr -d '\n' < "$TASK/build/migrations-count.txt") 条, 最新 $(tr -d '\n' < "$TASK/build/migrations-latest.txt")"
else
  warn "无法读取 schema_migrations, ROLLBACK.md 将标注为未采集"
fi

# -----------------------------------------------------------------------------
# Step 2 构建
# -----------------------------------------------------------------------------
step "Step 2 构建"

PROXY_ARGS=()
if [ "$BUILD_PROXY" != "none" ]; then
  PROXY_ARGS=(-e "HTTP_PROXY=$BUILD_PROXY" -e "HTTPS_PROXY=$BUILD_PROXY"
              -e "http_proxy=$BUILD_PROXY" -e "https_proxy=$BUILD_PROXY"
              -e "NO_PROXY=localhost,127.0.0.1,postgres,redis")
  info "容器构建代理: $BUILD_PROXY"
fi

NODE_ARGS=(
  --rm
  "${PROXY_ARGS[@]+"${PROXY_ARGS[@]}"}"
  -e CI=true
  -e "WANT_PNPM=pnpm@${PNPM_VERSION}"
  -e "STORE_DIR=$PNPM_STORE_DIR"
  -v "$REPO_DIR:/app"
  -v "$NODE_VOLUME:/app/frontend/node_modules"
  -v "$PNPM_STORE_VOLUME:$PNPM_STORE_DIR"
  -w /app
)

if [ "$FULL_BUILD" = "1" ]; then
  info "整包构建模式: 使用仓库 Dockerfile"
  docker buildx build --load \
    --build-arg "VERSION=${UPSTREAM_VERSION}" \
    --build-arg "COMMIT=${SRC_SHA}" \
    --build-arg "DATE=${BUILD_DATE}" \
    -t "$NEW_TAG" \
    -f "$REPO_DIR/Dockerfile" "$REPO_DIR"
else
  # -- 依赖卷一致性守护: 平台/pnpm 版本不匹配时报错, 而不是静默重装
  if [ "$ALLOW_REINSTALL" = "0" ]; then
    info "校验 node_modules 卷与构建镜像的一致性"
    if guard_out="$(docker run "${NODE_ARGS[@]}" "$NODE_BUILD_IMAGE" sh -c '
        corepack enable >/dev/null 2>&1
        corepack prepare "$WANT_PNPM" --activate >/dev/null 2>&1
        [ -d /app/frontend/node_modules/.pnpm ] || { echo "依赖卷为空, 将执行首次安装"; exit 0; }
        LIBC=$(if ls /lib/ld-musl-* >/dev/null 2>&1; then echo musl; else echo gnu; fi)
        HAVE="pnpm@$(pnpm -v)"
        VOL_PNPM=$(grep -m1 "^packageManager:" /app/frontend/node_modules/.modules.yaml 2>/dev/null | awk "{print \$2}" || true)
        VOL_STORE=$(grep -m1 "^storeDir:" /app/frontend/node_modules/.modules.yaml 2>/dev/null | awk "{print \$2}" || true)
        echo "libc=$LIBC 镜像pnpm=$HAVE 卷pnpm=${VOL_PNPM:-未知} 卷store=${VOL_STORE:-未知}"
        if [ -n "$VOL_PNPM" ] && [ "$VOL_PNPM" != "$HAVE" ]; then
          echo "MISMATCH_PNPM"; exit 4
        fi
        if ! ls -d "/app/frontend/node_modules/.pnpm/@rollup+rollup-linux-x64-${LIBC}@"* >/dev/null 2>&1; then
          echo "MISMATCH_PLATFORM"; exit 5
        fi
        echo "GUARD_OK"' 2>&1)"; then
      info "$guard_out"
    else
      rc=$?
      printf '%s\n' "$guard_out" | sed 's/^/[release-8081]   /' >&2
      case "$guard_out" in
        *MISMATCH_PLATFORM*)
          die "依赖卷缺少当前镜像 libc 的原生包。用 glibc 镜像 ($NODE_BUILD_IMAGE) 构建, 或显式 --allow-reinstall 重建依赖卷" ;;
        *MISMATCH_PNPM*)
          die "依赖卷的 pnpm 版本与构建 pnpm 不一致。用 --pnpm-version 对齐, 或显式 --allow-reinstall 重建依赖卷" ;;
        *) die "依赖卷一致性校验失败 (exit $rc)" ;;
      esac
    fi
  else
    warn "--allow-reinstall: 将清空 node_modules 卷并重新安装全部依赖"
    docker run "${NODE_ARGS[@]}" "$NODE_BUILD_IMAGE" sh -c '
      set -eu
      if [ -d /app/frontend/node_modules ]; then
        find /app/frontend/node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} +
      fi
      echo "依赖卷已清空"'
  fi

  # -- 依赖安装 (store 落在独立卷, 不污染仓库)
  info "安装前端依赖 (pnpm $PNPM_VERSION, store=$PNPM_STORE_DIR)"
  if [ "$ALLOW_REINSTALL" = "1" ]; then
    INSTALL_FLAGS="--frozen-lockfile"
  else
    INSTALL_FLAGS="--frozen-lockfile --prefer-offline"
  fi
  docker run "${NODE_ARGS[@]}" "$NODE_BUILD_IMAGE" sh -c "
      set -eu
      corepack enable >/dev/null 2>&1
      corepack prepare \"\$WANT_PNPM\" --activate >/dev/null 2>&1
      cd /app/frontend
      pnpm install $INSTALL_FLAGS --store-dir=\"\$STORE_DIR\""

  if [ -e "$REPO_DIR/.pnpm-store" ]; then
    die "pnpm 在仓库根目录留下了 .pnpm-store —— store 未落在 $PNPM_STORE_DIR, 停止发布"
  fi

  # -- 主题契约检查 + 前端静态检查
  if [ "$SKIP_TESTS" = "0" ]; then
    info "主题契约检查 + 前端类型检查 / Lint"
    docker run "${NODE_ARGS[@]}" "$NODE_BUILD_IMAGE" sh -c '
      set -eu
      corepack enable >/dev/null 2>&1
      corepack prepare "$WANT_PNPM" --activate >/dev/null 2>&1
      node frontend/scripts/mito-theme.mjs check
      cd frontend
      pnpm run typecheck
      pnpm run lint:check'
  else
    info "跳过 typecheck/lint, 仅做主题契约检查"
    docker run "${NODE_ARGS[@]}" "$NODE_BUILD_IMAGE" sh -c '
      set -eu
      node frontend/scripts/mito-theme.mjs check'
  fi

  # -- 前端构建 (产物直接落到 backend/internal/web/dist)
  info "前端构建"
  docker run "${NODE_ARGS[@]}" "$NODE_BUILD_IMAGE" sh -c '
      set -eu
      corepack enable >/dev/null 2>&1
      corepack prepare "$WANT_PNPM" --activate >/dev/null 2>&1
      cd /app/frontend
      pnpm run build'

  [ -f "$REPO_DIR/backend/internal/web/dist/index.html" ] \
    || die "前端产物缺失: backend/internal/web/dist/index.html"

  # -- 后端构建 (-tags embed 把 dist 编进二进制)
  info "后端构建 -tags embed"
  docker run --rm \
    "${PROXY_ARGS[@]+"${PROXY_ARGS[@]}"}" \
    -e "VERSION_VALUE=$UPSTREAM_VERSION" \
    -e "COMMIT_VALUE=$SRC_SHA" \
    -e "DATE_VALUE=$BUILD_DATE" \
    -e "GOPROXY_VALUE=${GOPROXY:-https://goproxy.cn,direct}" \
    -v "$REPO_DIR:/src" \
    -v "$GO_VOLUME:/go/pkg/mod" \
    -v "$TASK/build:/out" \
    -w /src/backend "$GO_BUILD_IMAGE" sh -c '
      set -eu
      apk add --no-cache git ca-certificates tzdata >/dev/null 2>&1 || true
      CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOPROXY="$GOPROXY_VALUE" GOSUMDB=sum.golang.google.cn \
      go build -tags embed \
        -ldflags="-s -w -X main.Version=${VERSION_VALUE} -X main.Commit=${COMMIT_VALUE} -X main.Date=${DATE_VALUE} -X main.BuildType=release" \
        -trimpath -o /out/sub2api ./cmd/server'

  [ -f "$TASK/build/sub2api" ] || die "后端二进制缺失: $TASK/build/sub2api"
  info "后端二进制: $(du -h "$TASK/build/sub2api" | cut -f1)"

  # -- 嵌入校验
  # `-tags embed` 把编译时刻磁盘上的 dist 打进二进制。若前后端来自不同检出或不同时刻
  # (例如只在别处重建了前端, 或后端单独重编), 二进制会静默带上过期的前端。
  # 这里直接比对二进制里是否含刚构建的 dist 入口, 不一致就停下。
  DIST_ENTRY="$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$REPO_DIR/backend/internal/web/dist/index.html" | head -1 || true)"
  [ -n "$DIST_ENTRY" ] || die "无法从 dist/index.html 解析入口 chunk"
  grep -qa "$DIST_ENTRY" "$TASK/build/sub2api" \
    || die "后端二进制未嵌入当前 dist 入口 (期望 $DIST_ENTRY) —— 前后端产物不一致, 请确认前端与后端在同一检出、同一批次构建"
  info "嵌入校验通过: 二进制包含 $DIST_ENTRY"

  # -- 薄层镜像: 复用基础镜像的运行时/entrypoint/依赖, 只替换二进制
  info "构建薄层镜像 (基础: $BASE_IMAGE)"
  cat > "$TASK/build/Dockerfile" <<DOCKERFILE_EOF
FROM ${BASE_IMAGE}
COPY --chown=sub2api:sub2api sub2api /app/sub2api
RUN chmod 0755 /app/sub2api
LABEL org.opencontainers.image.source="https://github.com/WangMi2022/sub2api-mito" \\
      mito.source-base=${SRC_SHA} \\
      mito.source-manifest-sha256=${SRC_MANIFEST_SHA}
DOCKERFILE_EOF

  docker build -t "$NEW_TAG" "$TASK/build"
fi

docker image inspect "$NEW_TAG" >/dev/null 2>&1 || die "镜像构建失败: $NEW_TAG"
info "镜像就绪: $NEW_TAG"

# -----------------------------------------------------------------------------
# Step 3 部署 8081
# -----------------------------------------------------------------------------
if [ "$DO_DEPLOY" = "1" ]; then
  step "Step 3 部署 8081 (只重建 $MITO_SERVICE)"

  sed -i "s|^\([[:space:]]*image:\)[[:space:]]*sub2api-mito:.*$|\1 ${NEW_TAG}|" "$COMPOSE_FILE"

  grep -q "^[[:space:]]*image:[[:space:]]*${NEW_TAG}$" "$COMPOSE_FILE" \
    || die "compose 镜像行改写失败, 恢复用 $TASK/backup/docker-compose.yml.before"
  grep -q "^[[:space:]]*image:[[:space:]]*${UPSTREAM_IMAGE}$" "$COMPOSE_FILE" \
    || die "compose 里 8080 的 image 行被意外改动, 恢复用 $TASK/backup/docker-compose.yml.before"

  info "compose 第 $(grep -n "image: ${NEW_TAG}" "$COMPOSE_FILE" | cut -d: -f1) 行 -> $NEW_TAG"

  cd "$DEPLOY_ROOT"
  docker compose up -d --no-deps --force-recreate "$MITO_SERVICE"

  # ---------------------------------------------------------------------------
  # Step 4 验证
  # ---------------------------------------------------------------------------
  step "Step 4 验证"

  code=""
  for _ in $(seq 1 40); do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://127.0.0.1:8081/health || true)"
    [ "$code" = "200" ] && break
    sleep 2
  done
  [ "$code" = "200" ] || die "8081 /health 返回 ${code:-无响应}"

  MITO_HEALTH="none"
  for _ in $(seq 1 40); do
    MITO_HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$MITO_CONTAINER")"
    [ "$MITO_HEALTH" = "healthy" ] && break
    sleep 3
  done
  [ "$MITO_HEALTH" = "unhealthy" ] && die "8081 容器健康检查为 unhealthy"

  code80="$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://127.0.0.1:8080/health || true)"
  [ "$code80" = "200" ] || die "8080 /health 返回 $code80 —— 立即检查 $UPSTREAM_CONTAINER"

  # 运行容器内的二进制自报版本与 commit, 证明跑的就是本次构建
  VERSION_RAW="$(docker exec "$MITO_CONTAINER" /app/sub2api --version 2>&1 || true)"
  VERSION_OUT="$(printf '%s' "$VERSION_RAW" | grep -oE 'Sub2API [^()]*\(commit:[^)]*\)' | head -1 || true)"
  [ -n "$VERSION_OUT" ] || VERSION_OUT="$(printf '%s' "$VERSION_RAW" | tr '\n' ' ')"
  RUNTIME_IMAGE_ID="$(docker inspect -f '{{.Image}}' "$MITO_CONTAINER")"
  BUILT_IMAGE_ID="$(docker image inspect -f '{{.Id}}' "$NEW_TAG")"
  UPSTREAM_STARTED_AT_AFTER="$(docker inspect -f '{{.State.StartedAt}}' "$UPSTREAM_CONTAINER")"
  UPSTREAM_RESTARTS_AFTER="$(docker inspect -f '{{.RestartCount}}' "$UPSTREAM_CONTAINER")"

  printf '\n---- 验证结果 ----\n'
  printf '8081 /health       : %s\n' "$code"
  printf '8081 容器健康       : %s\n' "$MITO_HEALTH"
  printf '8081 运行版本       : %s\n' "$(printf '%s' "$VERSION_OUT" | head -c 200)"
  printf '8081 镜像(标签)     : %s\n' "$(docker inspect -f '{{.Config.Image}}' "$MITO_CONTAINER")"
  printf '8081 镜像(运行=构建) : %s\n' "$([ "$RUNTIME_IMAGE_ID" = "$BUILT_IMAGE_ID" ] && echo yes || echo NO)"
  printf '8080 /health       : %s\n' "$code80"
  printf '8080 restarts      : %s (改动前 %s)\n' "$UPSTREAM_RESTARTS_AFTER" "$UPSTREAM_RESTARTS_BEFORE"
  printf '8080 未被重建       : %s\n' "$([ "$UPSTREAM_STARTED_AT_AFTER" = "$UPSTREAM_STARTED_AT" ] && echo yes || echo NO)"
  printf '%s\n' '------------------'

  [ "$RUNTIME_IMAGE_ID" = "$BUILT_IMAGE_ID" ] || die "8081 运行的镜像不是本次构建的镜像"
  [ "$UPSTREAM_RESTARTS_AFTER" = "0" ] || die "8080 重启次数不为 0"
  [ "$UPSTREAM_STARTED_AT_AFTER" = "$UPSTREAM_STARTED_AT" ] || die "8080 容器被重建过"
  info "8080 全程未受影响"
else
  step "Step 3/4 跳过部署 (--no-deploy)"
  info "镜像已构建: $NEW_TAG"
  info "手动部署: 改 $COMPOSE_FILE 中 sub2api-mito 的 image 行后执行"
  info "  cd $DEPLOY_ROOT && docker compose up -d --no-deps --force-recreate sub2api-mito"
fi

# -----------------------------------------------------------------------------
# Step 5 回滚材料
# -----------------------------------------------------------------------------
step "Step 5 生成回滚材料"

MIG_COUNT="$(tr -d '\r\n' < "$TASK/build/migrations-count.txt" 2>/dev/null || true)"
MIG_LATEST="$(tr -d '\r\n' < "$TASK/build/migrations-latest.txt" 2>/dev/null || true)"
ROLLBACK_POINTS="$(docker images sub2api-mito --format '- {{.Tag}}  ({{.CreatedSince}})' | head -6 || true)"
if [ "$DO_DEPLOY" = "1" ]; then DEPLOY_STATE="已部署到 8081"; else DEPLOY_STATE="仅构建, 未部署"; fi

{
  echo "# sub2api-mito ${SLUG} — 回滚材料"
  echo
  echo "任务时间: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "仓库: ${REPO_DIR} (branch ${BRANCH})"
  echo "源码提交: ${SRC_SHA}"
  echo "上游版本: ${UPSTREAM_VERSION}"
  echo
  echo "## 本次发布"
  echo "- 状态: ${DEPLOY_STATE}"
  echo "- 容器: ${MITO_CONTAINER}, 端口 8081->8080"
  echo "- 镜像: ${NEW_TAG}"
  echo "- 基础镜像: ${BASE_IMAGE:-整包构建}"
  echo "- compose: ${COMPOSE_FILE} (sub2api-mito 服务)"
  echo "- 任务目录: ${TASK}"
  echo "- 推送: **未推送** (推送前必须征得用户同意)"
  echo
  echo "## 8080 实例"
  echo "- 容器 \`sub2api\` 镜像 \`${UPSTREAM_IMAGE}\` 全程未改动"
  echo "- 改动前 restarts=${UPSTREAM_RESTARTS_BEFORE}, StartedAt=${UPSTREAM_STARTED_AT}"
  if [ "$DO_DEPLOY" = "1" ]; then
    echo "- 部署后 restarts=${UPSTREAM_RESTARTS_AFTER:-未采集}, StartedAt=${UPSTREAM_STARTED_AT_AFTER:-未采集}"
  fi
  echo
  echo "## 回滚点"
  echo "本次发布前的 8081 镜像:"
  echo '```'
  echo "${CURRENT_MITO_IMAGE}"
  echo '```'
  echo "近期可用镜像 (新->旧):"
  echo '```'
  echo "${ROLLBACK_POINTS}"
  echo '```'
  echo
  echo "## 回滚步骤 (仅镜像层)"
  echo "1. 备份当前 compose: \`cp ${COMPOSE_FILE} ${TASK}/backup/docker-compose.yml.before-rollback\`"
  echo "2. 编辑 ${COMPOSE_FILE}, 把 sub2api-mito 服务的 image 行改回目标标签"
  echo "3. \`cd ${DEPLOY_ROOT} && docker compose up -d --no-deps --force-recreate sub2api-mito\`"
  echo "4. \`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/health\`  期望 200"
  echo "5. \`docker inspect -f '{{.RestartCount}} {{.State.Health.Status}}' sub2api\`  必须仍是 0 / healthy"
  echo
  echo "## 代码回滚"
  echo "- 本次源码提交: ${SRC_SHA}"
  echo "- 回滚走 \`backup/*\` 分支或 tag, 不要覆盖其他会话的未提交改动"
  echo
  echo "## 数据库"
  echo "- 已应用迁移: ${MIG_COUNT:-未采集} 条, 最新 ${MIG_LATEST:-未采集}"
  echo "- 迁移为追加式、向前兼容: 回滚旧镜像 **不需要** 回滚数据库"
  echo "- 如需数据恢复: 用快照 pg_restore 到独立库核对后再切换, 禁止直接覆盖生产库"
  echo
  echo "## 备份文件"
  echo "- backup/docker-compose.yml.before : 改动前 compose"
  if [ "$BACKUP_DIST" = "1" ]; then
    echo "- backup/dist-before-${SLUG}.tar.gz : 构建前前端产物"
  fi
  echo "- build/git-status.txt, build/git-log.txt : 改动前 git 状态"
  echo "- build/rollback-images.txt : 本次记录的回滚点"
} > "$TASK/ROLLBACK.md"

printf '%s\n' "$TASK" > "$WORKSPACE_DIR/.sub2api-${SLUG}-current"
info "回滚材料: $TASK/ROLLBACK.md"

step "完成"
info "新镜像标签 : $NEW_TAG"
info "任务目录   : $TASK"
[ "$DO_DEPLOY" = "1" ] && info "已发布到 8081, 8080 未受影响"
info "推送状态   : 未推送。若要 push 必须先征得用户同意:"
info "             git -C $REPO_DIR push git@github.com:WangMi2022/sub2api-mito.git $BRANCH"
