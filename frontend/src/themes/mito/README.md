# Mito 前端主题

将 Sub2API 的界面样式接入独立主题层。视觉参考 `https://sub.anzhiyu.com` 的导航、顶栏、卡片、图表、表单和登录页；保留本项目原有菜单权限、业务字段、登录流程和接口。参考站的账号、数据、标志及私有资源不随主题分发。

## 目录与开关

- `theme.css`：带 `html[data-ui-theme='mito']` 作用域的颜色、字体、布局和通用组件样式，包含浅色、深色和移动端。
- `DashboardStats.vue`、`DashboardCharts.vue`：只消费现有接口的数据；不生成参考站独有的套餐、额度或历史数据。
- `PageHeading.vue`、`AuthHeader.vue`、`ThemeToggle.vue`：复用上游路由标题、站点配置、语言和深浅色偏好。
- `tailwind.mjs`：通过 CSS 变量覆盖上游 primary 色系，保留原色值作为回退。
- `adaptations.mjs`：上游接入点与依赖契约清单。升级时只需要维护发生变化的锚点。
- `frontend/scripts/mito-theme.mjs`：应用、检查、撤销接入点。

默认启用 Mito 主题。构建时设置 `VITE_UI_THEME=upstream` 可使用上游界面。此开关只影响视觉，不影响 API 和计费行为；更改已发布页面需要重新构建和部署。

## 检查与重复应用

以下命令从仓库根目录执行，Node、pnpm 和浏览器均应在固定版本容器中运行。可以通过 `--root=/path/to/sub2api` 指定另一份源码。

```bash
node frontend/scripts/mito-theme.mjs check
node frontend/scripts/mito-theme.mjs apply
```

`apply` 可重复执行，已接入的文件不会再次修改。脚本在写入前检查全部锚点、所用类型/样式契约和文件基线；冲突、歧义或并发修改会返回非零退出码，不继续套用。脚本不操作 Git、数据库、构建产物或运行容器。

## 更新上游后的复用流程

1. 保存当前源码提交和主题开关，确保没有其他会话正在修改接入文件。先执行 `check`。
2. 在升级分支或独立检出目录执行 `remove`，仅撤销清单内的接入修改，保留主题目录与其他定制代码。
3. 按项目原有流程更新 Sub2API 上游。保留主题目录、两个主题脚本和 `.gitignore` 中的脚本例外。不要修改 `origin` 来替代上游来源。
4. 执行 `apply`。若报告冲突，先阅读新版本的布局、属性和接口，再更新 `adaptations.mjs` 对应条目；禁止无条件覆盖新版文件。当前适配基线为 `a519cfeb66c253dd39d7728d20d55b7cf9f79897`，未来任意版本均不能保证免适配。
5. 执行 `check`、前端类型检查、相关 Lint、单测，并检查桌面/移动端与深浅色。通过后再按项目发布流程构建、备份、部署。

```bash
node frontend/scripts/mito-theme.mjs remove
# 在独立分支/检出中更新上游，处理正常的 Git 合并冲突
node frontend/scripts/mito-theme.mjs apply
node frontend/scripts/mito-theme.mjs check
```

`remove` 也会检查锚点。接入代码已被其他改动重写时会停止，需基于当前内容人工处理。脚本不是通用 Git 冲突解决器，也不自动升级依赖。

## 验证

```bash
# 在前端目录
pnpm typecheck
pnpm exec vitest run src/themes/mito/__tests__/DashboardStats.spec.ts src/components/user/dashboard/__tests__/UserDashboardStats.spec.ts src/components/charts/__tests__/TokenUsageTrend.spec.ts
# 测试夹具仅写入指定的隔离任务目录，完成后自动删除
MITO_TEST_TMP_ROOT=/out/adapter-tests node --test scripts/mito-theme.spec.mjs
```

适配器测试覆盖幂等、撤销保留其他定制、锚点冲突/重复、契约缺失以及内容、mtime 和主题依赖的并发变化。主题统计单测校验中英文下今日与累计缓存值及周期标签。限定单测不能替代真实登录、租户权限、线上图表数据和发布验收。

## 双实例部署与启动权限

当前部署使用服务器上的 `/data/sub2api-deploy/docker-compose.yml`：原 `sub2api` 服务继续监听 8080，新增 `sub2api-mito` 服务监听 8081。主题镜像为 `sub2api-mito:2.10.7-ui-20261012T233400Z-entrypoint`，新实例单独挂载 `/data/sub2api-deploy/data-mito`。启动新服务时没有重建原服务、PostgreSQL 或 Redis。

