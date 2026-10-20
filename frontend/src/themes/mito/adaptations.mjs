/** Small, reversible seams. Update these anchors when upstream changes a layout. */
export const adaptations = [
  {
    "path": "frontend/src/views/HomeView.vue",
    "edits": [
      {
        "before": "import Icon from '@/components/icons/Icon.vue'",
        "after": "import Icon from '@/components/icons/Icon.vue'\nimport MitoLandingPage from '@/themes/mito/LandingPage.vue'\nimport { isMitoTheme } from '@/themes/mito'"
      },
      {
        "before": "  <!-- Default Home Page -->",
        "after": "  <!-- Mito Home Page -->\n  <MitoLandingPage\n    v-else-if=\"isMitoTheme\"\n    :site-name=\"siteName\"\n    :site-logo=\"siteLogo\"\n    :doc-url=\"docUrl\"\n    :github-url=\"githubUrl\"\n    :is-dark=\"isDark\"\n    :is-authenticated=\"isAuthenticated\"\n    :dashboard-path=\"dashboardPath\"\n    :user-initial=\"userInitial\"\n    :current-year=\"currentYear\"\n    :show-model-plaza-entry=\"showModelPlazaEntry\"\n    @toggle-theme=\"toggleTheme\"\n  />\n\n  <!-- Default Home Page -->"
      }
    ]
  },
  {
    "path": "frontend/src/i18n/locales/zh/landing.ts",
    "edits": [
      {
        "before": "  home: {\n",
        "after": "  home: {\n    mito: {\n      heroSubtitle: '一个密钥，畅用国产大模型',\n      heroDescription: '一站式接入 Kimi、GLM、DeepSeek、MiniMax，让模型调用、密钥与用量管理更简单。',\n      heroBadge: '国产大模型 · 统一接入',\n      terminalLabel: 'API 调用示例',\n      stats: {\n        models: '国模生态',\n        key: '统一密钥',\n        failover: '多路调度',\n        billing: '费用可查',\n        routingValue: '自动',\n        billingValue: '按量'\n      },\n      steps: {\n        title: '三步接入，开始调用',\n        subtitle: '从创建密钥到查看用量，在一个控制台完成',\n        connect: {\n          title: '创建密钥',\n          desc: '登录控制台生成 API Key，按分组选择可用模型与额度。'\n        },\n        call: {\n          title: '配置调用',\n          desc: '在兼容的 SDK 中配置本站 API 地址与密钥，选择模型开始调用。'\n        },\n        monitor: {\n          title: '查看用量',\n          desc: '查看请求日志、Token 与费用明细，按需管理调用额度。'\n        }\n      },\n      providers: {\n        kimi: 'Kimi',\n        glm: 'GLM',\n        deepseek: 'DeepSeek',\n        minimax: 'MiniMax'\n      },\n      core: {\n        eyebrow: \'Core Capabilities\',\n        title: \'核心功能\',\n        subtitle: \'一个密钥接到底：接入、调度、计费三层能力收束在同一条链路上，不额外引入中间层。\',\n        items: {\n          gateway: {\n            title: \'统一接入\',\n            desc: \'一个 OpenAI 兼容端点接全部已上架模型，继续沿用现有 SDK 与客户端，无需为每家供应商改代码或维护多套密钥。\',\n            tags: { compatible: \'OpenAI 兼容\', key: \'单一密钥\', endpoint: \'统一端点\' }\n          },\n          routing: {\n            title: \'多路调度\',\n            desc: \'同一模型背后挂多个上游账号，按实时健康度择路；单账号报错时自动切换，对话与会话保持在同一条链路上。\',\n            tags: { pool: \'账号池\', failover: \'自动切换\', isolation: \'分组隔离\' }\n          },\n          billing: {\n            title: \'用量与计费\',\n            desc: \'按实际 Token 计费，倍率、阶梯、缓存与分时规则在请求前即可核对；每日/每周/每月额度可分别设上限。\',\n            tags: { usage: \'按量计费\', quota: \'额度上限\', detail: \'明细可查\' }\n          }\n        },\n        facts: {\n          key: { label: \'接入方式\', value: \'单一 API 密钥\' },\n          sdk: { label: \'协议兼容\', value: \'OpenAI 兼容\' },\n          route: { label: \'故障处理\', value: \'自动切换\' },\n          billing: { label: \'计费口径\', value: \'按 Token 实付\' }\n        }\n      },\n      playground: {\n        eyebrow: \'Interactive API Sandbox\',\n        title: \'交互式 API 调试沙盒\',\n        subtitle: \'模拟标准 OpenAI SDK 请求，直观看到路由、延迟与 Token 成本——不发起真实调用，也不消耗额度。\',\n        endpointLabel: \'请求 API 端点\',\n        modelLabel: \'调试目标模型\',\n        tokensInput: \'输入 Tokens\',\n        tokensOutput: \'输出 Tokens\',\n        run: \'运行模拟请求\',\n        running: \'请求路由中...\',\n        placeholder: \'正在准备模拟响应…\',\n        status: \'STATUS\',\n        statePreview: \'示例预览\',\n        stateBusy: \'ROUTING\',\n        stateOk: \'200 OK\',\n        estimate: \'本次预估\',\n        rate: \'生效倍率\',\n        rateSuffix: \'×\',\n        empty: \'模型价目暂不可用，稍后会自动重试。\'\n      },\n      workbench: {\n        title: \'接入工作台\',\n        subtitle: \'多态策略流控、资费即时精算与高可用分发沙盒，收束于单一极客视界。\',\n        enter: \'接入工作台\',\n        consoleTitle: \'MITO GATEWAY CONSOLE · 控制面\',\n        ready: \'网关就绪\',\n        standby: \'备用池: {count}\',\n        activeModel: \'激活模型\',\n        packetDelay: \'首包延迟\',\n        topology: \'实时网关拓扑图\',\n        policyTitle: \'网关高阶调度策略\',\n        channelTitle: \'激活分发通道\',\n        policies: {\n          auto: \'自适应最优\',\n          lowTtft: \'极速首包\',\n          failover: \'多活备用\'\n        },\n        policyDesc: {\n          auto: \'全局自适应策略：实时演算边缘节点健康度、首包延时（TTFT）与热备份池负载，确保物理链路最优。\',\n          lowTtft: \'极速首包策略：强行拉平地域差异，优先将封包调度至首字响应时延最低的极速上行边缘节点。\',\n          failover: \'多活容灾策略：维持三级双活热备池，检测到物理上游抖动时，在 20ms 内实现无缝热切。\'\n        },\n        volume: \'月度吞吐规模精算\',\n        official: \'OFFICIAL\',\n        officialPrice: \'官方参考价\',\n        ourPrice: \'本站实付\',\n        monthlySaved: \'网关精算月节省\',\n        monthUnit: \'月\',\n        prompt: \'仿真输入内容（Prompt）\',\n        promptPlaceholder: \'输入要仿真的提示词\',\n        temperature: \'温度（Temp）\',\n        endpoint: \'请求端点（Endpoint）\',\n        runDispatch: \'发起网关极速仿真调度\',\n        dispatching: \'网关封包多态分发中...\',\n        outputPlaceholder: \'运行仿真后，在这里查看高亮的 JSON 流\',\n        trace: \'链路遥测 TRACE 日志\',\n        live: \'LIVE\',\n        traceReady: \'网关智能控制面已上线并激活\',\n        tracePools: \'物理路由备用池已同步（3 个热备池）\',\n        traceEdge: \'上行边缘通道已连接 · HKG-01 Edge 激活\',\n        traceTopology: \'握手路径建立 -> Client Edge -> MITO-Router -> {route}\',\n        traceUpstream: \'正在连接上游 {model} · {id}（Ping: {ping}ms）\',\n        traceSuccess: \'通道调度成功 · 费用比例 {saved}\',\n        savedRatio: \'费用比例\',\n        parity: \'与官价持平\',\n        parityNote: \'本站按官方参考价计费，无额外溢价\'\n      },\n"
      }
    ]
  },
  {
    "path": "frontend/src/i18n/locales/en/landing.ts",
    "edits": [
      {
        "before": "  home: {\n",
        "after": "  home: {\n    mito: {\n      heroSubtitle: 'One Key, Leading Chinese AI Models',\n      heroDescription: 'Access Kimi, GLM, DeepSeek and MiniMax in one place, with simpler model calls, key management and usage tracking.',\n      heroBadge: 'Chinese LLMs · One Gateway',\n      terminalLabel: 'Example API call',\n      stats: {\n        models: 'Model Families',\n        key: 'Unified Key',\n        failover: 'Smart Routing',\n        billing: 'Cost Tracking',\n        routingValue: 'Auto',\n        billingValue: 'Usage'\n      },\n      steps: {\n        title: 'Three Steps to Your First Call',\n        subtitle: 'Create a key, connect a model and track usage in one dashboard',\n        connect: {\n          title: 'Create a Key',\n          desc: 'Sign in and generate an API key, then choose a group with the models and quota you need.'\n        },\n        call: {\n          title: 'Configure Your Client',\n          desc: 'Set the gateway API address and key in a compatible SDK, then choose a model to get started.'\n        },\n        monitor: {\n          title: 'Track Usage',\n          desc: 'Review request logs, tokens and itemized costs, and manage your quota as needed.'\n        }\n      },\n      providers: {\n        kimi: 'Kimi',\n        glm: 'GLM',\n        deepseek: 'DeepSeek',\n        minimax: 'MiniMax'\n      },\n      core: {\n        eyebrow: \'Core Capabilities\',\n        title: \'Core Features\',\n        subtitle: \'One key, three layers: access, routing and billing share a single path with no extra hop in between.\',\n        items: {\n          gateway: {\n            title: \'Unified access\',\n            desc: \'One OpenAI-compatible endpoint covers every listed model. Keep your existing SDKs and clients instead of maintaining a key and a code path per vendor.\',\n            tags: { compatible: \'OpenAI-compatible\', key: \'Single key\', endpoint: \'One endpoint\' }\n          },\n          routing: {\n            title: \'Multi-route dispatch\',\n            desc: \'Each model sits behind several upstream accounts and is routed by live health. A failing account is swapped out automatically while the conversation stays on one path.\',\n            tags: { pool: \'Account pool\', failover: \'Auto failover\', isolation: \'Group isolation\' }\n          },\n          billing: {\n            title: \'Usage and billing\',\n            desc: \'Billed on actual tokens, with multipliers, tiers, cache and time-based rules visible before you call. Daily, weekly and monthly limits can be set independently.\',\n            tags: { usage: \'Pay per token\', quota: \'Quota caps\', detail: \'Itemized logs\' }\n          }\n        },\n        facts: {\n          key: { label: \'Access\', value: \'One API key\' },\n          sdk: { label: \'Protocol\', value: \'OpenAI-compatible\' },\n          route: { label: \'On failure\', value: \'Automatic failover\' },\n          billing: { label: \'Billing basis\', value: \'Actual tokens\' }\n        }\n      },\n      playground: {\n        eyebrow: \'Interactive API Sandbox\',\n        title: \'Interactive API Sandbox\',\n        subtitle: \'Simulate a standard OpenAI SDK call and see routing, latency and token cost. Nothing is sent upstream and no quota is consumed.\',\n        endpointLabel: \'Request endpoint\',\n        modelLabel: \'Target model\',\n        tokensInput: \'Input tokens\',\n        tokensOutput: \'Output tokens\',\n        run: \'Run simulated request\',\n        running: \'Routing request...\',\n        placeholder: \'Preparing the simulated response...\',\n        status: \'STATUS\',\n        statePreview: \'PREVIEW\',\n        stateBusy: \'ROUTING\',\n        stateOk: \'200 OK\',\n        estimate: \'Estimate\',\n        rate: \'Effective rate\',\n        rateSuffix: \'x\',\n        empty: \'The model price list is unavailable right now. It will retry automatically.\'\n      },\n      workbench: {\n        title: \'Gateway Workbench\',\n        subtitle: \'Polymorphic policy routing, live cost modeling and a high-availability dispatch sandbox in one control plane.\',\n        enter: \'Open Workbench\',\n        consoleTitle: \'MITO GATEWAY CONSOLE · CONTROL PLANE\',\n        ready: \'GATEWAY ON\',\n        standby: \'STANDBY POOLS: {count}\',\n        activeModel: \'ACTIVE MODEL\',\n        packetDelay: \'PACKET DELAY\',\n        topology: \'LIVE GATEWAY TOPOLOGY\',\n        policyTitle: \'ADVANCED ROUTING POLICIES\',\n        channelTitle: \'ACTIVE DISPATCH CHANNELS\',\n        policies: {\n          auto: \'Adaptive\',\n          lowTtft: \'Low TTFT\',\n          failover: \'Failover\'\n        },\n        policyDesc: {\n          auto: \'Adaptive routing: orchestrates traffic dynamically based on node telemetry, TTFT and warm pool availability.\',\n          lowTtft: \'Low TTFT acceleration: prioritizes immediate edge nodes to minimize first-byte response time.\',\n          failover: \'Active-active failover: maintains multi-pool hot standbys and reroutes transparently within 20ms.\'\n        },\n        volume: \'MONTHLY VOLUME PROJECTION\',\n        official: \'OFFICIAL\',\n        officialPrice: \'Vendor list price\',\n        ourPrice: \'Charged here\',\n        monthlySaved: \'PROJECTED MONTHLY SAVINGS\',\n        monthUnit: \'mo\',\n        prompt: \'SIMULATION PROMPT\',\n        promptPlaceholder: \'Enter a prompt to simulate\',\n        temperature: \'TEMPERATURE\',\n        endpoint: \'ENDPOINT\',\n        runDispatch: \'RUN ROUTE DISPATCH\',\n        dispatching: \'DISPATCHING PACKETS...\',\n        outputPlaceholder: \'Run a simulation to inspect the highlighted JSON stream\',\n        trace: \'ROUTE TRACE LOG\',\n        live: \'LIVE\',\n        traceReady: \'Gateway smart control plane is live and active\',\n        tracePools: \'Physical routing backup pools synchronized (3 warm pools)\',\n        traceEdge: \'Uplink edge channel connected · HKG-01 Edge active\',\n        traceTopology: \'Handshake path established -> Client Edge -> MITO-Router -> {route}\',\n        traceUpstream: \'Connecting upstream {model} · {id} (Ping: {ping}ms)\',\n        traceSuccess: \'Channel dispatched · cost ratio {saved}\',\n        savedRatio: \'COST RATIO\',\n        parity: \'AT PARITY\',\n        parityNote: \'Billed at the vendor reference price, no markup\'\n      },\n"
      }
    ]
  },
  {
    path: 'frontend/src/main.ts',
    edits: [{ before: "import './style.css'", after: "import './style.css'\nimport '@/themes/mito' // mito-theme: bootstrap" }]
  },
  {
    path: 'frontend/tailwind.config.js',
    edits: [
      { before: "export default {", after: "import { withMitoTheme } from './src/themes/mito/tailwind.mjs'\n\nexport default withMitoTheme({" },
      { before: '  plugins: []\n}', after: '  plugins: []\n}) // mito-theme: utilities' }
    ]
  },
  {
    path: 'frontend/src/components/layout/AppLayout.vue',
    edits: [
      { before: 'class="min-h-screen bg-gray-50 dark:bg-dark-950"', after: 'class="mito-app-layout min-h-screen bg-gray-50 dark:bg-dark-950"' },
      { before: 'class="pointer-events-none fixed inset-0 bg-mesh-gradient"', after: 'class="mito-app-decoration pointer-events-none fixed inset-0 bg-mesh-gradient"' },
      { before: '<main class="p-4 md:p-6 lg:p-8">\n        <slot />', after: '<main class="mito-main p-4 md:p-6 lg:p-8">\n        <MitoPageHeading v-if="isMitoTheme"><slot name="heading-actions" /></MitoPageHeading>\n        <slot />' },
      { before: "import AppHeader from './AppHeader.vue'", after: "import AppHeader from './AppHeader.vue'\nimport MitoPageHeading from '@/themes/mito/PageHeading.vue'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/components/layout/AppHeader.vue',
    edits: [
      { before: '<header class="glass sticky', after: '<header class="mito-header glass sticky' },
      { before: 'class="flex h-16 items-center justify-between gap-2 px-2 sm:px-4 md:px-6"', after: 'class="mito-header-inner flex h-16 items-center justify-between gap-2 px-2 sm:px-4 md:px-6"' },
      { before: 'class="flex min-w-0 items-center gap-2 sm:gap-4"', after: 'class="mito-header-left flex min-w-0 items-center gap-2 sm:gap-4"' },
      { before: 'class="hidden min-w-0 lg:block"', after: 'class="mito-header-title hidden min-w-0 lg:block"' },
      { before: 'class="flex shrink-0 items-center gap-1 sm:gap-3"', after: 'class="mito-header-controls flex shrink-0 items-center gap-1 sm:gap-3"' },
      { before: '<!-- Language Switcher -->\n        <LocaleSwitcher />', after: '<!-- Language Switcher -->\n        <LocaleSwitcher />\n        <MitoThemeToggle v-if="isMitoTheme" />' },
      { before: 'class="hidden items-center gap-1.5 rounded-lg px-2.5', after: 'class="mito-header-control hidden items-center gap-1.5 rounded-lg px-2.5' },
      { before: 'class="flex items-center gap-1.5 rounded-lg px-2.5', after: 'class="mito-header-control flex items-center gap-1.5 rounded-lg px-2.5' },
      { before: 'class="group relative hidden items-center', after: 'class="mito-header-balance group relative hidden items-center' },
      { before: 'class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br', after: 'class="mito-header-avatar flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br' },
      { before: "<div class=\"text-xs text-gray-500 dark:text-dark-400\">\n                {{ t('admin.users.roles.' + user.role) }}", after: "<div class=\"mito-header-role text-xs text-gray-500 dark:text-dark-400\">\n                {{ t('admin.users.roles.' + user.role) }}" },
      { before: "import { resolveSiteBillingMode } from '@/utils/siteBillingMode'", after: "import { resolveSiteBillingMode } from '@/utils/siteBillingMode'\nimport MitoThemeToggle from '@/themes/mito/ThemeToggle.vue'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/components/layout/AppSidebar.vue',
    // Only genuinely theme-only seams are registered here. The sidebar section
    // grouping, the custom-menu nesting and the a11y attributes are ordinary
    // product code in this fork, so `remove` must not strip them.
    edits: [
      { "before": "{ path: '/usage', label: t('nav.usage'), icon: ChartIcon, hideInSimpleMode: !authStore.isObserver },", "after": "{ path: '/usage', label: isMitoTheme && !authStore.isObserver ? t('usage.logsTitle') : t('nav.usage'), icon: ChartIcon, hideInSimpleMode: !authStore.isObserver },\n    ...(isMitoTheme && !authStore.isObserver ? [{ path: '/usage-stats', label: t('usage.statsTitle'), icon: ChartIcon, hideInSimpleMode: true }] : [])," },
      { before: "const isDark = ref(document.documentElement.classList.contains('dark'))", after: "const isDark = ref(document.documentElement.classList.contains('dark'))\nif (isMitoTheme) useThemeSync(isDark) // mito-theme: shared preference" },
      { before: '<script setup lang="ts">', after: '<script setup lang="ts">\nimport { isMitoTheme } from \'@/themes/mito\'\nimport { useThemeSync } from \'@/themes/mito/useThemeSync\'' },
      { "before": "      <button\n        @click=\"toggleTheme\"", "after": "      <button\n        type=\"button\"\n        :aria-label=\"isDark ? t('nav.lightMode') : t('nav.darkMode')\"\n        @click=\"toggleTheme\"" },
      { "before": "      <button\n        @click=\"toggleSidebar\"", "after": "      <button\n        type=\"button\"\n        :aria-label=\"sidebarCollapsed ? t('nav.expand') : t('nav.collapse')\"\n        :aria-expanded=\"!sidebarCollapsed\"\n        @click=\"toggleSidebar\"" }
    ]
  },
  {
    path: 'frontend/src/components/common/DataTable.vue',
    edits: [
      { before: "<div v-if=\"!isDesktopViewport\" class=\"space-y-3\">", after: "<div\n    v-if=\"!isDesktopViewport\"\n    class=\"mito-mobile-table space-y-3\"\n    :class=\"{ 'mito-request-log-mobile': tableVariant === 'request-log' }\"\n  >" },
      { before: "'border-primary-300 bg-primary-50/40 dark:border-primary-700 dark:bg-primary-900/10': selectable", after: "'mito-row-selected border-primary-300 bg-primary-50/40 dark:border-primary-700 dark:bg-primary-900/10': selectable" },
      { before: "'bg-primary-50/40 dark:bg-primary-900/10': selectable", after: "'mito-row-selected bg-primary-50/40 dark:bg-primary-900/10': selectable" },
      { before: "      'is-scrollable': isScrollable\n    }\"\n  >", after: "      'is-scrollable': isScrollable,\n      'mito-request-log-wrapper': tableVariant === 'request-log',\n      'mito-table-resizing': resizingKey !== null\n    }\"\n    :style=\"columnWrapperStyle\"\n  >" },
      { before: "    <table class=\"w-full min-w-max divide-y divide-gray-200 dark:divide-dark-700\">", after: "    <div v-if=\"tableVariant === 'request-log' && loading\" class=\"mito-request-log-progress\" aria-hidden=\"true\"></div>\n    <table\n      class=\"w-full min-w-max divide-y divide-gray-200 dark:divide-dark-700\"\n      :class=\"{ 'mito-request-log-table': tableVariant === 'request-log', 'mito-resizable-table': resizableColumns }\"\n      :style=\"columnTableStyle\"\n    >\n      <colgroup v-if=\"resizableColumns\">\n        <col v-if=\"selectable\" style=\"width: 44px\" />\n        <col v-for=\"column in columns\" :key=\"column.key\" :data-column-key=\"column.key\" :style=\"{ width: getColumnWidth(column) + 'px' }\" />\n      </colgroup>" },
      { before: "      <tbody class=\"table-body divide-y divide-gray-200 bg-white dark:divide-dark-700 dark:bg-dark-900\">", after: "      <tbody\n        class=\"table-body divide-y divide-gray-200 bg-white dark:divide-dark-700 dark:bg-dark-900\"\n        :class=\"{ 'mito-request-log-loading': tableVariant === 'request-log' && loading }\"\n      >" },
      { before: "  selectable?: boolean\n", after: "  selectable?: boolean\n  /** Optional visual variant; default preserves the shared table style. */\n  tableVariant?: 'default' | 'request-log'\n  /** Allow resizing desktop columns; disabled unless a page opts in. */\n  resizableColumns?: boolean\n  /** Persist column widths independently of visibility and sorting. */\n  columnWidthStorageKey?: string\n" },
      { before: "  selectedKeys: () => []\n", after: "  selectedKeys: () => [],\n  tableVariant: 'default',\n  resizableColumns: false\n" },
      {"before":"import Icon from '@/components/icons/Icon.vue'","after":"import Icon from '@/components/icons/Icon.vue'\nimport { useTableColumnResize } from '@/themes/mito/useTableColumnResize'\nimport { useMitoLabels } from '@/themes/mito/labels'"},
      {"before":"const sortKey = ref<string>('')","after":"const resizeLabel = useMitoLabels()\nconst {\n  columnTableStyle, columnWrapperStyle, resizingKey, getColumnWidth, getColumnBounds,\n  canResizeColumn, startColumnResize, handleColumnResizeKey, resetColumnWidth\n} = useTableColumnResize({\n  wrapper: tableWrapperRef,\n  columns: () => props.columns,\n  enabled: () => props.resizableColumns && isDesktopViewport.value,\n  storageKey: () => props.columnWidthStorageKey,\n  selectable: () => props.selectable\n})\n\nwatch(columnTableStyle, async () => {\n  await nextTick()\n  checkScrollable()\n  checkActionsColumnWidth()\n}, { flush: 'post' })\n\nconst sortKey = ref<string>('')"},
      {"before":"            :key=\"column.key\"\n            scope=\"col\"","after":"            :key=\"column.key\"\n            :data-column-key=\"column.key\"\n            scope=\"col\""},
      {"before":"              :key=\"column.key\"\n              :class=\"[","after":"              :key=\"column.key\"\n              :data-column-key=\"column.key\"\n              :class=\"["},
      {"before":"            </div>\n          </th>\n        </tr>\n      </thead>","after":"            </div>\n            <div\n              v-if=\"canResizeColumn(column)\"\n              role=\"separator\"\n              tabindex=\"0\"\n              class=\"mito-column-resize-handle\"\n              :class=\"{ 'mito-column-resize-handle--active': resizingKey === column.key }\"\n              aria-orientation=\"vertical\"\n              :aria-label=\"resizeLabel('resizeColumn', { column: column.label })\"\n              :aria-valuemin=\"getColumnBounds(column).min\"\n              :aria-valuemax=\"getColumnBounds(column).max\"\n              :aria-valuenow=\"getColumnWidth(column)\"\n              :aria-valuetext=\"resizeLabel('columnWidth', { width: getColumnWidth(column) })\"\n              :title=\"resizeLabel('resizeColumnHint', { column: column.label })\"\n              @pointerdown.stop=\"startColumnResize($event, column)\"\n              @keydown.stop=\"handleColumnResizeKey($event, column)\"\n              @click.stop\n              @dblclick.stop.prevent=\"resetColumnWidth(column)\"\n            ></div>\n          </th>\n        </tr>\n      </thead>"}
    ]
  },
  {
    path: 'frontend/src/components/common/Toast.vue',
    edits: [
      {
        before: `<TransitionGroup
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-full"`,
        after: `<TransitionGroup
        v-bind="isMitoTheme ? { name: 'mito-toast' } : {
          enterActiveClass: 'transition ease-out duration-300',
          enterFromClass: 'opacity-0 translate-x-full',
          enterToClass: 'opacity-100 translate-x-0',
          leaveActiveClass: 'transition ease-in duration-200',
          leaveFromClass: 'opacity-100 translate-x-0',
          leaveToClass: 'opacity-0 translate-x-full'
        }"`
      },
      { before: "'pointer-events-auto min-w-[320px]", after: "'mito-toast-card pointer-events-auto min-w-[320px]" },
      { before: "import { useAppStore } from '@/stores/app'", after: "import { useAppStore } from '@/stores/app'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/components/common/LocaleSwitcher.vue',
    edits: [
      { before: '<div class="relative" ref="dropdownRef">', after: '<div class="mito-locale-switcher relative" ref="dropdownRef">' },
      { before: '<span class="text-base">{{ currentLocale?.flag }}</span>', after: '<svg v-if="isMitoTheme" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z" /></svg>\n      <span class="mito-locale-flag text-base">{{ currentLocale?.flag }}</span>' },
      { before: "import { setLocale, availableLocales } from '@/i18n'", after: "import { setLocale, availableLocales } from '@/i18n'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/components/layout/AuthLayout.vue',
    edits: [
      { before: 'class="relative flex min-h-screen items-center justify-center overflow-hidden p-4"', after: 'class="mito-auth-layout relative flex min-h-screen items-center justify-center overflow-hidden p-4"' },
      { before: '<!-- Background -->', after: '<MitoAuthHeader v-if="isMitoTheme && settingsLoaded" :name="siteName" :logo="siteLogo" />\n    <!-- Background -->' },
      { before: 'class="absolute inset-0 bg-gradient-to-br', after: 'class="mito-auth-background absolute inset-0 bg-gradient-to-br' },
      { before: 'class="pointer-events-none absolute inset-0 overflow-hidden"', after: 'class="mito-auth-decoration pointer-events-none absolute inset-0 overflow-hidden"' },
      { before: 'class="relative z-10 w-full max-w-md"', after: 'class="mito-auth-content relative z-10 w-full max-w-md"' },
      { before: 'class="mb-8 text-center"', after: 'class="mito-auth-brand mb-8 text-center"' },
      { before: 'class="card-glass rounded-2xl p-8 shadow-glass"', after: 'class="mito-auth-card card-glass rounded-2xl p-8 shadow-glass"' },
      { before: "import { sanitizeUrl } from '@/utils/url'", after: "import { sanitizeUrl } from '@/utils/url'\nimport MitoAuthHeader from '@/themes/mito/AuthHeader.vue'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/components/user/dashboard/UserDashboardStats.vue',
    edits: [
      { before: '<template>\n  <!-- Row 1: Core Stats -->', after: '<template>\n  <MitoDashboardStats v-if="isMitoTheme" :stats="stats" :balance="balance" :is-simple="isSimple" />\n  <template v-else>\n  <!-- Row 1: Core Stats -->' },
      { before: '  <!-- Row 3: Per-platform breakdown -->', after: '  </template>\n  <!-- Row 3: Per-platform breakdown -->' },
      { before: "'rounded-lg border p-3',", after: "'mito-platform-card rounded-lg border p-3'," },
      { before: "import type { PlatformQuotaItem } from '@/types'", after: "import type { PlatformQuotaItem } from '@/types'\nimport MitoDashboardStats from '@/themes/mito/DashboardStats.vue'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/components/user/dashboard/UserDashboardCharts.vue',
    edits: [
      { before: '<div class="card p-4">', after: '<div class="mito-date-filter card p-4">' },
      { before: '<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">', after: '<MitoDashboardCharts v-if="isMitoTheme" :trend="trend" :models="models" :loading="loading" />\n    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">' },
      { before: "import type { TrendDataPoint, ModelStat } from '@/types'", after: "import type { TrendDataPoint, ModelStat } from '@/types'\nimport MitoDashboardCharts from '@/themes/mito/DashboardCharts.vue'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/views/admin/DashboardView.vue',
    edits: [
      { before: '  <AppLayout>\n    <div class="space-y-6">\n      <!-- Loading State -->', after: '  <AppLayout>\n    <div class="space-y-6" :class="{ \'mito-admin-dashboard\': isMitoTheme }">\n      <!-- Loading State -->' },
      { before: "import ModelDistributionChart from '@/components/charts/ModelDistributionChart.vue'", after: "import ModelDistributionChart from '@/components/charts/ModelDistributionChart.vue'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/views/admin/ops/OpsDashboard.vue',
    edits: [
      {
        before: "    <div :class=\"[isFullscreen ? 'p-4 md:p-6' : '', 'space-y-6 pb-12']\">",
        after: "    <div :class=\"[isFullscreen ? 'p-4 md:p-6' : '', 'space-y-6 pb-12', { 'mito-ops-dashboard': isMitoTheme }]\">"
      },
      {
        before: "import AppLayout from '@/components/layout/AppLayout.vue'",
        after: "import AppLayout from '@/components/layout/AppLayout.vue'\nimport { isMitoTheme } from '@/themes/mito'"
      }
    ]
  },
  {
    path: 'frontend/src/views/admin/ops/components/OpsDashboardHeader.vue',
    edits: [
      {
        before: "  <div :class=\"['flex flex-col gap-4 rounded-3xl bg-white shadow-sm ring-1 ring-gray-900/5 dark:bg-dark-800 dark:ring-dark-700', props.fullscreen ? 'p-8' : 'p-6']\">",
        after: "  <div :class=\"['mito-ops-head flex flex-col gap-4 rounded-3xl bg-white shadow-sm ring-1 ring-gray-900/5 dark:bg-dark-800 dark:ring-dark-700', props.fullscreen ? 'p-8' : 'p-6']\">"
      }
    ]
  },
  {
    path: 'frontend/src/views/user/DashboardView.vue',
    edits: [
      { before: '  <AppLayout>', after: '  <AppLayout>\n    <template v-if="isMitoTheme" #heading-actions>\n      <button class="btn btn-secondary" :disabled="loading || loadingCharts" @click="refreshAll"><Icon name="refresh" size="sm" />{{ t(\'common.refresh\') }}</button>\n    </template>' },
      { before: '    <div class="space-y-6">', after: '    <div class="mito-dashboard space-y-6">' },
      { before: '<script setup lang="ts">', after: '<script setup lang="ts">\nimport { useI18n } from \'vue-i18n\'\nimport Icon from \'@/components/icons/Icon.vue\'\nimport { isMitoTheme } from \'@/themes/mito\'\nconst { t } = useI18n()' }
    ]
  },
  {
    path: 'frontend/src/components/admin/usage/UsageTable.vue',
    edits: [
      {"before":"<template #cell-user=\"{ row }\">\n          <div class=\"text-sm\">","after":"<template #cell-user=\"{ row }\">\n          <div class=\"mito-usage-user text-sm\">"},
      {"before":"class=\"font-medium text-primary-600 underline decoration-dashed underline-offset-2","after":"class=\"mito-usage-user-link font-medium text-primary-600 underline decoration-dashed underline-offset-2"},
      {"before":"<span class=\"ml-1 text-gray-500 dark:text-gray-400\">#{{ row.user_id }}</span>","after":"<span class=\"mito-usage-user-id ml-1 text-gray-500 dark:text-gray-400\">#{{ row.user_id }}</span>"},
      {"before":"<template #cell-api_key=\"{ row }\">\n          <span class=\"text-sm","after":"<template #cell-api_key=\"{ row }\">\n          <span class=\"mito-usage-key text-sm"},
      {"before":"<template #cell-account=\"{ row }\">\n          <span class=\"text-sm","after":"<template #cell-account=\"{ row }\">\n          <span class=\"mito-usage-account text-sm"},
      {"before":"<template #cell-model=\"{ row }\">\n          <div class=\"space-y-0.5 text-xs\">","after":"<template #cell-model=\"{ row }\">\n          <div class=\"mito-usage-model space-y-0.5 text-xs\">"},
      {"before":":class=\"i === 0 ? 'font-medium","after":":class=\"i === 0 ? 'mito-usage-model-primary font-medium"},
      {"before":"<div class=\"break-all font-medium text-gray-900 dark:text-white\">","after":"<div class=\"mito-usage-model-primary break-all font-medium text-gray-900 dark:text-white\">"},
      {"before":"<span v-else class=\"font-medium text-gray-900 dark:text-white\">{{ row.model }}</span>","after":"<span v-else class=\"mito-usage-model-primary font-medium text-gray-900 dark:text-white\">{{ row.model }}</span>"},
      {"before":"data-testid=\"reasoning-effort-cell\" class=\"space-y-0.5 text-xs\"","after":"data-testid=\"reasoning-effort-cell\" class=\"mito-usage-reasoning space-y-0.5 text-xs\""},
      {"before":"data-testid=\"reasoning-effort-cell\" class=\"text-sm","after":"data-testid=\"reasoning-effort-cell\" class=\"mito-usage-reasoning text-sm"},
      {"before":"<div class=\"max-w-[320px] space-y-1 text-xs\">","after":"<div class=\"mito-usage-endpoint max-w-[320px] space-y-1 text-xs\">"},
      {"before":"<span v-if=\"row.group\" class=\"inline-flex","after":"<span v-if=\"row.group\" class=\"mito-usage-group inline-flex"},
      {"before":"<div v-if=\"isImageUsage(row)\" class=\"flex items-center gap-1.5\">","after":"<div v-if=\"isImageUsage(row)\" class=\"mito-usage-tokens flex items-center gap-1.5\">"},
      {"before":"<button v-else type=\"button\" class=\"group relative flex items-center gap-1.5 text-left focus-visible:outline focus-visible:outline-primary-500\"","after":"<button v-else type=\"button\" class=\"mito-usage-tokens group relative flex items-center gap-1.5 text-left focus-visible:outline focus-visible:outline-primary-500\""},
      {"before":"<span class=\"font-medium text-gray-900 dark:text-white\">{{ row.input_tokens?.toLocaleString() || 0 }}</span>","after":"<span class=\"mito-usage-token-value font-medium text-gray-900 dark:text-white\">{{ row.input_tokens?.toLocaleString() || 0 }}</span>"},
      {"before":"<span class=\"font-medium text-gray-900 dark:text-white\">{{ row.output_tokens?.toLocaleString() || 0 }}</span>","after":"<span class=\"mito-usage-token-value font-medium text-gray-900 dark:text-white\">{{ row.output_tokens?.toLocaleString() || 0 }}</span>"},
      {"before":"<span class=\"font-medium text-sky-600 dark:text-sky-400\">{{ formatCacheTokens(row.cache_read_tokens) }}</span>","after":"<span class=\"mito-usage-cache-read font-medium text-sky-600 dark:text-sky-400\">{{ formatCacheTokens(row.cache_read_tokens) }}</span>"},
      {"before":"<template #cell-cost=\"{ row }\">\n          <button type=\"button\" class=\"group relative text-left text-sm focus-visible:outline focus-visible:outline-primary-500\"","after":"<template #cell-cost=\"{ row }\">\n          <button type=\"button\" class=\"mito-usage-cost group relative text-left text-sm focus-visible:outline focus-visible:outline-primary-500\""},
      {"before":"<span class=\"font-medium text-green-600 dark:text-green-400\">${{ row.actual_cost","after":"<span class=\"mito-usage-actual-cost font-medium text-green-600 dark:text-green-400\">${{ row.actual_cost"},
      {"before":"v-if=\"showAccountBilling && row.account_rate_multiplier != null\" class=\"mt-0.5","after":"v-if=\"showAccountBilling && row.account_rate_multiplier != null\" class=\"mito-usage-account-cost mt-0.5"},
      {"before":"class=\"grid grid-cols-[0.25rem_max-content_max-content] items-baseline gap-x-2 gap-y-0.5 text-left text-xs\"","after":"class=\"mito-usage-latency grid grid-cols-[0.25rem_max-content_max-content] items-baseline gap-x-2 gap-y-0.5 text-left text-xs\""},
      {"before":"<span class=\"text-sm text-gray-600 dark:text-gray-400\">{{ formatDateTime(value) }}</span>","after":"<span class=\"mito-usage-time text-sm text-gray-600 dark:text-gray-400\">{{ formatDateTime(value) }}</span>"},
      {"before":"<div v-if=\"row.ip_address\">","after":"<div v-if=\"row.ip_address\" class=\"mito-usage-ip\">"},
      {"before":"        <template #empty><EmptyState :message=\"t('usage.noRecords')\" /></template>","after":"        <template #empty><EmptyState :message=\"t('usage.noRecords')\" /></template>\n        <template v-for=\"(_, name) in $slots\" #[name]=\"slotProps\">\n          <slot\n            :name=\"name\"\n            v-bind=\"slotProps\"\n            :show-cost-details=\"showTooltip\"\n            :hide-cost-details=\"hideTooltip\"\n            :show-token-details=\"showTokenTooltip\"\n            :hide-token-details=\"hideTokenTooltip\"\n          />\n        </template>"},
      {"before":"const showTooltip = (event: Event, row: AdminUsageLog) => {","after":"const showTooltip = (event: Event, row: AdminUsageLog) => {"},
      {"before":"const showTokenTooltip = (event: Event, row: AdminUsageLog) => {","after":"const showTokenTooltip = (event: Event, row: AdminUsageLog) => {"},
      { before: "  <div :class=\"flat ? '' : 'card overflow-hidden'\">", after: "  <div\n    :class=\"[\n      flat ? '' : 'card overflow-hidden',\n      variant === 'request-log' && 'mito-request-log-records'\n    ]\"\n  >" },
      { before: "    <div class=\"overflow-auto\">", after: "    <div class=\"overflow-auto\" :class=\"{ 'mito-request-log-scroll': variant === 'request-log' }\">" },
      { before: "        :default-sort-order=\"defaultSortOrder\"", after: "        :default-sort-order=\"defaultSortOrder\"\n        :table-variant=\"variant\"\n        :resizable-columns=\"resizableColumns\"\n        :column-width-storage-key=\"columnWidthStorageKey\"" },
      { before: "  flat: false,\n  cacheRateAudience: 'admin'\n", after: "  flat: false,\n  cacheRateAudience: 'admin',\n  variant: 'default',\n  resizableColumns: false\n" },
      {"before":"  cacheRateAudience?: 'admin' | 'user'\n}","after":"  cacheRateAudience?: 'admin' | 'user'\n  /** 主题表格变体；默认保持上游表格行为 */\n  variant?: 'default' | 'request-log'\n  /** Allow dragging header borders to size columns (Mito usage table). */\n  resizableColumns?: boolean\n  /** Persist column widths separately from the column visibility preference. */\n  columnWidthStorageKey?: string\n}"},
    ]
  },
  {
    path: 'frontend/src/components/common/Pagination.vue',
    edits: [
      { before: "  <div\n    class=\"flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-dark-700 dark:bg-dark-800 sm:px-6\"\n  >", after: "  <div\n    :class=\"[\n      'flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-dark-700 dark:bg-dark-800 sm:px-6',\n      variant === 'request-log' && 'mito-request-log-pagination'\n    ]\"\n  >" },
      { before: "  showJump?: boolean\n", after: "  showJump?: boolean\n  variant?: 'default' | 'request-log'\n" },
      { before: "  showJump: false\n", after: "  showJump: false,\n  variant: 'default'\n" }
    ]
  },
  {
    path: 'frontend/src/views/user/UsageView.vue',
    edits: [
      { before: "    <div class=\"space-y-6\">", after: "    <div class=\"mito-usage-view space-y-6\">" },
      { before: "      <div class=\"card p-6\">", after: "      <div class=\"mito-request-log-filters card p-6\">" },
      { before: "<div v-if=\"errorViewEnabled\" class=\"flex gap-2", after: "<div v-if=\"errorViewEnabled\" class=\"mito-request-log-tabs flex gap-2" },
      { before: "      <template v-if=\"activeTab === 'usage'\">\n        <UsageTable\n          :data=\"usageLogs\"\n          :loading=\"loading\"\n          :columns=\"visibleColumns\"\n          :server-side-sort=\"true\"\n          :show-account-billing=\"false\"\n          :show-upstream-endpoint=\"false\"\n          cache-rate-audience=\"user\"\n          default-sort-key=\"created_at\"\n          default-sort-order=\"desc\"\n          @sort=\"handleSort\"\n          @ipGeoBatchFailed=\"handleIpGeoBatchFailed\"\n        />\n\n        <Pagination\n          v-if=\"pagination.total > 0\"\n          :page=\"pagination.page\"\n          :total=\"pagination.total\"\n          :page-size=\"pagination.page_size\"\n          @update:page=\"handlePageChange\"\n          @update:pageSize=\"handlePageSizeChange\"\n        />\n      </template>\n", after: "      <template v-if=\"activeTab === 'usage'\">\n        <div class=\"mito-request-log-section space-y-6\">\n          <UsageTable\n            variant=\"request-log\"\n            :data=\"usageLogs\"\n            :loading=\"loading\"\n            :columns=\"visibleColumns\"\n            :server-side-sort=\"true\"\n            :show-account-billing=\"false\"\n            :show-upstream-endpoint=\"false\"\n            cache-rate-audience=\"user\"\n            default-sort-key=\"created_at\"\n            default-sort-order=\"desc\"\n            @sort=\"handleSort\"\n            @ipGeoBatchFailed=\"handleIpGeoBatchFailed\"\n          />\n\n          <Pagination\n            v-if=\"pagination.total > 0\"\n            variant=\"request-log\"\n            :page=\"pagination.page\"\n            :total=\"pagination.total\"\n            :page-size=\"pagination.page_size\"\n            @update:page=\"handlePageChange\"\n            @update:pageSize=\"handlePageSizeChange\"\n          />\n        </div>\n      </template>\n" }
    ]
  },
  {
    "path": "frontend/src/views/user/UsageEntryView.vue",
    "edits": [
      {
        "before": "  <UserUsageView v-else />",
        "after": "  <MitoRequestLogsView v-else-if=\"isMitoTheme\" />\n  <UserUsageView v-else />"
      },
      {
        "before": "import { defineAsyncComponent } from 'vue'",
        "after": "import { defineAsyncComponent } from 'vue'\nimport { isMitoTheme } from '@/themes/mito'\nconst MitoRequestLogsView = defineAsyncComponent(() => import('@/themes/mito/RequestLogsView.vue'))"
      }
    ]
  },
  {
    "path": "frontend/src/router/index.ts",
    "edits": [
      {
        "before": "import { settingsLocation } from '@/utils/settingsSearch'",
        "after": "import { settingsLocation } from '@/utils/settingsSearch'\nimport { isMitoTheme } from '@/themes/mito'"
      },
      {
        "before": "  {\n    path: '/redeem',",
        "after": "  // mito-theme: separate personal aggregates from request logs.\n  ...(isMitoTheme ? [{\n    path: '/usage-stats',\n    name: 'UsageStats',\n    component: () => import('@/themes/mito/UsageStatsView.vue'),\n    beforeEnter: () => useAuthStore().isObserver ? '/usage' : true,\n    meta: {\n      requiresAuth: true,\n      requiresAdmin: false,\n      title: 'Usage Statistics',\n      titleKey: 'usage.statsTitle',\n      descriptionKey: 'usage.statsDescription'\n    }\n  } satisfies RouteRecordRaw] : []),\n  {\n    path: '/redeem',"
      }
    ]
  },
  {
    "path": "frontend/src/i18n/locales/en/dashboard.ts",
    "edits": [
      {"before": "backToDashboard: 'Back to Console'", "after": "backToDashboard: 'Back to Console',\n      home: 'Back to Home'"},
      {"before": "  modelPlaza: {\n", "after": "  modelPlaza: {\n    catalog: {\n      categories: {\n        language: 'Language Models (LLM)',\n        embedding: 'Embedding Models',\n        rerank: 'Rerank Models',\n        image: 'Image Models',\n        video: 'Video Models',\n        audio: 'Audio Models',\n        other: 'Other Models'\n      },\n      tags: {\n        language: 'Language',\n        embedding: 'Embedding',\n        rerank: 'Rerank',\n        image: 'Image',\n        video: 'Video',\n        audio: 'Audio',\n        other: 'API'\n      },\n      standardPrice: 'Standard-period price',\n      tiered: 'Tiered pricing',\n      cacheRead: 'Cache read',\n      cacheWrite: 'Cache write',\n      timePricing: 'Time-based pricing',\n      priceHint: 'Prices include the effective group rate and are in USD. Offers for the same model in different groups are shown separately.',\n      priceDescription: 'Prices use the effective rate for this group. Open details for official reference prices and full billing rules.',\n      groupDescription: 'Group notes: {description}',\n      specialPricing: 'Time or reasoning-effort pricing rules also apply. See details.',\n      details: 'Price details',\n      detailsFor: 'View pricing for {model} in {group}',\n      offerCount: '{count} model offers'\n    },\n"},
      {
        "before": "  usage: {\n    title: 'Usage Records',",
        "after": "  usage: {\n    logsTitle: 'Request Logs',\n    statsTitle: 'Usage Stats',\n    statsDescription: 'Usage, costs and distributions for the selected period',\n    title: 'Usage Records',"
      }
    ]
  },
  {
    "path": "frontend/src/i18n/locales/zh/dashboard.ts",
    "edits": [
      {"before": "backToDashboard: '回到后台'", "after": "backToDashboard: '回到后台',\n      home: '返回首页'"},
      {"before": "  modelPlaza: {\n", "after": "  modelPlaza: {\n    catalog: {\n      categories: {\n        language: '大语言模型（LLM）',\n        embedding: '嵌入模型（Embedding）',\n        rerank: '重排序模型（Rerank）',\n        image: '图像模型（Image）',\n        video: '视频模型（Video）',\n        audio: '音频模型（Audio）',\n        other: '其他模型'\n      },\n      tags: {\n        language: '语言模型',\n        embedding: '嵌入',\n        rerank: 'Rerank',\n        image: '图像',\n        video: '视频',\n        audio: '音频',\n        other: 'API'\n      },\n      standardPrice: '标准时段实付',\n      tiered: '区间计费',\n      cacheRead: '缓存读取',\n      cacheWrite: '缓存写入',\n      timePricing: '分时计价',\n      priceHint: '价格已计入分组生效倍率，币种为 USD。同一模型在不同分组的报价分别展示。',\n      priceDescription: '按当前分组的生效倍率展示价格，可查看官方参考价与完整计费规则。',\n      groupDescription: '分组说明：{description}',\n      specialPricing: '另有时段或思考等级计费规则，详见明细。',\n      details: '价格明细',\n      detailsFor: '查看 {group} 的 {model} 价格明细',\n      offerCount: '{count} 个模型报价'\n    },\n"},
      {
        "before": "  usage: {\n    title: '使用记录',",
        "after": "  usage: {\n    logsTitle: '请求日志',\n    statsTitle: '使用量统计',\n    statsDescription: '查看所选时间内的用量、费用和分布',\n    title: '使用记录',"
      }
    ]
  },
  {
    "path": "frontend/src/components/modelPlaza/PlazaNavBar.vue",
    "edits": [
      {
        "before": "class=\"mx-auto flex max-w-7xl",
        "after": "class=\"mito-plaza-nav-inner mx-auto flex max-w-7xl"
      },
      {
        "before": "<div class=\"flex min-w-0 items-center gap-3\">",
        "after": "<div class=\"mito-plaza-nav-brand flex min-w-0 items-center gap-3\">"
      },
      {
        "before": "      <!-- 右:登录 / 回到后台 -->\n      <RouterLink\n        v-if=\"isAuthenticated\"\n        :to=\"backTarget\"\n        class=\"inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition-all duration-200 hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] dark:shadow-primary-500/20\"\n      >\n        {{ t('modelPlaza.nav.backToDashboard') }}\n      </RouterLink>\n      <RouterLink\n        v-else\n        :to=\"{ path: '/login', query: { redirect: '/model-plaza' } }\"\n        class=\"inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition-all duration-200 hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] dark:shadow-primary-500/20\"\n      >\n        {{ t('modelPlaza.nav.login') }}\n      </RouterLink>\n",
        "after": "      <!-- 右:返回首页 / 登录 / 回到后台 -->\n      <div class=\"mito-plaza-nav-actions\">\n        <MitoPlazaHomeLink v-if=\"isMitoTheme\" />\n        <RouterLink\n          v-if=\"isAuthenticated\"\n          :to=\"backTarget\"\n          class=\"inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition-all duration-200 hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] dark:shadow-primary-500/20\"\n        >\n          {{ t('modelPlaza.nav.backToDashboard') }}\n        </RouterLink>\n        <RouterLink\n          v-else\n          :to=\"{ path: '/login', query: { redirect: '/model-plaza' } }\"\n          class=\"inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition-all duration-200 hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] dark:shadow-primary-500/20\"\n        >\n          {{ t('modelPlaza.nav.login') }}\n        </RouterLink>\n      </div>\n"
      },
      {
        "before": "import { useAuthStore } from '@/stores/auth'",
        "after": "import { useAuthStore } from '@/stores/auth'\nimport MitoPlazaHomeLink from '@/themes/mito/PlazaHomeLink.vue'\nimport { isMitoTheme } from '@/themes/mito'"
      }
    ]
  },
  {
    "path": "frontend/src/views/ModelPlazaView.vue",
    "edits": [
      {
        "before": "import PlazaNavBar from '@/components/modelPlaza/PlazaNavBar.vue'",
        "after": "import PlazaNavBar from '@/components/modelPlaza/PlazaNavBar.vue'\nimport { isMitoTheme } from '@/themes/mito'"
      }
    ]
  },
  {
    "path": "frontend/src/components/modelPlaza/ModelPlazaContent.vue",
    "edits": [
      {
        "before": "import PlazaGroupSection from './PlazaGroupSection.vue'",
        "after": "import PlazaGroupSection from './PlazaGroupSection.vue'\nimport MitoModelCatalog from '@/themes/mito/ModelCatalog.vue'\nimport { isMitoTheme } from '@/themes/mito'"
      },
      {
        "before": "<div class=\"space-y-5\">",
        "after": "<MitoModelCatalog\n    v-if=\"isMitoTheme\"\n    :groups=\"response?.groups ?? []\"\n    :loading=\"loading\"\n    :error=\"error\"\n    :anonymous=\"!isAuthenticated\"\n    :monitoring-unavailable=\"response?.monitoring_unavailable\"\n    @refresh=\"$emit('refresh')\"\n  />\n  <div v-else class=\"space-y-5\">"
      },
      {
        "before": "const { t } = useI18n()",
        "after": "defineEmits<{ (event: 'refresh'): void }>()\n\nconst { t } = useI18n()"
      }
    ]
  },
  {
    path: "frontend/src/components/modelPlaza/PlazaFilterBar.vue",
    edits: [
      {
        before: "<div class=\"space-y-3\">",
        after: "<div class=\"mito-plaza-filters space-y-3\">"
      },
      {
        before: "<!-- 一级:平台 -->\n    <div class=\"flex items-start gap-2\">",
        after: "<!-- 一级:平台 -->\n    <div class=\"mito-plaza-filter-row flex items-start gap-2\">"
      },
      {
        before: "<!-- 二级:分组(按所属平台着色,当前组合下无结果的置灰) -->\n    <div class=\"flex items-start gap-2\">",
        after: "<!-- 二级:分组(按所属平台着色,当前组合下无结果的置灰) -->\n    <div class=\"mito-plaza-filter-row flex items-start gap-2\">"
      },
      {
        before: "<!-- 三级:倍率(当前组合下不存在的置灰) -->\n    <div class=\"flex items-start gap-2\">",
        after: "<!-- 三级:倍率(当前组合下不存在的置灰) -->\n    <div class=\"mito-plaza-filter-row flex items-start gap-2\">"
      },
      {
        before: "<div class=\"flex flex-wrap items-start gap-2\">",
        after: "<div class=\"mito-plaza-filter-row mito-plaza-search-row flex flex-wrap items-start gap-2\">"
      },
      {
        before: "<div class=\"relative w-full sm:w-72\">",
        after: "<div class=\"mito-plaza-search relative w-full sm:w-72\">"
      },
      {
        before: "@click=\"$emit('update:platform', p)\"",
        after: ":aria-pressed=\"platform === p\"\n          @click=\"$emit('update:platform', p)\""
      },
      {
        before: "@click=\"$emit('update:groupId', 'all')\"",
        after: ":aria-pressed=\"groupId === 'all'\"\n          @click=\"$emit('update:groupId', 'all')\""
      },
      {
        before: "@click=\"$emit('update:groupId', g.id)\"",
        after: ":aria-pressed=\"groupId === g.id\"\n          @click=\"$emit('update:groupId', g.id)\""
      },
      {
        before: "@click=\"$emit('update:rate', 'all')\"",
        after: ":aria-pressed=\"rate === 'all'\"\n          @click=\"$emit('update:rate', 'all')\""
      },
      {
        before: "@click=\"$emit('update:rate', r)\"",
        after: ":aria-pressed=\"rate === r\"\n          @click=\"$emit('update:rate', r)\""
      },
      {
        before: ":placeholder=\"t('modelPlaza.filters.searchPlaceholder')\"",
        after: ":placeholder=\"t('modelPlaza.filters.searchPlaceholder')\"\n          :aria-label=\"t('modelPlaza.filters.modelLabel')\""
      },
      {
        before: "@click=\"$emit('update:search', '')\"",
        after: ":aria-label=\"t('common.clear')\"\n          @click=\"$emit('update:search', '')\""
      }
    ]
  },
  {
    path: "frontend/src/components/modelPlaza/PlazaGroupSection.vue",
    edits: [
      {
        before: "class=\"overflow-hidden rounded-2xl border bg-white shadow-card dark:bg-dark-800/50\"",
        after: "class=\"mito-plaza-group overflow-hidden rounded-2xl border bg-white shadow-card dark:bg-dark-800/50\""
      },
      {
        before: "<header class=\"border-b",
        after: "<header class=\"mito-plaza-group-header border-b"
      },
      {
        before: "<div class=\"flex flex-wrap items-center gap-2\">",
        after: "<div class=\"mito-plaza-group-heading flex flex-wrap items-center gap-2\">"
      },
      {
        before: "<p v-if=\"group.description\" class=\"mt-2",
        after: "<p v-if=\"group.description\" class=\"mito-plaza-group-description mt-2"
      },
      {
        before: "        <GroupBadge\n          :name=\"group.name\"\n          :platform=\"group.platform as GroupPlatform\"\n          :subscription-type=\"(group.subscription_type || 'standard') as SubscriptionType\"\n          :rate-multiplier=\"group.rate_multiplier\"\n          :user-rate-multiplier=\"group.user_rate_multiplier ?? null\"\n          :peak-rate-enabled=\"group.peak_rate_enabled\"\n          :peak-start=\"group.peak_start\"\n          :peak-end=\"group.peak_end\"\n          :peak-rate-multiplier=\"group.peak_rate_multiplier\"\n          always-show-rate\n        />",
        after: "        <h2 class=\"mito-plaza-group-title\">\n          <GroupBadge\n            class=\"mito-plaza-group-badge\"\n            :name=\"group.name\"\n            :platform=\"group.platform as GroupPlatform\"\n            :subscription-type=\"(group.subscription_type || 'standard') as SubscriptionType\"\n            :rate-multiplier=\"group.rate_multiplier\"\n            :user-rate-multiplier=\"group.user_rate_multiplier ?? null\"\n            :peak-rate-enabled=\"group.peak_rate_enabled\"\n            :peak-start=\"group.peak_start\"\n            :peak-end=\"group.peak_end\"\n            :peak-rate-multiplier=\"group.peak_rate_multiplier\"\n            always-show-rate\n          />\n        </h2>"
      }
    ]
  },
  {
    path: "frontend/src/components/modelPlaza/PlazaModelPricingTable.vue",
    edits: [
      {
        before: "<div class=\"plaza-pricing-table overflow-x-auto\" :style=\"accentStyle\">",
        after: "<div\n    class=\"mito-plaza-prices plaza-pricing-table overflow-x-auto\"\n    :style=\"accentStyle\"\n    tabindex=\"0\"\n    role=\"region\"\n    :aria-label=\"t('modelPlaza.title')\"\n  >"
      },
      {
        before: "rowspan=\"2\"\n            class=\"border-r",
        after: "rowspan=\"2\"\n            scope=\"col\"\n            class=\"mito-plaza-model-col border-r"
      },
      {
        before: "<th colspan=\"3\" class=\"pz-bg pt-2 text-center\">",
        after: "<th colspan=\"3\" scope=\"colgroup\" class=\"mito-plaza-paid-heading pz-bg pt-2 text-center\">"
      },
      {
        before: "colspan=\"3\"\n            class=\"border-l",
        after: "colspan=\"3\"\n            scope=\"colgroup\"\n            class=\"mito-plaza-official-heading border-l"
      },
      {
        before: "rowspan=\"2\"\n            class=\"border-l",
        after: "rowspan=\"2\"\n            scope=\"col\"\n            class=\"mito-plaza-rate-col border-l"
      },
      {
        before: "<th class=\"pz-bg px-3 py-2 font-medium\">{{ t('modelPlaza.table.input') }}</th>",
        after: "<th scope=\"col\" class=\"pz-bg px-3 py-2 font-medium\">{{ t('modelPlaza.table.input') }}</th>"
      },
      {
        before: "<th class=\"pz-bg px-3 py-2 font-medium\">{{ t('modelPlaza.table.output') }}</th>",
        after: "<th scope=\"col\" class=\"pz-bg px-3 py-2 font-medium\">{{ t('modelPlaza.table.output') }}</th>"
      },
      {
        before: "<th class=\"pz-bg px-3 py-2 font-medium\">{{ t('modelPlaza.table.cache') }}</th>",
        after: "<th scope=\"col\" class=\"pz-bg px-3 py-2 font-medium\">{{ t('modelPlaza.table.cache') }}</th>"
      },
      {
        before: "<th class=\"border-l border-gray-100 px-3 py-2 font-medium dark:border-dark-700/60\">",
        after: "<th scope=\"col\" class=\"mito-plaza-official-col border-l border-gray-100 px-3 py-2 font-medium dark:border-dark-700/60\">"
      },
      {
        before: "<th class=\"px-3 py-2 font-medium\">{{ t('modelPlaza.table.output') }}</th>",
        after: "<th scope=\"col\" class=\"mito-plaza-official-col px-3 py-2 font-medium\">{{ t('modelPlaza.table.output') }}</th>"
      },
      {
        before: "<th class=\"px-3 py-2 font-medium\">{{ t('modelPlaza.table.cache') }}</th>",
        after: "<th scope=\"col\" class=\"mito-plaza-official-col px-3 py-2 font-medium\">{{ t('modelPlaza.table.cache') }}</th>"
      },
      {
        before: "<td class=\"border-r border-gray-100 py-2.5 pl-5 pr-4 align-middle dark:border-dark-700/60\">",
        after: "<td class=\"mito-plaza-model-col border-r border-gray-100 py-2.5 pl-5 pr-4 align-middle dark:border-dark-700/60\">"
      },
      {
        before: "<span class=\"font-medium text-gray-900 dark:text-white\">{{ m.name }}</span>",
        after: "<span class=\"mito-plaza-model-name font-medium text-gray-900 dark:text-white\">{{ m.name }}</span>"
      },
      {
        before: "class=\"border-l border-gray-100 px-3 py-2.5 align-middle font-mono text-xs text-gray-500 dark:border-dark-700/60 dark:text-dark-400\"",
        after: "class=\"mito-plaza-official-col border-l border-gray-100 px-3 py-2.5 align-middle font-mono text-xs text-gray-500 dark:border-dark-700/60 dark:text-dark-400\""
      },
      {
        before: "<td class=\"px-3 py-2.5 align-middle font-mono text-xs text-gray-500 dark:text-dark-400\">",
        after: "<td class=\"mito-plaza-official-col px-3 py-2.5 align-middle font-mono text-xs text-gray-500 dark:text-dark-400\">"
      },
      {
        before: "<td class=\"px-3 py-2.5 align-middle\">",
        after: "<td class=\"mito-plaza-official-col px-3 py-2.5 align-middle\">"
      },
      {
        before: "class=\"border-l border-gray-100 py-2.5 pl-3 pr-5 text-right align-middle font-mono text-xs dark:border-dark-700/60\"",
        after: "class=\"mito-plaza-rate-col border-l border-gray-100 py-2.5 pl-3 pr-5 text-right align-middle font-mono text-xs dark:border-dark-700/60\""
      }
    ]
  },
  {
    path: 'frontend/src/views/admin/UsageView.vue',
    edits: [
      {"before":"<div class=\"space-y-6\">","after":"<div class=\"mito-admin-usage space-y-6\">"},
      {"before":"<UsageStatsCards :stats=\"usageStats\" />","after":"<UsageStatsCards class=\"mito-admin-usage-stats\" :stats=\"usageStats\" />"},
      {"before":"<div class=\"space-y-4\">","after":"<div class=\"mito-admin-usage-charts space-y-4\">"},
      {"before":"<div class=\"card p-4\">","after":"<div class=\"mito-admin-usage-date card p-4\">"},
      {"before":"<div class=\"card\">","after":"<div class=\"mito-admin-usage-panel card\">"},
      {"before":"<div class=\"flex flex-wrap items-center border-b border-gray-200 px-2 dark:border-dark-700 sm:px-4\">","after":"<div class=\"mito-admin-usage-tabs flex flex-wrap items-center border-b border-gray-200 px-2 dark:border-dark-700 sm:px-4\">"},
      {"before":"data-testid=\"usage-detail-tab\"","after":"data-testid=\"usage-detail-tab\"\n            :aria-pressed=\"activeTab === tab.key\""},
      {"before":":mode=\"activeTab\" class=\"border-b border-gray-100 dark:border-dark-700/50\"","after":":mode=\"activeTab\" class=\"mito-admin-usage-filters border-b border-gray-100 dark:border-dark-700/50\""},
      {"before":"<div v-show=\"activeTab === 'usage'\" class=\"overflow-hidden rounded-b-2xl\">","after":"<div v-show=\"activeTab === 'usage'\" class=\"mito-admin-usage-records overflow-hidden rounded-b-2xl\">"},
      {"before":"<Pagination v-if=\"pagination.total > 0\"","after":"<Pagination class=\"mito-admin-usage-pagination\" v-if=\"pagination.total > 0\""},
      {"before":"import UsageTable from '@/components/admin/usage/UsageTable.vue'; import UsageExportProgress from '@/components/admin/usage/UsageExportProgress.vue'","after":"// mito-theme: the admin usage list reuses the request-log presentation.\nimport UsageTable from '@/themes/mito/AdminRequestLogTable.vue'\nimport { useAdminUsageColumns, ADMIN_USAGE_DEFAULT_HIDDEN_COLUMNS } from '@/themes/mito/adminRequestLogColumns'\nimport UsageExportProgress from '@/components/admin/usage/UsageExportProgress.vue'"},
      {"before":"const allColumns = computed(() => [\n  { key: 'user', label: t('admin.usage.user'), sortable: false },\n  { key: 'api_key', label: t('usage.apiKeyFilter'), sortable: false },\n  { key: 'account', label: t('admin.usage.account'), sortable: false },\n  { key: 'model', label: t('usage.model'), sortable: true },\n  { key: 'reasoning_effort', label: t('usage.reasoningEffort'), sortable: false },\n  { key: 'endpoint', label: t('usage.endpoint'), sortable: false },\n  { key: 'group', label: t('admin.usage.group'), sortable: false },\n  { key: 'stream', label: t('usage.type'), sortable: false },\n  { key: 'billing_mode', label: t('admin.usage.billingMode'), sortable: false },\n  { key: 'tokens', label: t('usage.tokens'), sortable: false },\n  { key: 'cost', label: t('usage.cost'), sortable: false },\n  { key: 'latency', label: t('usage.latency'), sortable: false },\n  { key: 'created_at', label: t('usage.time'), sortable: true },\n  { key: 'request_id', label: t('admin.usage.requestId'), sortable: false },\n  { key: 'upstream_request_id', label: t('admin.usage.upstreamRequestId'), sortable: false },\n  { key: 'user_agent', label: t('usage.userAgent'), sortable: false },\n  { key: 'ip_address', label: t('admin.usage.ipAddress'), sortable: false }\n])","after":"const allColumns = useAdminUsageColumns()"},
      {"before":"const DEFAULT_HIDDEN_COLUMNS = ['request_id', 'upstream_request_id', 'user_agent']","after":"const DEFAULT_HIDDEN_COLUMNS = [...ADMIN_USAGE_DEFAULT_HIDDEN_COLUMNS]"},
      {"before":"const HIDDEN_COLUMNS_CURRENT_VERSION = 'upstream-request-id-hidden-by-default'","after":"const HIDDEN_COLUMNS_CURRENT_VERSION = 'admin-request-log-columns-v2'"},
      {"before":"        hiddenColumns.add('upstream_request_id')","after":"        hiddenColumns.add('upstream_request_id')\n        DEFAULT_HIDDEN_COLUMNS.forEach((key) => hiddenColumns.add(key))"}
    ]
  },
  {
    "path": "frontend/src/components/admin/usage/UsageFilters.vue",
    "edits": [
      {
        "before": "class=\"flex flex-wrap items-end justify-between gap-4\"",
        "after": "class=\"mito-filter-layout mito-usage-filter-layout flex flex-wrap items-end justify-between gap-4\""
      },
      {
        "before": "class=\"flex flex-1 flex-wrap items-end gap-4\"",
        "after": "v-show=\"expanded\" :id=\"panelId\" class=\"mito-filter-fields mito-usage-filter-fields flex flex-1 flex-wrap items-end gap-4\""
      },
      {
        "before": "class=\"flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto\"",
        "after": "class=\"mito-filter-actions mito-usage-filter-actions flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto\""
      },
      {
        "before": "<div :class=\"flat ? 'p-4 sm:p-6' : 'card p-6'\">",
        "after": "<MitoFilterSection v-slot=\"{ expanded, panelId }\" :selected-count=\"activeFilterCount\" :class=\"flat ? 'p-4 sm:p-6' : 'card p-6'\">"
      },
      {
        "before": "    </div>\n  </div>\n</template>",
        "after": "    </div>\n  </MitoFilterSection>\n</template>"
      },
      {
        "before": "import type { SimpleUser } from '@/api/admin/usage'",
        "after": "import type { SimpleUser } from '@/api/admin/usage'\nimport MitoFilterSection from '@/themes/mito/FilterSection.vue'"
      },
      {
        "before": "const filters = toRef(props, 'modelValue')",
        "after": "const filters = toRef(props, 'modelValue')\n\nconst activeFilterCount = computed(() => {\n  const keys = ['api_key_id', 'account_id', 'model', 'group_id']\n  if (!observerMode) keys.push('user_id')\n  if (props.mode === 'errors') {\n    keys.push('error_phase', 'error_category', 'status_code')\n  } else {\n    keys.push('request_type', 'native_compaction_v2', 'billing_type')\n    if (props.mode === 'usage') keys.push('billing_mode', 'upstream_model_mismatch')\n  }\n  return keys.filter(key => {\n    const value = filters.value[key]\n    return value !== undefined && value !== null && value !== ''\n  }).length\n})"
      }
    ]
  },
  {
    "path": "frontend/src/views/admin/AccountsView.vue",
    "edits": [
      {
        "before": "<div ref=\"accountTableRef\" class=\"flex min-h-0 flex-1 flex-col overflow-hidden\">",
        "after": "<div ref=\"accountTableRef\" class=\"mito-accounts-table flex min-h-0 flex-1 flex-col overflow-hidden\">"
      },
      {
        "before": "<template #cell-name=\"{ row, value }\">\n            <div class=\"flex flex-col\">",
        "after": "<template #cell-name=\"{ row, value }\">\n            <div class=\"mito-account-identity flex flex-col\">"
      },
      {
        "before": "<template #cell-platform_type=\"{ row }\">\n            <div class=\"flex min-w-0 flex-col gap-1\">",
        "after": "<template #cell-platform_type=\"{ row }\">\n            <div class=\"mito-account-platform flex min-w-0 flex-col gap-1\">"
      },
      {
        "before": "<template #cell-actions=\"{ row }\">\n            <div class=\"flex items-center gap-1\">",
        "after": "<template #cell-actions=\"{ row }\">\n            <div class=\"mito-account-actions flex items-center gap-1\">"
      },
      {"before":"import DataTable from '@/components/common/DataTable.vue'","after":"import DataTable from '@/components/common/DataTable.vue'\nimport { isMitoTheme } from '@/themes/mito'\nimport { withAccountColumnSizes } from '@/themes/mito/accountTableColumns'"},
      {"before":"          :sort-storage-key=\"ACCOUNT_SORT_STORAGE_KEY\"","after":"          :sort-storage-key=\"ACCOUNT_SORT_STORAGE_KEY\"\n          :resizable-columns=\"isMitoTheme\"\n          column-width-storage-key=\"mito-account-column-widths-v1\""},
      {"before":"const cols = computed(() =>\n  allColumns.value.filter(col =>\n    col.key === 'select' || col.key === 'name' || col.key === 'actions' || !hiddenColumns.has(col.key)\n  )\n)","after":"const cols = computed(() => {\n  const visibleColumns = allColumns.value.filter(col =>\n    col.key === 'select' || col.key === 'name' || col.key === 'actions' || !hiddenColumns.has(col.key)\n  )\n  return isMitoTheme ? withAccountColumnSizes(visibleColumns) : visibleColumns\n})"}
    ]
  },
  {
    "path": "frontend/src/components/account/UsageProgressBar.vue",
    "edits": [
      {
        "before": "<template>\n  <div>",
        "after": "<template>\n  <div class=\"mito-account-usage-window\">"
      },
      {
        "before": "class=\"mb-0.5 flex items-center\"",
        "after": "class=\"mito-account-usage-stats mb-0.5 flex items-center\""
      },
      {
        "before": "class=\"flex items-center gap-1.5 text-[9px]",
        "after": "class=\"mito-account-usage-metrics flex items-center gap-1.5 text-[9px]"
      },
      {
        "before": "<div class=\"flex items-center gap-1\">",
        "after": "<div class=\"mito-account-usage-progress flex items-center gap-1\">"
      }
    ]
  },
  {
    "path": "frontend/src/views/admin/AuditLogView.vue",
    "edits": [
      {
        "before": "<TablePageLayout>",
        "after": "<TablePageLayout class=\"mito-audit-log\">"
      },
      {
        "before": "<div class=\"card p-4 sm:p-6\">",
        "after": "<MitoFilterSection v-slot=\"{ expanded, panelId }\" :selected-count=\"activeFilterCount\" class=\"mito-audit-filters card p-4 sm:p-6\">"
      },
      {
        "before": "<div class=\"flex flex-wrap items-end justify-between gap-4\">",
        "after": "<div class=\"mito-filter-layout flex flex-wrap items-end justify-between gap-4\">"
      },
      {
        "before": "<div class=\"flex flex-1 flex-wrap items-end gap-4\">",
        "after": "<div v-show=\"expanded\" :id=\"panelId\" class=\"mito-filter-fields mito-filter-fields--audit flex flex-1 flex-wrap items-end gap-4\">"
      },
      {
        "before": "<div class=\"flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto\">",
        "after": "<div class=\"mito-filter-actions flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto\">"
      },
      {
        "before": "          </div>\n        </div>\n      </template>\n\n      <!-- Table -->",
        "after": "          </div>\n        </MitoFilterSection>\n      </template>\n\n      <!-- Table -->"
      },
      {
        "before": "<span class=\"whitespace-nowrap text-gray-600 dark:text-gray-300\">{{ formatTime(value) }}</span>",
        "after": "<span class=\"mito-audit-time whitespace-nowrap text-gray-600 dark:text-gray-300\">{{ formatTime(value) }}</span>"
      },
      {
        "before": "<div class=\"min-w-0 max-w-[220px]\">",
        "after": "<div class=\"mito-audit-actor min-w-0 max-w-[220px]\">"
      },
      {
        "before": "<div class=\"min-w-0 max-w-xs\">",
        "after": "<div class=\"mito-audit-action min-w-0 max-w-xs\">"
      },
      {
        "before": "<span class=\"whitespace-nowrap text-gray-500 dark:text-gray-400\">{{ value }} ms</span>",
        "after": "<span class=\"mito-audit-latency whitespace-nowrap text-gray-500 dark:text-gray-400\">{{ value }} ms</span>"
      },
      {
        "before": "<span class=\"whitespace-nowrap font-mono text-gray-600 dark:text-gray-300\">{{ value || '—' }}</span>",
        "after": "<span class=\"mito-audit-ip whitespace-nowrap font-mono text-gray-600 dark:text-gray-300\">{{ value || '—' }}</span>"
      },
      {
        "before": "class=\"inline-flex items-center gap-1 font-medium text-primary-600 transition-colors",
        "after": "class=\"mito-audit-detail-button inline-flex items-center gap-1 font-medium text-primary-600 transition-colors"
      },
      {
        "before": "<div class=\"flex flex-col items-center py-8\">",
        "after": "<div class=\"mito-audit-empty flex flex-col items-center py-8\">"
      },
      {
        "before": "<div v-else-if=\"detail\" class=\"space-y-5 py-2\">",
        "after": "<div v-else-if=\"detail\" class=\"mito-audit-detail space-y-5 py-2\">"
      },
      {
        "before": "class=\"rounded-2xl border border-gray-200 bg-gray-50/60 p-5",
        "after": "class=\"mito-audit-detail-hero rounded-2xl border border-gray-200 bg-gray-50/60 p-5"
      },
      {
        "before": "import { useAppStore } from '@/stores'",
        "after": "import { useAppStore } from '@/stores'\nimport MitoFilterSection from '@/themes/mito/FilterSection.vue'"
      },
      {
        "before": "const timeRange = ref('')",
        "after": "const timeRange = ref('')\nconst activeFilterCount = computed(() =>\n  Object.values(filters).filter(Boolean).length + Number(Boolean(timeRange.value))\n)"
      },
      {
        "before": "{ key: 'created_at', label: t('admin.audit.columns.time') }",
        "after": "{ key: 'created_at', label: t('admin.audit.columns.time'), class: 'mito-audit-col-created_at' }"
      },
      {
        "before": "{ key: 'actor', label: t('admin.audit.columns.actor') }",
        "after": "{ key: 'actor', label: t('admin.audit.columns.actor'), class: 'mito-audit-col-actor' }"
      },
      {
        "before": "{ key: 'action', label: t('admin.audit.columns.action') }",
        "after": "{ key: 'action', label: t('admin.audit.columns.action'), class: 'mito-audit-col-action' }"
      },
      {
        "before": "{ key: 'status_code', label: t('admin.audit.columns.result') }",
        "after": "{ key: 'status_code', label: t('admin.audit.columns.result'), class: 'mito-audit-col-status_code' }"
      },
      {
        "before": "{ key: 'latency_ms', label: t('admin.audit.detail.latency') }",
        "after": "{ key: 'latency_ms', label: t('admin.audit.detail.latency'), class: 'mito-audit-col-latency_ms' }"
      },
      {
        "before": "{ key: 'client_ip', label: t('admin.audit.columns.clientIp') }",
        "after": "{ key: 'client_ip', label: t('admin.audit.columns.clientIp'), class: 'mito-audit-col-client_ip' }"
      },
      {
        "before": "{ key: 'actions', label: t('common.actions') }",
        "after": "{ key: 'actions', label: t('common.actions'), class: 'mito-audit-col-actions' }"
      }
    ]
  },
  {
    "path": "frontend/src/components/common/types.ts",
    "edits": [
      {
        "before": "  class?: string\n",
        "after": "  class?: string\n  /** Optional pixel sizing for tables that enable column resizing. */\n  width?: number\n  minWidth?: number\n  maxWidth?: number\n  resizable?: boolean\n"
      }
    ]
  },
  {
    // Mito theme folds every pelican group into a card and pages the open one; upstream keeps the row.
    path: 'frontend/src/views/user/PelicanShowcaseView.vue',
    edits: [
      {
        before: '      <!-- One section per showcased group -->\n      <section\n        v-for="group in shownGroups"\n        :key="group.id"\n        class="space-y-4"\n        :data-testid="`showcase-group-${group.id}`"\n      >\n',
        after: '      <!-- One card per showcased group. The Mito theme folds it; the header row is the disclosure control. -->\n      <template v-for="group in shownGroups" :key="group.id">\n        <MitoPelicanShowcaseGroup\n          v-if="isMitoTheme"\n          :group="group"\n          :bodies="bodies"\n          :expanded="expandedGroups.includes(group.id)"\n          @toggle="toggleGroup(group.id)"\n          @visible="requestBody"\n          @open="openPreview"\n        />\n        <section\n          v-else\n          class="space-y-4"\n          :data-testid="`showcase-group-${group.id}`"\n        >\n'
      },
      { before: '        </PelicanShowcaseRow>\n      </section>\n', after: '        </PelicanShowcaseRow>\n        </section>\n      </template>\n' },
      {
        before: "const activeGroup = ref<TabKey>('all')\n",
        after: "const activeGroup = ref<TabKey>('all')\n// Every group starts folded: a gallery with many groups opens on the headers alone.\nconst expandedGroups = ref<number[]>([])\n"
      },
      {
        before: "  if (activeGroup.value !== 'all' && !list.some((group) => group.id === activeGroup.value)) activeGroup.value = 'all'\n})\n",
        after: "  if (activeGroup.value !== 'all' && !list.some((group) => group.id === activeGroup.value)) activeGroup.value = 'all'\n  expandedGroups.value = expandedGroups.value.filter((id) => list.some((group) => group.id === id))\n})\n"
      },
      {
        before: 'function requestBody(id: number) {\n',
        after: 'function toggleGroup(id: number) {\n  expandedGroups.value = expandedGroups.value.includes(id)\n    ? expandedGroups.value.filter((value) => value !== id)\n    : [...expandedGroups.value, id]\n}\n\nfunction requestBody(id: number) {\n'
      },
      { before: "import PelicanShowcaseRow from '@/components/user/pelican/PelicanShowcaseRow.vue'", after: "import PelicanShowcaseRow from '@/components/user/pelican/PelicanShowcaseRow.vue'\nimport MitoPelicanShowcaseGroup from '@/themes/mito/PelicanShowcaseGroup.vue'\nimport { isMitoTheme } from '@/themes/mito'" }
    ]
  },
  {
    path: 'frontend/src/views/admin/__tests__/UsageView.spec.ts',
    edits: [
      { before: "      'upstream-request-id-hidden-by-default',", after: "      'admin-request-log-columns-v2'," }
    ]
  }
]

/** Fail explicitly if a future update breaks the props/utility contracts we use. */
export const contracts = [
  {"path": "frontend/src/themes/mito/PlazaHomeLink.vue", "anchors": ["to=\"/home\"", "modelPlaza.nav.home", "mito-plaza-home-link"]},
  {"path": "frontend/src/themes/mito/ModelCatalog.vue", "anchors": ["catalogSections(props.groups)", "ModelCatalogCard", "PlazaGroupSection", "selectedKey"]},
  {"path": "frontend/src/themes/mito/ModelCatalogCard.vue", "anchors": ["catalogPriceRows(props.model)", "catalogRate(props.model, props.group)", "ModelMonitorStrip", "priceDisplay", "copyToClipboard"]},
  {"path": "frontend/src/themes/mito/modelCatalog.ts", "anchors": ["export function catalogSections", "export function catalogRate", "export function catalogPriceRows", "resolveIntervalPrices", "group.user_rate_multiplier ?? group.rate_multiplier"]},
  {"path": "frontend/src/themes/mito/model-catalog.css", "anchors": ["html[data-ui-theme='mito']", "--catalog-surface: #fff", "--catalog-surface: #182235", ".mito-plaza-home-link", ".mito-plaza-nav-actions", ".mito-model-grid", "repeat(3, minmax(0, 1fr))", "prefers-reduced-motion"]},
  {"path": "frontend/src/themes/mito/index.ts", "anchors": ["import './model-catalog.css'"]},
  {"path": "frontend/src/api/modelPlaza.ts", "anchors": ["export interface PlazaModel", "export interface ModelPlazaGroup", "user_rate_multiplier?: number", "long_context_pricing_enabled: boolean"]},
  {"path": "frontend/src/utils/pricing.ts", "anchors": ["export function resolveIntervalPrices", "export function formatScaled"]},
  {"path": "frontend/src/components/common/ModelIcon.vue", "anchors": ["model: string", "size?: string"]},
  {"path": "frontend/src/themes/mito/__tests__/ModelCatalog.spec.ts", "anchors": ["pricing parity", "keeps different group offers", "unknown"]},
  {"path":"frontend/src/themes/mito/AdminRequestLogTable.vue","anchors":["variant=\"request-log\"","column-width-storage-key","mito-log-cost-cell"]},
  {"path":"frontend/src/themes/mito/adminRequestLogColumns.ts","anchors":["export function useAdminUsageColumns","ADMIN_USAGE_DEFAULT_HIDDEN_COLUMNS","mito-log-col-time"]},
  {"path":"frontend/src/components/layout/AppSidebar.vue","anchors":["class=\"sidebar\"","isGroupExpanded(item)","handleGroupClick(item)","toggleSidebar"]},
  {"path":"frontend/src/themes/mito/FilterSection.vue","anchors":["const expanded = ref(false)"]},
  {"path":"frontend/src/themes/mito/useTableColumnResize.ts","anchors":["export function useTableColumnResize","onBeforeUnmount(cancelDrag)","window.removeEventListener('pointermove'","version: 1"]},
  {"path":"frontend/src/themes/mito/accountTableColumns.ts","anchors":["export function withAccountColumnSizes","resizable: false"]},
  {"path":"frontend/src/themes/mito/table-resize.css","anchors":["html[data-ui-theme='mito']",".mito-column-resize-handle","touch-action: none","prefers-reduced-motion"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './table-resize.css'"]},
  {
    "path": "frontend/src/themes/mito/FilterSection.vue",
    "anchors": [
      ":aria-expanded=\"visible\"",
      ":aria-controls=\"panelId\"",
      "<slot v-bind=\"{ expanded: visible, panelId }\" />",
      "!isMitoTheme || expanded.value"
    ]
  },
  {
    "path": "frontend/src/themes/mito/filter-section.css",
    "anchors": [
      "html[data-ui-theme='mito']",
      "grid-template-columns: minmax(0, 1fr)",
      "@container mito-filters",
      "prefers-reduced-motion"
    ]
  },
  {
    "path": "frontend/src/themes/mito/accounts.css",
    "anchors": [
      "html[data-ui-theme='mito']",
      ".mito-accounts-table",
      "tr[data-row-id]",
      ".mito-account-usage-progress"
    ]
  },
  {
    "path": "frontend/src/themes/mito/audit-log.css",
    "anchors": [
      "html[data-ui-theme='mito']",
      ".mito-audit-log",
      ".mito-audit-detail-button",
      "prefers-reduced-motion"
    ]
  },
  {
    "path": "frontend/src/themes/mito/index.ts",
    "anchors": [
      "import './filter-section.css'",
      "import './accounts.css'",
      "import './audit-log.css'"
    ]
  },
  {
    "path": "frontend/src/components/common/DataTable.vue",
    "anchors": [
      ":data-row-id=\"resolveRowKey(item.row, item.index)\"",
      "measureElement",
      "column.class"
    ]
  },
  {
    "path": "frontend/src/components/icons/Icon.vue",
    "anchors": [
      "chevronDown:",
      "filter:"
    ]
  },
  {"path":"frontend/src/themes/mito/admin-usage.css","anchors":["html[data-ui-theme='mito']",".mito-admin-usage-records",".mito-admin-usage-filters",".mito-usage-latency","prefers-reduced-motion"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './admin-usage.css'"]},
  {"path":"frontend/src/components/common/DataTable.vue","anchors":["column.class",":data-field=\"column.key\"","data-test=\"mobile-sort-controls\"","virtualPaddingTop"]},
  {"path":"frontend/src/components/admin/usage/UsageStatsCards.vue","anchors":["class=\"card p-4 flex items-center gap-3\"","class=\"text-xl font-bold","showAccountCost && totalAccountCost != null"]},
  {"path":"frontend/src/themes/mito/model-plaza.css","anchors":["html[data-ui-theme='mito']",".mito-plaza-filters",".mito-plaza-prices","@container mito-plaza","mito-plaza-page-in","mito-plaza-card-in","mito-plaza-row-in","mito-plaza-sweep","prefers-reduced-motion"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './model-plaza.css'"]},
  {"path":"frontend/src/themes/mito/dashboard.css","anchors":["html[data-ui-theme='mito']",".mito-admin-dashboard","mito-dash-card-in","mito-dash-sweep","prefers-reduced-motion",".card:has(.date-picker-trigger)"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './dashboard.css'"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './ops-monitor.css'"]},
  {"path":"frontend/src/components/common/GroupBadge.vue","anchors":["<span :class=\"truncate ? 'truncate' : 'min-w-0 whitespace-normal [overflow-wrap:anywhere]'\">{{ name }}</span>","alwaysShowRate?: boolean"]},
  { path: 'frontend/src/themes/mito/useUsageFilters.ts', anchors: ['export function useUsageFilters', 'export function defaultUsageRange', 'export function usageGranularity'] },
  { path: 'frontend/src/themes/mito/requestLogColumns.ts', anchors: ['export function useRequestLogColumns'] },
  {"path":"frontend/src/types/index.ts","anchors":["export interface UsageLog {","first_token_ms","cache_read_tokens","long_context_billing_applied","export interface UsageQueryParams {"]},
  {"path":"frontend/src/api/usage.ts","anchors":["getDashboardSnapshotV2","getDashboardModels","listMyErrorRequests","export async function query"]},
  {"path":"frontend/src/components/admin/usage/UsageTable.vue","anchors":["showTokenTooltip","showTooltip","cell-request_id"]},
  {"path":"frontend/src/utils/usageTps.ts","anchors":["export const formatUsageOutputTps"]},
  {"path":"frontend/src/utils/tablePreferences.ts","anchors":["getConfiguredTablePageSizeOptions"]},
  {"path":"frontend/src/themes/mito/RequestLogsView.vue","anchors":["<script setup lang=\"ts\">"]},
  {"path":"frontend/src/themes/mito/UsageStatsView.vue","anchors":["<script setup lang=\"ts\">"]},
  {"path":"frontend/src/themes/mito/UsageFilters.vue","anchors":["<script setup lang=\"ts\">"]},
  {"path":"frontend/src/themes/mito/RequestLogTable.vue","anchors":["<script setup lang=\"ts\">"]},
  {"path":"frontend/src/themes/mito/RequestLogPagination.vue","anchors":["<script setup lang=\"ts\">"]},
  { path: 'frontend/src/api/usage.ts', anchors: ['interface UserDashboardStats', 'today_actual_cost:', 'today_cache_read_tokens:', 'average_duration_ms:'] },
  { path: 'frontend/src/components/common/DataTable.vue', anchors: ['virtualPaddingTop', ':colspan="tableColumnCount"', 'class="table-wrapper"'] },
  { path: 'frontend/src/components/common/Pagination.vue', anchors: ['page-size-select', ':aria-current=', 'sm:justify-between'] },
  { path: 'frontend/src/router/title.ts', anchors: ['export function resolveRouteMetaKeys('] },
  { path: 'frontend/src/components/common/BaseDialog.vue', anchors: ['<Transition name="modal">', "'drawer-content': placement === 'right'"] },
  { path: 'frontend/src/components/common/Select.vue', anchors: ['<Transition name="select-dropdown">', 'select-dropdown-portal'] },
  { path: 'frontend/src/components/admin/group/GroupPolicyUserGroupSelect.vue', anchors: ['adminAPI.userGroups.list()', '<Select', 'configuredIds', '#option'] },
  ...['GroupRateMultipliersModal', 'GroupRPMOverridesModal', 'GroupUserDeniedModelsModal'].map(name => ({
    path: `frontend/src/components/admin/group/${name}.vue`,
    anchors: ['<GroupPolicyUserGroupSelect', ':configured-ids=', ':key="group.id"']
  })),
  { path: 'frontend/src/components/admin/group/ModelTagInput.vue', anchors: ['role="combobox"', 'role="listbox"', 'select-dropdown-portal', 'isComposing'] },
  { path: 'frontend/src/components/common/NavigationProgress.vue', anchors: ['name="progress-fade"', 'navigation-progress-bar'] },
  { path: 'frontend/src/style.css', anchors: ['.card {', '.input {', '.btn-primary {', '.sidebar-link-active {'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ['export const isMitoTheme'] },
  { path: 'frontend/src/themes/mito/theme.css', anchors: ["html[data-ui-theme='mito']", '--mito-primary-600:', '.mito-request-log-table', '.mito-request-log-pagination', '@keyframes mito-request-log-progress'] },
  { path: 'frontend/src/themes/mito/channel-status.css', anchors: ["html[data-ui-theme='mito']", 'monitor-v3-category', 'monitor-v3-featured-availability', 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/available-channels.css', anchors: ["html[data-ui-theme='mito']", "[data-testid='desktop-channels']", "[data-testid='mobile-channels']", 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ["import './available-channels.css'"] },
  { path: 'frontend/src/themes/mito/DashboardStats.vue', anchors: ['stats: UserDashboardStats'] },
  { path: 'frontend/src/themes/mito/DashboardCharts.vue', anchors: ['trend: TrendDataPoint[]', 'models: ModelStat[]'] },
  { path: 'frontend/src/themes/mito/useChartTooltip.ts', anchors: ['export function useChartTooltip'] },
  {"path":"frontend/src/themes/mito/ops-monitor.css","anchors":["html[data-ui-theme='mito']",".mito-ops-dashboard","mito-ops-card-in","mito-ops-sweep","prefers-reduced-motion"]},
  { path: 'frontend/src/themes/mito/assets/outfit-latin.ttf', binary: true },
  { path: 'frontend/src/themes/mito/PelicanShowcaseGroup.vue', anchors: ['mito-pelican-group', 'mito-pelican-group-header', 'mito-pelican-group-chevron', 'aria-expanded', 'data-testid="pelican-showcase-body"'] },
  { path: 'frontend/src/themes/mito/pelican-showcase.css', anchors: ["html[data-ui-theme='mito']", '.mito-pelican-group-header', '.mito-pelican-group-chevron', '.mito-pelican-grid', 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ["import './pelican-showcase.css'"] },
  { path: 'frontend/src/themes/mito/sidebarSections.ts', anchors: ['SIDEBAR_SECTIONS', 'USER_SIDEBAR_SECTIONS', 'export function applyMitoSidebarSections', 'export function applyMitoUserSidebarSections', 'nav.sections.overview'] },
  { path: 'frontend/src/themes/mito/landing.css', anchors: ["html[data-ui-theme='mito']", '.mito-landing', '.mito-hero-title', '.mito-cta', '.mito-glass-card', '--terminal-body: #fff', '--terminal-body: #0d1627', 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/LandingParticles.vue', anchors: ['mito-particles', 'prefers-reduced-motion', 'visibilitychange', 'requestAnimationFrame', 'onMotionChange'] },
  { path: 'frontend/src/themes/mito/README.md', anchors: ['## 默认首页', 'LandingPage.vue', '终端示例'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ["import './landing.css'"] },
  { path: 'frontend/src/themes/mito/LandingPage.vue', anchors: ['mito-landing', 'LandingParticles', 'mito-hero-title', 'mito-provider', 'showModelPlazaEntry', 'dashboardPath', 'CoreFeatures', 'PlaygroundSandbox'] },
  { path: 'frontend/src/themes/mito/CoreFeatures.vue', anchors: ['mito-core-section', 'mito-core-grid', 'mito-core-strip', "home.mito.core.items.gateway.title"] },
  { path: 'frontend/src/themes/mito/landing.css', anchors: ['.mito-core-section', '.mito-core-card', '.mito-core-strip', 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/PlaygroundSandbox.vue', anchors: ['mito-playground', 'mito-playground-panel', 'mito-console', 'home.mito.playground.run', 'const preview = computed', 'displayedOutput', 'home.mito.playground.statePreview', 'prefers-reduced-motion: reduce'] },
  { path: 'frontend/src/themes/mito/landing.css', anchors: ['.mito-playground-grid', '.mito-console-json', '.mito-run', 'mito-pg-blink', '--pg-console-bar:', '--pg-console-key:', '--pg-console-string:', '--pg-console-number:'] },
  { path: 'frontend/src/views/HomeView.vue', anchors: ['v-else-if="compactHomeEnabled"', 'showModelPlazaEntry', 'const dashboardPath = computed'] },
  { path: 'frontend/src/themes/mito/user-sidebar.css', anchors: ["html[data-ui-theme='mito']", '.mito-user-nav', '.mito-user-link', '.mito-user-section', 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ["import './user-sidebar.css'"] },
  { path: 'frontend/src/components/layout/AppSidebar.vue', anchors: ['userNavSections', 'mito-user-nav', 'mito-user-link'] },
  { path: 'frontend/src/themes/mito/labels.ts', anchors: ['pelicanPageSummary', 'pelicanPageSize', 'goToPage', 'pelicanExpandGroup', 'pelicanCollapseGroup'] },
  { path: 'frontend/src/components/user/pelican/PelicanShowcaseCard.vue', anchors: ['data-testid="pelican-showcase-card"', "emit('visible')", 'scrollMargin'] },
  // Contracts also run before apply/after remove; generated Mito seams are checked by edits above.
  { path: 'frontend/src/views/user/PelicanShowcaseView.vue', anchors: ['PelicanShowcaseRow', 'bodies[item.id]'] },
  { path: 'frontend/src/themes/mito/assets/noto-sans-sc-ui.woff2', binary: true }
]

// Unified marketplace integration; removable without touching upstream behavior.
for (const seam of [
  {
    "path": "frontend/src/views/ModelPlazaView.vue",
    "edits": [
      {
        "before": "class=\"min-h-screen bg-gray-50 dark:bg-dark-950\"",
        "after": "class=\"mito-plaza-page min-h-screen bg-gray-50 dark:bg-dark-950\""
      },
      {
        "before": "import { computed, onMounted, ref } from 'vue'",
        "after": "import { computed, onMounted } from 'vue'"
      },
      {
        "before": "import { getModelPlaza, type ModelPlazaResponse } from '@/api/modelPlaza'",
        "after": "import { usePlazaData } from '@/themes/mito/usePlazaData'"
      },
      {
        "before": "const data = ref<ModelPlazaResponse | null>(null)\nconst loading = ref(true)\nconst loadFailed = ref(false)\n\nonMounted(async () => {\n  // 独立形态导航条需要站点名/Logo;有 __APP_CONFIG__ 注入时同步命中缓存。\n  void appStore.fetchPublicSettings()\n  try {\n    data.value = await getModelPlaza()\n  } catch {\n    loadFailed.value = true\n  } finally {\n    loading.value = false\n  }\n})",
        "after": "const { data, loading, loadFailed, refresh } = usePlazaData(() => authStore.isAuthenticated, isMitoTheme)\n\nonMounted(() => { void appStore.fetchPublicSettings() })"
      },
      {
        "before": ":error=\"loadFailed\" embedded",
        "after": ":error=\"loadFailed\" @refresh=\"refresh\" embedded"
      },
      {
        "before": ":error=\"loadFailed\" />",
        "after": ":error=\"loadFailed\" @refresh=\"refresh\" />"
      }
    ]
  },
  {
    "path": "frontend/src/api/modelPlaza.ts",
    "edits": [
      {
        "before": "import { apiClient } from './client'",
        "after": "import { apiClient } from './client'\nimport type { PlazaMonitoring } from '@/themes/mito/plazaMonitor'"
      },
      {
        "before": "export interface PlazaModel {",
        "after": "export interface PlazaModel {\n  /** Omitted unless this exact offer has an authorized, enabled monitor. */\n  monitoring?: PlazaMonitoring"
      },
      {
        "before": "export interface ModelPlazaResponse {",
        "after": "export interface ModelPlazaResponse {\n  monitoring_unavailable?: boolean"
      }
    ]
  },
  {
    "path": "frontend/src/router/index.ts",
    "edits": [
      {
        "before": "  {\n    path: '/monitor',\n    name: 'ChannelStatus',\n    component: () => import('@/views/user/ChannelStatusView.vue'),\n    meta: {\n      requiresAuth: true,\n      requiresAdmin: false,\n      title: 'Channel Status',\n      titleKey: 'nav.channelStatus'\n    }\n  },\n",
        "after": "  {\n    path: '/monitor',\n    name: 'ChannelStatus',\n    ...(isMitoTheme ? { redirect: '/model-plaza' } : { component: () => import('@/views/user/ChannelStatusView.vue') }),\n    meta: {\n      requiresAuth: true,\n      requiresAdmin: false,\n      title: 'Channel Status',\n      titleKey: 'nav.channelStatus'\n    }\n  },\n"
      }
    ]
  },
  {
    "path": "frontend/src/components/layout/AppSidebar.vue",
    "edits": [
      {
        "before": "    { path: '/monitor', label: t('nav.channelStatus'), icon: SignalIcon, featureFlag: flagChannelMonitor },",
        "after": "    ...(isMitoTheme\n      ? [{ path: '/model-plaza', label: t('modelPlaza.title'), icon: SignalIcon, featureFlag: () => !!appStore.cachedPublicSettings?.model_plaza_enabled }]\n      : [{ path: '/monitor', label: t('nav.channelStatus'), icon: SignalIcon, featureFlag: flagChannelMonitor }]),"
      }
    ]
  },
  {
    "path": "frontend/src/components/modelPlaza/PlazaNavBar.vue",
    "edits": [
      {
        "before": "import { isMitoTheme } from '@/themes/mito'",
        "after": "import { isMitoTheme } from '@/themes/mito'\nimport MitoThemeToggle from '@/themes/mito/ThemeToggle.vue'"
      },
      {
        "before": "<MitoPlazaHomeLink v-if=\"isMitoTheme\" />",
        "after": "<MitoThemeToggle v-if=\"isMitoTheme\" />\n        <MitoPlazaHomeLink v-if=\"isMitoTheme\" />"
      }
    ]
  },
  {
    "path": "frontend/src/i18n/locales/zh/dashboard.ts",
    "edits": [
      {
        "before": "  modelPlaza: {\n",
        "after": "  modelPlaza: {\n    market: {\n      \"total\": \"本站当前已启用模型，总计 {count} 个\",\n      \"subtitle\": \"探索精选 AI 模型，清晰比较价格与状态，为不同场景选择合适的模型。\",\n      \"search\": \"搜索模型名称、供应商、端点或标签…\",\n      \"filters\": \"筛选\",\n      \"filterHint\": \"按供应商、分组、类型和标签细化模型。\",\n      \"reset\": \"重置\",\n      \"expand\": \"展开\",\n      \"collapse\": \"收起\",\n      \"facets\": {\n        \"group\": \"分组\",\n        \"vendor\": \"所有供应商\",\n        \"tag\": \"模型标签\",\n        \"billing\": \"定价类型\",\n        \"endpoint\": \"端点类型\"\n      },\n      \"all\": {\n        \"group\": \"所有分组\",\n        \"vendor\": \"所有供应商\",\n        \"tag\": \"所有标签\",\n        \"billing\": \"所有模型\",\n        \"endpoint\": \"所有类型\"\n      },\n      \"billing\": {\n        \"token\": \"按量计费\",\n        \"per_request\": \"按次计费\",\n        \"image\": \"按张计费\",\n        \"video\": \"视频计费\"\n      },\n      \"unknownVendor\": \"未标注供应商\",\n      \"noDescription\": \"暂无描述。\",\n      \"models\": \"个模型\",\n      \"group\": \"分组\",\n      \"endpoint\": \"端点\",\n      \"copy\": \"复制模型名称 {model}\",\n      \"priceDisplay\": \"价格显示口径\",\n      \"unit\": \"Token 价格单位\",\n      \"prices\": {\n        \"standard\": \"标准\",\n        \"effective\": \"实付\"\n      },\n      \"priceHint\": {\n        \"standard\": \"标准价为渠道基础单价（USD），不含分组或用户专属倍率。\",\n        \"effective\": \"实付展示标准时段下的生效倍率价格（USD）；阶梯、缓存、分时等规则请查看详情。\"\n      },\n      \"offerHint\": \"不同分组的同名模型单独展示，价格与状态按分组区分。\",\n      \"starting\": \"首档\",\n      \"sortAscending\": \"按名称升序，点击切换降序\",\n      \"sortDescending\": \"按名称降序，点击切换升序\",\n      \"name\": \"名称\",\n      \"view\": \"展示方式\",\n      \"cards\": \"卡片视图\",\n      \"list\": \"列表视图\",\n      \"status\": \"状态\",\n      \"latency\": \"延迟\",\n      \"throughput\": \"生成速度\",\n      \"noSamples\": \"暂无数据\",\n      \"states\": {\n        \"operational\": \"正常\",\n        \"degraded\": \"性能下降\",\n        \"down\": \"不可用\",\n        \"unknown\": \"暂无有效样本\"\n      },\n      \"ttftHint\": \"首 Token 延迟（P50），来自最近采样窗口。\",\n      \"probeHint\": \"最近一次探测的响应延迟，并非首 Token 延迟。\",\n      \"throughputHint\": \"生成速度：成功输出的 Token 数 ÷ 响应耗时，反映单条回复的生成快慢，不随并发量放大。\",\n      \"throughputMissing\": \"该监控暂无输出 Token 或响应耗时样本。\",\n      \"availabilityHint\": \"近 {range} 可用率 {value}\",\n      \"updated\": \"最近采样：{time}\",\n      \"loginHint\": \"登录后查看用户专属报价与专属分组的状态。公开分组的状态无需登录。\",\n      \"monitorUnavailable\": \"监控数据暂不可用，已隐藏旧状态；页面会自动重试。\",\n      \"retry\": \"重新加载\"\n    },\n"
      }
    ]
  },
  {
    "path": "frontend/src/i18n/locales/en/dashboard.ts",
    "edits": [
      {
        "before": "  modelPlaza: {\n",
        "after": "  modelPlaza: {\n    market: {\n      \"total\": \"Currently enabled on this site: {count} models\",\n      \"subtitle\": \"Explore AI models. Compare prices and live status to find the right fit for your work.\",\n      \"search\": \"Search models, providers, endpoints or tags…\",\n      \"filters\": \"Filters\",\n      \"filterHint\": \"Refine models by provider, group, pricing and tags.\",\n      \"reset\": \"Reset\",\n      \"expand\": \"Expand\",\n      \"collapse\": \"Collapse\",\n      \"facets\": {\n        \"group\": \"Groups\",\n        \"vendor\": \"Providers\",\n        \"tag\": \"Model tags\",\n        \"billing\": \"Pricing type\",\n        \"endpoint\": \"Endpoint type\"\n      },\n      \"all\": {\n        \"group\": \"All groups\",\n        \"vendor\": \"All providers\",\n        \"tag\": \"All tags\",\n        \"billing\": \"All models\",\n        \"endpoint\": \"All types\"\n      },\n      \"billing\": {\n        \"token\": \"Token-based\",\n        \"per_request\": \"Per request\",\n        \"image\": \"Per image\",\n        \"video\": \"Video pricing\"\n      },\n      \"unknownVendor\": \"Unspecified provider\",\n      \"noDescription\": \"No description yet.\",\n      \"models\": \"models\",\n      \"group\": \"Group\",\n      \"endpoint\": \"Endpoint\",\n      \"copy\": \"Copy model name {model}\",\n      \"priceDisplay\": \"Price basis\",\n      \"unit\": \"Token price unit\",\n      \"prices\": {\n        \"standard\": \"Base\",\n        \"effective\": \"Effective\"\n      },\n      \"priceHint\": {\n        \"standard\": \"Base channel prices in USD, before group or personal multipliers.\",\n        \"effective\": \"Effective prices in USD during standard hours. See details for tiers, cache and time-based rules.\"\n      },\n      \"offerHint\": \"Same-name models in different groups are separate offers with independent prices and monitoring.\",\n      \"starting\": \"first tier\",\n      \"sortAscending\": \"Name ascending; switch to descending\",\n      \"sortDescending\": \"Name descending; switch to ascending\",\n      \"name\": \"Name\",\n      \"view\": \"Display mode\",\n      \"cards\": \"Card view\",\n      \"list\": \"List view\",\n      \"status\": \"Status\",\n      \"latency\": \"Latency\",\n      \"throughput\": \"Tokens/s\",\n      \"noSamples\": \"No data\",\n      \"states\": {\n        \"operational\": \"Operational\",\n        \"degraded\": \"Degraded\",\n        \"down\": \"Unavailable\",\n        \"unknown\": \"No qualifying samples\"\n      },\n      \"ttftHint\": \"Time to first token (P50) in the latest sampled window.\",\n      \"probeHint\": \"Latest probe response latency, not time to first token.\",\n      \"throughputHint\": \"Generation speed: successful output tokens divided by response time. It reflects how fast one reply is generated and does not grow with concurrency.\",\n      \"throughputMissing\": \"This monitor has no output-token or response-duration samples yet.\",\n      \"availabilityHint\": \"Availability over {range}: {value}\",\n      \"updated\": \"Latest sample: {time}\",\n      \"loginHint\": \"Sign in for personal prices and exclusive groups. Public group status needs no account.\",\n      \"monitorUnavailable\": \"Monitoring is temporarily unavailable. Old status is hidden; this page will retry automatically.\",\n      \"retry\": \"Reload\"\n    },\n"
      }
    ]
  }
]) {
  const existing = adaptations.find(item => item.path === seam.path)
  if (!existing) { adaptations.push(seam); continue }
  for (const edit of seam.edits) {
    const containing = existing.edits.find(previous => previous.after.includes(edit.before))
    if (containing) containing.after = containing.after.replace(edit.before, edit.after)
    else existing.edits.push(edit)
  }
}

contracts.push(...[
  {
    "path": "frontend/src/themes/mito/plazaMonitor.ts",
    "anchors": [
      "export interface PlazaMonitoring",
      "monitorLatency",
      "monitorNumber"
    ]
  },
  {
    "path": "frontend/src/themes/mito/ModelMonitorStrip.vue",
    "anchors": [
      "monitor.cells",
      "aria-label=\"summary\"",
      "throughputMissing"
    ]
  },
  {
    "path": "frontend/src/themes/mito/usePlazaData.ts",
    "anchors": [
      "AbortController",
      "60_000",
      "onBeforeUnmount",
      "watch(authenticated"
    ]
  },
  {
    "path": "frontend/src/themes/mito/README.md",
    "anchors": [
      "New API",
      "未配置",
      "/monitor"
    ]
  }
])

contracts.push({
  path: 'frontend/src/themes/mito/__tests__/usePlazaData.spec.ts',
  anchors: ['usePlazaData request lifecycle', 'never restores a stale response']
})
