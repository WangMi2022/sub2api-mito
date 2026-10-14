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
      { before: '<script setup lang="ts">', after: '<script setup lang="ts">\nimport { isMitoTheme } from \'@/themes/mito\'\nimport { useThemeSync } from \'@/themes/mito/useThemeSync\'' },
      {"before":"                :title=\"sidebarCollapsed ? item.label : undefined\"\n                @click=\"handleGroupClick(item)\"","after":"                :title=\"sidebarCollapsed ? item.label : undefined\"\n                :aria-label=\"item.label\"\n                :aria-expanded=\"!sidebarCollapsed && isGroupExpanded(item)\"\n                @click=\"handleGroupClick(item)\""},
      {"before":"      <button\n        @click=\"toggleTheme\"","after":"      <button\n        type=\"button\"\n        :aria-label=\"isDark ? t('nav.lightMode') : t('nav.darkMode')\"\n        @click=\"toggleTheme\""},
      {"before":"      <button\n        @click=\"toggleSidebar\"","after":"      <button\n        type=\"button\"\n        :aria-label=\"sidebarCollapsed ? t('nav.expand') : t('nav.collapse')\"\n        :aria-expanded=\"!sidebarCollapsed\"\n        @click=\"toggleSidebar\""}
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
        after: "    <div :class=\"[isFullscreen ? 'p-4 md:p-6' : '', 'space-y-6 pb-12', { 'mito-ops-dashboard': isMitoTheme }]\">\n      <OpsParticles v-if=\"isMitoTheme\" />"
      },
      {
        before: "import AppLayout from '@/components/layout/AppLayout.vue'",
        after: "import AppLayout from '@/components/layout/AppLayout.vue'\nimport OpsParticles from '@/themes/mito/OpsParticles.vue'\nimport { isMitoTheme } from '@/themes/mito'"
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
      { before: "  flat: false\n", after: "  flat: false,\n  variant: 'default',\n  resizableColumns: false\n" },
      {"before":"  variant?: 'default' | 'request-log'\n}","after":"  variant?: 'default' | 'request-log'\n  /** Allow dragging header borders to size columns (Mito usage table). */\n  resizableColumns?: boolean\n  /** Persist column widths separately from the column visibility preference. */\n  columnWidthStorageKey?: string\n}"},
      {"before":"        :table-variant=\"variant\"","after":"        :table-variant=\"variant\"\n        :resizable-columns=\"resizableColumns\"\n        :column-width-storage-key=\"columnWidthStorageKey\""}
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
  {"path":"frontend/src/themes/mito/dashboard.css","anchors":["html[data-ui-theme='mito']",".mito-admin-dashboard","mito-dash-card-in","mito-dash-sweep","prefers-reduced-motion"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './dashboard.css'"]},
  {"path":"frontend/src/themes/mito/index.ts","anchors":["import './ops-monitor.css'"]},
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
  { path: 'frontend/src/themes/mito/channel-status.css', anchors: ["html[data-ui-theme='mito']", 'monitor-v3-category', 'monitor-v3-featured-availability', 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/available-channels.css', anchors: ["html[data-ui-theme='mito']", "[data-testid='desktop-channels']", "[data-testid='mobile-channels']", 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ["import './available-channels.css'"] },
  { path: 'frontend/src/themes/mito/DashboardStats.vue', anchors: ['stats: UserDashboardStats'] },
  { path: 'frontend/src/themes/mito/DashboardCharts.vue', anchors: ['trend: TrendDataPoint[]', 'models: ModelStat[]'] },
  { path: 'frontend/src/themes/mito/useChartTooltip.ts', anchors: ['export function useChartTooltip'] },
  {"path":"frontend/src/themes/mito/ops-monitor.css","anchors":["html[data-ui-theme='mito']",".mito-ops-dashboard",".mito-ops-particles","mito-ops-card-in","mito-ops-sweep","prefers-reduced-motion"]},
  {"path":"frontend/src/themes/mito/OpsParticles.vue","anchors":["mito-ops-particles-canvas","prefers-reduced-motion","requestAnimationFrame"]},
  { path: 'frontend/src/themes/mito/assets/outfit-latin.ttf', binary: true },
  { path: 'frontend/src/themes/mito/PelicanShowcaseGroup.vue', anchors: ['mito-pelican-group', 'mito-pelican-group-header', 'mito-pelican-group-chevron', 'aria-expanded', 'data-testid="pelican-showcase-body"'] },
  { path: 'frontend/src/themes/mito/pelican-showcase.css', anchors: ["html[data-ui-theme='mito']", '.mito-pelican-group-header', '.mito-pelican-group-chevron', '.mito-pelican-grid', 'prefers-reduced-motion'] },
  { path: 'frontend/src/themes/mito/index.ts', anchors: ["import './pelican-showcase.css'"] },
  { path: 'frontend/src/themes/mito/labels.ts', anchors: ['pelicanPageSummary', 'pelicanPageSize', 'goToPage', 'pelicanExpandGroup', 'pelicanCollapseGroup'] },
  { path: 'frontend/src/components/user/pelican/PelicanShowcaseCard.vue', anchors: ['data-testid="pelican-showcase-card"', "emit('visible')", 'scrollMargin'] },
  { path: 'frontend/src/views/user/PelicanShowcaseView.vue', anchors: ['MitoPelicanShowcaseGroup', 'expandedGroups', 'toggleGroup', 'PelicanShowcaseRow', 'bodies[item.id]'] },
  { path: 'frontend/src/themes/mito/assets/noto-sans-sc-ui.woff2', binary: true }
]
