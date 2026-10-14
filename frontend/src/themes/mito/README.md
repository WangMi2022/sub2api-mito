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


## 请求日志与使用量统计

Mito 主题将个人使用记录拆成两个页面：

- `/usage`：请求日志。折叠筛选、独立日期输入、记录标题栏、紧凑列、数值提示、CSV、列设置与分页；错误请求继续遵守公开设置开关。
- `/usage-stats`：使用量统计。保留原有汇总卡、模型/分组/端点分布与 Token 趋势，单独筛选和刷新。

页面与筛选、表格、分页组件放在主题目录。日志页只请求日志及筛选选项；统计页只请求汇总及图表，不加载逐条记录。模型筛选支持从已加载结果选择或输入完整模型名；两个页面的筛选各自独立。观察员继续使用原权限对应的管理用量页，管理员全局用量入口不变。上游模式不注册新统计路由，个人用量仍使用原页面。

日志表格沿用系统字体、11px 表头、12px 数据、37px 基准行高；映射等多行内容可以增高。输入/输出/缓存、首字、TPS、耗时、费用和倍率分列。缓存命中率沿用 Token 趋势图的分母（输入 + 缓存读取 + 缓存创建）；TPS 沿用上游总耗时口径，图片/视频等不可计算时显示占位。未提供的 HTTP 方法、成功状态码及尝试次数不伪造。费用与 Token 详情复用上游渲染，图片用量等细节仍可查看。分组对应本项目真实 group，不伪装为参考站的渠道业务。

新增接入点已登记在 adaptations.mjs：路由、个人菜单、UsageEntryView、双语文案与 UsageTable 插槽。上游更新时运行 check，再按前述 remove/apply 流程验证；依赖契约冲突会停止。主题列偏好单独保存，分页遵循站点配置。新页面仍需经过授权后的 8081 浏览器验收，不能以单测或之前版本的验收代替。

## 模型广场

模型广场样式独立放在 `model-plaza.css`，由主题入口导入，全部受 `html[data-ui-theme='mito']` 限定。筛选区根据内容区域宽度切换一列或两列，平台、分组、倍率、搜索的 DOM 与键盘顺序一致；选中、禁用和焦点状态保留区分。窄屏价格表保留全部字段并支持横向滚动与键盘访问。

分组标题、模型名和实付价为主要阅读层级，官方价格使用次要文字和浅色底；浅色、深色、触屏尺寸与减少动态效果共用主题变量。管理员配置的 Markdown 说明继续展示。视觉接入仅添加模板语义与样式挂点，不复制或修改筛选、计费、阶梯价、缓存、分时价、高峰和专属倍率逻辑。

四个广场组件的挂点已登记到 `adaptations.mjs`，并校验独立样式、入口导入与分组徽章结构。上游升级继续使用 `check/remove/apply` 流程；结构冲突会停止，不能以旧样式无条件覆盖新组件。本轮界面修改仍需部署确认后的桌面、手机、深浅色浏览器验收。

## 管理端使用记录

管理端及观察员使用记录的外观集中在 `admin-usage.css`，限定于 Mito 主题和 `.mito-admin-usage` 页面。汇总卡、日期栏、明细页签与筛选栏使用统一间距；筛选字段随可用宽度排列，操作区独立成行。桌面表格采用系统字体与等宽数字、轻分隔线和行悬停，密钥、模型、推理强度与实付费用加深加粗；账户成本及模型映射为次级信息，延迟状态色、长上下文提示和异常标记保留。邮箱、账户名和分组名可换行，完整信息不截断；手机继续使用原有记录卡片、排序和分页。

上游修改包括展示 class、列 class 元数据、页签选中状态语义和筛选折叠接入点；查询、计费、导出、清理、观察员权限与延迟详情沿用原逻辑。`UsageView.vue`、共享 `UsageTable.vue` 和 `UsageFilters.vue` 的挂点已登记到适配器，列样式绑定字段名，不依赖可见列次序。新增样式也纳入入口和依赖契约；更新仍走 `check/remove/apply`。视觉与交互效果需在确认部署后的 8081 完成浏览器验收。

## 管理端使用记录请求日志列表

管理端使用记录的明细列表改为与个人请求记录一致的紧凑表格：`AdminRequestLogTable.vue` 复用 `UsageTable` 的 `request-log` 变体、数值格式与详情提示，`adminRequestLogColumns.ts` 定义列顺序、默认宽度和默认隐藏集合。原先堆在单格里的 Token、费用和耗时拆成独立列：首字延迟、TPS、总耗时、输入/输出/缓存读取/缓存创建 Token、缓存命中率、实付费用、特殊计费与倍率各自成列；费用列同时展示用户实付和账号计费。

管理员专属字段已补齐：用户与账号、上游模型与响应模型差异、账号倍率与账号费用、缓存 5m/1h 与 TTL 覆盖、图片数量/尺寸/Token/费用、计费类型、计费等级、渠道、服务等级、请求 ID、上游请求 ID 与 User-Agent。审计类字段默认隐藏，通过列设置开启；列显示偏好沿用 `usage-hidden-columns` 与版本迁移，列宽单独保存在 `mito-admin-usage-column-widths-v1`，桌面可拖动表头调整。

表格通过 `UsageTable` 的 `resizableColumns` 与 `columnWidthStorageKey` 透传到共享表格，默认关闭，不影响其他调用方。`UsageView.vue` 只替换表格组件与列来源，查询、排序、导出、清理、观察员权限与用户下钻沿用原逻辑。挂点与新增文件已登记适配器，更新仍按 `check/remove/apply` 执行；桌面与手机视觉需在确认部署后的 8081 验收。

