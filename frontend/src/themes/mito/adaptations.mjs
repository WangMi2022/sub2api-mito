/** Small, reversible seams. Update these anchors when upstream changes a layout. */
export const adaptations = [
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
      { before: 'class="relative min-h-screen transition-all duration-300"', after: 'class="mito-main-frame relative min-h-screen transition-all duration-300"' },
      { before: ":class=\"[sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64']\"", after: ":class=\"[sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64', { 'mito-main-frame--collapsed': sidebarCollapsed }]\"" },
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
    edits: [
      { before: "const isDark = ref(document.documentElement.classList.contains('dark'))", after: "const isDark = ref(document.documentElement.classList.contains('dark'))\nif (isMitoTheme) useThemeSync(isDark) // mito-theme: shared preference" },
      { before: '<script setup lang="ts">', after: '<script setup lang="ts">\nimport { isMitoTheme } from \'@/themes/mito\'\nimport { useThemeSync } from \'@/themes/mito/useThemeSync\'' }
    ]
  },
  {
    path: 'frontend/src/components/common/DataTable.vue',
    edits: [
      { before: "<div v-if=\"!isDesktopViewport\" class=\"space-y-3\">", after: "<div\n    v-if=\"!isDesktopViewport\"\n    class=\"mito-mobile-table space-y-3\"\n    :class=\"{ 'mito-request-log-mobile': tableVariant === 'request-log' }\"\n  >" },
      { before: "'border-primary-300 bg-primary-50/40 dark:border-primary-700 dark:bg-primary-900/10': selectable", after: "'mito-row-selected border-primary-300 bg-primary-50/40 dark:border-primary-700 dark:bg-primary-900/10': selectable" },
      { before: "'bg-primary-50/40 dark:bg-primary-900/10': selectable", after: "'mito-row-selected bg-primary-50/40 dark:bg-primary-900/10': selectable" },
      { before: "      'is-scrollable': isScrollable\n", after: "      'is-scrollable': isScrollable,\n      'mito-request-log-wrapper': tableVariant === 'request-log'\n" },
      { before: "    <table class=\"w-full min-w-max divide-y divide-gray-200 dark:divide-dark-700\">", after: "    <div v-if=\"tableVariant === 'request-log' && loading\" class=\"mito-request-log-progress\" aria-hidden=\"true\"></div>\n    <table\n      class=\"w-full min-w-max divide-y divide-gray-200 dark:divide-dark-700\"\n      :class=\"{ 'mito-request-log-table': tableVariant === 'request-log' }\"\n    >" },
      { before: "      <tbody class=\"table-body divide-y divide-gray-200 bg-white dark:divide-dark-700 dark:bg-dark-900\">", after: "      <tbody\n        class=\"table-body divide-y divide-gray-200 bg-white dark:divide-dark-700 dark:bg-dark-900\"\n        :class=\"{ 'mito-request-log-loading': tableVariant === 'request-log' && loading }\"\n      >" },
      { before: "  selectable?: boolean\n", after: "  selectable?: boolean\n  /** Optional visual variant; default preserves the shared table style. */\n  tableVariant?: 'default' | 'request-log'\n" },
      { before: "  selectedKeys: () => []\n", after: "  selectedKeys: () => [],\n  tableVariant: 'default'\n" }
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
      { before: "  <div :class=\"flat ? '' : 'card overflow-hidden'\">", after: "  <div\n    :class=\"[\n      flat ? '' : 'card overflow-hidden',\n      variant === 'request-log' && 'mito-request-log-records'\n    ]\"\n  >" },
      { before: "    <div class=\"overflow-auto\">", after: "    <div class=\"overflow-auto\" :class=\"{ 'mito-request-log-scroll': variant === 'request-log' }\">" },
      { before: "        :default-sort-order=\"defaultSortOrder\"", after: "        :default-sort-order=\"defaultSortOrder\"\n        :table-variant=\"variant\"" },
      { before: "  flat?: boolean\n", after: "  flat?: boolean\n  /** 主题表格变体；默认保持上游表格行为 */\n  variant?: 'default' | 'request-log'\n" },
      { before: "  flat: false\n", after: "  flat: false,\n  variant: 'default'\n" }
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
      { before: "      <template v-if=\"activeTab === 'usage'\">\n        <UsageTable\n          :data=\"usageLogs\"\n          :loading=\"loading\"\n          :columns=\"visibleColumns\"\n          :server-side-sort=\"true\"\n          :show-account-billing=\"false\"\n          :show-upstream-endpoint=\"false\"\n          default-sort-key=\"created_at\"\n          default-sort-order=\"desc\"\n          @sort=\"handleSort\"\n          @ipGeoBatchFailed=\"handleIpGeoBatchFailed\"\n        />\n\n        <Pagination\n          v-if=\"pagination.total > 0\"\n          :page=\"pagination.page\"\n          :total=\"pagination.total\"\n          :page-size=\"pagination.page_size\"\n          @update:page=\"handlePageChange\"\n          @update:pageSize=\"handlePageSizeChange\"\n        />\n      </template>\n", after: "      <template v-if=\"activeTab === 'usage'\">\n        <div class=\"mito-request-log-section space-y-6\">\n          <UsageTable\n            variant=\"request-log\"\n            :data=\"usageLogs\"\n            :loading=\"loading\"\n            :columns=\"visibleColumns\"\n            :server-side-sort=\"true\"\n            :show-account-billing=\"false\"\n            :show-upstream-endpoint=\"false\"\n            default-sort-key=\"created_at\"\n            default-sort-order=\"desc\"\n            @sort=\"handleSort\"\n            @ipGeoBatchFailed=\"handleIpGeoBatchFailed\"\n          />\n\n          <Pagination\n            v-if=\"pagination.total > 0\"\n            variant=\"request-log\"\n            :page=\"pagination.page\"\n            :total=\"pagination.total\"\n            :page-size=\"pagination.page_size\"\n            @update:page=\"handlePageChange\"\n            @update:pageSize=\"handlePageSizeChange\"\n          />\n        </div>\n      </template>\n" }
    ]
  }
]