两个实例连接同一 PostgreSQL 和 Redis，因此账号、设置与用量属于同一业务数据库；独立端口与本地数据目录不构成业务数据隔离。当前源码的全部非空迁移已应用且校验一致，新增实例启动前后迁移元数据未变化。

`Dockerfile` 和 `Dockerfile.goreleaser` 显式将 `/app/docker-entrypoint.sh` 权限设置为 `0755`，保证入口切换到 UID/GID 1000 后仍可读取脚本。默认入口和直接以 UID 1000 执行入口均已验证，运行容器也以 UID/GID 1000 执行业务进程。

2026-10-13 在 8081 通过真实登录、仪表盘 API、匿名 401、普通用户管理员 API 403、菜单隐藏与路由保护检查；桌面与手机的深浅色布局、字体、主要动效及减少动态效果通过，浏览器没有 JS 页面错误。管理员页面、跨租户隔离和真实有用量图表尚未验收。

停止新增实例即可回到原 8080 服务；此操作不删除数据库或 `data-mito`，也不会自动撤销共享业务数据：

```bash
docker compose -f /data/sub2api-deploy/docker-compose.yml stop sub2api-mito
```

## 回滚

- 视觉回退：设置 `VITE_UI_THEME=upstream`，重新构建、验证并按发布流程部署。
- 源码回退：运行 `remove`，验证源码；或回退本次独立提交。不要覆盖其他会话的未提交改动。
- 已发布版本回退：恢复发布前备份的静态入口/资源或镜像。主题脚本不会替你回滚线上服务。

## 动效覆盖

已按采集到的参考样式接入仪表盘页面入场（400ms）、统计卡错峰入场（500ms，间隔60ms）、鼠标悬停抬升与按下缩放、下拉菜单进入/退出（240/130ms）、居中弹窗进入/退出（250/200ms）、消息提示进入/退出（340/200ms）、图表提示框弹入（190ms）以及骨架加载扫光（1350ms）。导航进度条沿用上游的1500ms滑动和150/300ms淡入淡出，通过主题 primary 变量统一为蓝色。

系统启用 `prefers-reduced-motion` 时禁用 CSS animation、将过渡压缩到 1ms，并清除主题统计卡、下拉菜单、消息提示和弹窗的对应位移与缩放；保留内容与加载状态。上游按钮的按下缩放仍保留，不将其描述为所有变换均已关闭。抽屉继续从侧边进入，避免居中弹窗动画改变其定位。图表提示框只显示当前图表的真实值，切换到加载/空态或销毁图表时清理；消息提示沿用上游的关闭定时器，不为装饰效果改变通知生命周期。

参考站营销首页、专属业务与尚未采集到的交互不列为已复刻。Canvas图表数据更新继续使用本项目配置，Token趋势和上游独有组件保留功能，使用通用主题样式；不宣称参考站所有页面、隐藏状态或动画逐帧一致。未来升级仍需检查适配契约和实际页面。

## 字体与许可

Outfit 和 Noto Sans SC 字体自托管，不依赖第三方字体请求。文件来源为 Google Fonts 官方仓库：

- `https://github.com/google/fonts/blob/main/ofl/outfit/Outfit%5Bwght%5D.ttf`
- `https://github.com/google/fonts/blob/main/ofl/outfit/OFL.txt`
- `https://github.com/google/fonts/blob/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf`
- `https://github.com/google/fonts/blob/main/ofl/notosanssc/OFL.txt`

字体使用 SIL Open Font License 1.1，许可随 `assets/OFL-Outfit.txt`、`assets/OFL-NotoSansSC.txt` 分发。中文 WOFF2 是覆盖当前前端源码中文字符的子集，CSS 中命名为 `Mito Noto Sans SC`；未覆盖的动态内容由系统中文字体回退。新增中文界面文案时，在固定 Python 容器内用 fonttools 4.59.2 的 `pyftsubset` 和 brotli 1.1.0，基于官方字体及最新源码字符重新生成 `assets/noto-sans-sc-ui.woff2`，字符列表与原始字体放隔离任务目录。

图标复用 Sub2API 的现有图标和几何 SVG。页面中的品牌、菜单和文案仍由原项目设置与国际化资源提供。