## 管理端筛选、账号与操作日志

`FilterSection.vue` 与 `filter-section.css` 为管理端使用记录、错误请求、用户排行和操作日志提供共用的筛选容器。字段网格明确占满内容宽度，按容器宽度切换一至五列；操作日志最多四列。筛选默认收起，可用键盘展开或折叠，按钮提供展开状态与受控区域语义；收起时保留操作按钮和选中数量。字段使用 `v-show` 保持挂载，筛选值、搜索组件、用户下钻回显与原有事件不因折叠丢失。上游主题不显示折叠按钮，并始终展示字段。

`accounts.css` 只作用于账号表格：减少单元格留白、额度统计徽章与窗口间距，桌面操作按钮改为横向排列；触屏按钮保留至少 44px 点击高度。额度值、窗口、状态、详情和菜单均保留；虚拟滚动继续使用上游动态行高测量，不对复杂账号行固定高度。`audit-log.css` 统一操作日志表头、行距、操作者、动作、详情入口及手机卡片，保留结果状态色和完整的邮箱、动作与路径。详情继续展示已脱敏数据，清理操作的确认与 TOTP 流程不变。

共享筛选、账号行和审计列表接入点及样式契约已登记到适配器，后续升级仍按 `check/remove/apply` 验证。本轮检查限于 Docker 内类型、相关 Lint、单元测试、CSS 解析和适配器测试；管理页面的真实浏览器视觉、管理员权限与线上数据仍需确认部署后验收。


## 列宽调整


账号管理桌面表格可拖动表头右侧分隔线调整整列宽度；左右方向键每次调整 8px，按住 Shift 调整 24px，Home/End 到达最小/最大宽度。双击分隔线恢复该列默认宽度，拖动中按 Escape 取消本次调整。列宽按字段名保存在浏览器的独立偏好中，隐藏再显示、刷新和排序不会错配；浏览器禁止存储时仍可调整当前页面。

共享表格通过可选的 resizableColumns 与 columnWidthStorageKey 接入，默认关闭；账号页仅在 Mito 主题启用。列配置可指定 width/minWidth/maxWidth/resizable，勾选列保持固定宽度，名称与操作的固定定位沿用原逻辑。额度窗口与按钮保留合理最小宽度，普通文本随列宽换行，手机继续使用卡片。实现位于 useTableColumnResize.ts，账号默认尺寸位于 accountTableColumns.ts，样式位于 table-resize.css。

所有列表表头在 Mito 主题下居中显示，排序箭头随标题一起居中；表头按词换行，窄列（如账号 ID）不会再从单词中间断开，正文单元格仍允许长标识符任意换行。账号表的列宽在拖动后即时生效并写入 `mito-account-column-widths-v1`，名称列与平台/类型列的最小/默认宽度已按真实徽标尺寸重新标定。

## 侧边栏保持上游外观

侧边栏已不再使用 Mito 的品牌区、菜单项、子菜单和底部工具栏覆盖：`sidebar.css` 及其在 `theme.css`、`AppLayout.vue`、`AppSidebar.vue`、`index.ts`、`adaptations.mjs` 中的接入点已全部移除，导航结构与视觉完全沿用上游 `style.css`。菜单权限、折叠、FeatureSearch 与主题切换等既有功能行为不受影响；后续如再改侧边栏，建议新增独立主题文件并登记契约，避免与上游结构耦合。

## 可用渠道

`available-channels.css` 美化用户端「可用渠道」页（`/available-channels`）：工具条搜索框与刷新按钮统一 12px 圆角、42px 高与悬浮抬升，刷新图标在悬停时旋转 180°；卡片改为 20px 圆角、双层柔和投影并在顶部叠加蓝绿渐变高光，表头粘性固定、加粗放大并带渐变下划线，每个渠道用一个 `tbody` 播放错峰入场动画，悬停时渠道块左侧展开渐变指示条、平台徽章与分组徽章轻微上浮并投出同色阴影，模型 chip 悬停放大加深。窄屏继续使用上游卡片布局，只保留标题渐变下划线与入场上浮；`prefers-reduced-motion` 下关闭全部动画与位移。样式只挂在 `data-testid='desktop-channels'`、`data-testid='mobile-channels'` 与既有布局钩子上，数据、筛选、权限与定价浮层逻辑不变。

## 分组列与渠道状态

账号表的「分组」列在桌面端随拖动宽度自适应：`accounts.css` 覆盖了分组单元格与徽章写死的 `max-w-56`/`max-w-24` 上限，徽章在列宽范围内换行显示完整分组名，不再固定截断；列宽仍按字段名保存在 `mito-account-column-widths-v1`。

`channel-status.css` 美化用户端渠道状态页（`/monitor`，V3 `StatusPage.vue`）：工具条刷新按钮、系统状态面板、分类泳道、状态条单元格、空状态、底部事件入口与悬浮详情统一为 Mito 的圆角、边框、字号与蓝色强调；状态条单元格加高并加柔和轨道，分类泳道悬停切换边框与底色。样式只挂在现有 `data-testid` 钩子上，页面数据、探测规则、折叠与悬浮逻辑不变；上游主题不加载这些覆盖。

两处样式与契约已登记 `adaptations.mjs`，上游更新后同样按 `check/remove/apply` 维护。