/** Fail explicitly if a future update breaks the props/utility contracts we use. */
export const contracts = [
  { path: 'frontend/src/api/usage.ts', anchors: ['interface UserDashboardStats', 'today_actual_cost:', 'today_cache_read_tokens:', 'average_duration_ms:'] },
  { path: 'frontend/src/components/common/DataTable.vue', anchors: ['virtualPaddingTop', ':colspan="tableColumnCount"', 'class="table-wrapper"'] },
  { path: 'frontend/src/components/common/Pagination.vue', anchors: ['page-size-select', ':aria-current=', 'sm:justify-between'] },
  { path: 'frontend/src/router/title.ts', anchors: ['export function resolveRouteMetaKeys('] },
  { path: 'frontend/src/components/common/BaseDialog.vue', anchors: ['<Transition name="modal">', "'drawer-content': placement === 'right'"] },
  { path: 'frontend/src/components/common/Select.vue', anchors: ['<Transition name="select-dropdown">', 'select-dropdown-portal'] },
  { path: 'frontend/src/components/common/NavigationProgress.vue', anchors: ['name="progress-fade"', 'navigation-progress-bar'] },
  { path: 'frontend/src/style.css', anchors: ['.card {', '.input {', '.btn-primary {', '.sidebar-link-active {'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ['export const isMitoTheme'] },
  { path: 'frontend/src/themes/mito/theme.css', anchors: ["html[data-ui-theme='mito']", '--mito-primary-600:', '.mito-request-log-table', '.mito-request-log-pagination', '@keyframes mito-request-log-progress'] },
  { path: 'frontend/src/themes/mito/DashboardStats.vue', anchors: ['stats: UserDashboardStats'] },
  { path: 'frontend/src/themes/mito/DashboardCharts.vue', anchors: ['trend: TrendDataPoint[]', 'models: ModelStat[]'] },
  { path: 'frontend/src/themes/mito/useChartTooltip.ts', anchors: ['export function useChartTooltip'] },
  { path: 'frontend/src/themes/mito/assets/outfit-latin.ttf', binary: true },
  { path: 'frontend/src/themes/mito/assets/noto-sans-sc-ui.woff2', binary: true }
]
