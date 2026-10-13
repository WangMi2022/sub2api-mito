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
      {"before":"{ path: '/usage', label: t('nav.usage'), icon: ChartIcon, hideInSimpleMode: !authStore.isObserver },","after":"{ path: '/usage', label: isMitoTheme && !authStore.isObserver ? t('usage.logsTitle') : t('nav.usage'), icon: ChartIcon, hideInSimpleMode: !authStore.isObserver },\n    ...(isMitoTheme && !authStore.isObserver ? [{ path: '/usage-stats', label: t('usage.statsTitle'), icon: ChartIcon, hideInSimpleMode: true }] : []),"},
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
      {"before":"<div v-else class=\"flex items-center gap-1.5\">","after":"<div v-else class=\"mito-usage-tokens flex items-center gap-1.5\">"},
      {"before":"<span class=\"font-medium text-gray-900 dark:text-white\">{{ row.input_tokens?.toLocaleString() || 0 }}</span>","after":"<span class=\"mito-usage-token-value font-medium text-gray-900 dark:text-white\">{{ row.input_tokens?.toLocaleString() || 0 }}</span>"},
      {"before":"<span class=\"font-medium text-gray-900 dark:text-white\">{{ row.output_tokens?.toLocaleString() || 0 }}</span>","after":"<span class=\"mito-usage-token-value font-medium text-gray-900 dark:text-white\">{{ row.output_tokens?.toLocaleString() || 0 }}</span>"},
      {"before":"<span class=\"font-medium text-sky-600 dark:text-sky-400\">{{ formatCacheTokens(row.cache_read_tokens) }}</span>","after":"<span class=\"mito-usage-cache-read font-medium text-sky-600 dark:text-sky-400\">{{ formatCacheTokens(row.cache_read_tokens) }}</span>"},
      {"before":"<template #cell-cost=\"{ row }\">\n          <div class=\"text-sm\">","after":"<template #cell-cost=\"{ row }\">\n          <div class=\"mito-usage-cost text-sm\">"},
      {"before":"<span class=\"font-medium text-green-600 dark:text-green-400\">${{ row.actual_cost","after":"<span class=\"mito-usage-actual-cost font-medium text-green-600 dark:text-green-400\">${{ row.actual_cost"},
      {"before":"v-if=\"showAccountBilling && row.account_rate_multiplier != null\" class=\"mt-0.5","after":"v-if=\"showAccountBilling && row.account_rate_multiplier != null\" class=\"mito-usage-account-cost mt-0.5"},
      {"before":"class=\"flex items-stretch gap-2 text-left\"","after":"class=\"mito-usage-latency flex items-stretch gap-2 text-left\""},
      {"before":"<span class=\"text-sm text-gray-600 dark:text-gray-400\">{{ formatDateTime(value) }}</span>","after":"<span class=\"mito-usage-time text-sm text-gray-600 dark:text-gray-400\">{{ formatDateTime(value) }}</span>"},
      {"before":"<div v-if=\"row.ip_address\">","after":"<div v-if=\"row.ip_address\" class=\"mito-usage-ip\">"},
      {"before":"        <template #empty><EmptyState :message=\"t('usage.noRecords')\" /></template>","after":"        <template #empty><EmptyState :message=\"t('usage.noRecords')\" /></template>\n        <template v-for=\"(_, name) in $slots\" #[name]=\"slotProps\">\n          <slot\n            :name=\"name\"\n            v-bind=\"slotProps\"\n            :show-cost-details=\"showTooltip\"\n            :hide-cost-details=\"hideTooltip\"\n            :show-token-details=\"showTokenTooltip\"\n            :hide-token-details=\"hideTokenTooltip\"\n          />\n        </template>"},
      {"before":"const showTooltip = (event: MouseEvent,","after":"const showTooltip = (event: MouseEvent | FocusEvent,"},
      {"before":"const showTokenTooltip = (event: MouseEvent,","after":"const showTokenTooltip = (event: MouseEvent | FocusEvent,"},
      {"before":"import { computed, ref, inject } from 'vue'","after":"import { computed, ref, inject, nextTick } from 'vue'"},
      {"before":"      v-if=\"tooltipVisible\"","after":"      v-if=\"tooltipVisible\"\n      ref=\"costTooltipElement\"\n      :class=\"{ 'mito-request-tooltip': variant === 'request-log' }\"\n      role=\"tooltip\""},
      {"before":"      v-if=\"tokenTooltipVisible\"","after":"      v-if=\"tokenTooltipVisible\"\n      ref=\"tokenTooltipElement\"\n      :class=\"{ 'mito-request-tooltip': variant === 'request-log' }\"\n      role=\"tooltip\""},
      {"before":"// Cost tooltip functions","after":"// Request-list columns can sit at the viewport edge. Measure after rendering\n// to keep both pointer and keyboard details visible without guessing their size.\nconst costTooltipElement = ref<HTMLElement | null>(null)\nconst tokenTooltipElement = ref<HTMLElement | null>(null)\nconst constrainRequestTooltip = (element: () => HTMLElement | null, position: { x: number; y: number }) => {\n  if (props.variant !== 'request-log') return\n  void nextTick(() => {\n    const bounds = element()?.getBoundingClientRect()\n    if (!bounds) return\n    position.x = Math.max(8, Math.min(position.x, window.innerWidth - bounds.width - 8))\n    position.y = Math.max(bounds.height / 2 + 8, Math.min(position.y, window.innerHeight - bounds.height / 2 - 8))\n  })\n}\n\n// Cost tooltip functions"},
      {"before":"  tooltipVisible.value = true","after":"  tooltipVisible.value = true\n  constrainRequestTooltip(() => costTooltipElement.value, tooltipPosition.value)"},
      {"before":"  tokenTooltipVisible.value = true","after":"  tokenTooltipVisible.value = true\n  constrainRequestTooltip(() => tokenTooltipElement.value, tokenTooltipPosition.value)"},
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
      {
        "before": "  usage: {\n    title: 'Usage Records',",
        "after": "  usage: {\n    logsTitle: 'Request Logs',\n    statsTitle: 'Usage Stats',\n    statsDescription: 'Usage, costs and distributions for the selected period',\n    title: 'Usage Records',"
      }
    ]
  },
  {
    "path": "frontend/src/i18n/locales/zh/dashboard.ts",
    "edits": [
      {
        "before": "  usage: {\n    title: '使用记录',",
        "after": "  usage: {\n    logsTitle: '请求日志',\n    statsTitle: '使用量统计',\n    statsDescription: '查看所选时间内的用量、费用和分布',\n    title: '使用记录',"
      }
    ]
  },
  {
    path: "frontend/src/components/modelPlaza/ModelPlazaContent.vue",
    edits: [
      {
        before: "<div class=\"space-y-5\">",
        after: "<div class=\"mito-model-plaza space-y-5\">"
      },
      {
        before: "<h1 class=\"text-2xl",
        after: "<h1 class=\"mito-plaza-title text-2xl"
      },
      {
        before: "class=\"plaza-description rounded-2xl",
        after: "class=\"mito-plaza-description plaza-description rounded-2xl"
      },
      {
        before: "<div v-if=\"filteredGroups.length > 0\" class=\"space-y-5\">",
        after: "<div v-if=\"filteredGroups.length > 0\" class=\"mito-plaza-groups space-y-5\">"
      },
      {
        before: "class=\"rounded-2xl border border-dashed border-gray-300",
        after: "class=\"mito-plaza-empty rounded-2xl border border-dashed border-gray-300"
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
      {"before":"{ key: 'user', label: t('admin.usage.user'), sortable: false }","after":"{ key: 'user', label: t('admin.usage.user'), sortable: false, class: 'mito-admin-usage-col-user' }"},
      {"before":"{ key: 'api_key', label: t('usage.apiKeyFilter'), sortable: false }","after":"{ key: 'api_key', label: t('usage.apiKeyFilter'), sortable: false, class: 'mito-admin-usage-col-key' }"},
      {"before":"{ key: 'account', label: t('admin.usage.account'), sortable: false }","after":"{ key: 'account', label: t('admin.usage.account'), sortable: false, class: 'mito-admin-usage-col-account' }"},
      {"before":"{ key: 'model', label: t('usage.model'), sortable: true }","after":"{ key: 'model', label: t('usage.model'), sortable: true, class: 'mito-admin-usage-col-model' }"},
      {"before":"{ key: 'reasoning_effort', label: t('usage.reasoningEffort'), sortable: false }","after":"{ key: 'reasoning_effort', label: t('usage.reasoningEffort'), sortable: false, class: 'mito-admin-usage-col-reasoning' }"},
      {"before":"{ key: 'endpoint', label: t('usage.endpoint'), sortable: false }","after":"{ key: 'endpoint', label: t('usage.endpoint'), sortable: false, class: 'mito-admin-usage-col-endpoint' }"},
      {"before":"{ key: 'group', label: t('admin.usage.group'), sortable: false }","after":"{ key: 'group', label: t('admin.usage.group'), sortable: false, class: 'mito-admin-usage-col-group' }"},
      {"before":"{ key: 'tokens', label: t('usage.tokens'), sortable: false }","after":"{ key: 'tokens', label: t('usage.tokens'), sortable: false, class: 'mito-admin-usage-col-tokens' }"},
      {"before":"{ key: 'cost', label: t('usage.cost'), sortable: false }","after":"{ key: 'cost', label: t('usage.cost'), sortable: false, class: 'mito-admin-usage-col-cost' }"},
      {"before":"{ key: 'latency', label: t('usage.latency'), sortable: false }","after":"{ key: 'latency', label: t('usage.latency'), sortable: false, class: 'mito-admin-usage-col-latency' }"},
      {"before":"{ key: 'created_at', label: t('usage.time'), sortable: true }","after":"{ key: 'created_at', label: t('usage.time'), sortable: true, class: 'mito-admin-usage-col-time' }"},
      {"before":"{ key: 'ip_address', label: t('admin.usage.ipAddress'), sortable: false }","after":"{ key: 'ip_address', label: t('admin.usage.ipAddress'), sortable: false, class: 'mito-admin-usage-col-ip' }"}
    ]
  },
  {
    path: 'frontend/src/components/admin/usage/UsageFilters.vue',
    edits: [
      {"before":"class=\"flex flex-wrap items-end justify-between gap-4\"","after":"class=\"mito-usage-filter-layout flex flex-wrap items-end justify-between gap-4\""},
      {"before":"class=\"flex flex-1 flex-wrap items-end gap-4\"","after":"class=\"mito-usage-filter-fields flex flex-1 flex-wrap items-end gap-4\""},
      {"before":"class=\"flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto\"","after":"class=\"mito-usage-filter-actions flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto\""}
    ]
  }
]

/** Fail explicitly if a future update breaks the props/utility contracts we use. */
export const contracts = [
  {"path":"frontend/src/themes/mito/admin-usage.css","anchors":["html[data-ui-theme='mito']",".mito-admin-usage-records",".mito-admin-usage-filters",".mito-usage-latency","prefers-reduced-motion"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './admin-usage.css'"]},
  {"path":"frontend/src/components/common/DataTable.vue","anchors":["column.class",":data-field=\"column.key\"","data-test=\"mobile-sort-controls\"","virtualPaddingTop"]},
  {"path":"frontend/src/components/admin/usage/UsageStatsCards.vue","anchors":["class=\"card p-4 flex items-center gap-3\"","class=\"text-xl font-bold","showAccountCost && totalAccountCost != null"]},
  {"path":"frontend/src/themes/mito/model-plaza.css","anchors":["html[data-ui-theme='mito']",".mito-plaza-filters",".mito-plaza-prices","@container mito-plaza","prefers-reduced-motion"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './model-plaza.css'"]},
  {"path":"frontend/src/components/common/GroupBadge.vue","anchors":["<span class=\"truncate\">{{ name }}</span>","alwaysShowRate?: boolean"]},
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
