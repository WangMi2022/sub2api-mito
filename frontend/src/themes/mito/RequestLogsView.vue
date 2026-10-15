<template>
  <AppLayout>
    <div class="mito-request-page">
      <UsageFilters :state="usageFilters" :selected-count="activeFilterCount" @change="onFilterChange">
        <template v-if="activeTab === 'errors'" #default>
          <div>
            <label class="input-label">{{ t('usage.errors.keyName') }}</label>
            <Select v-model="errorFilter.api_key_id" :aria-label="t('usage.errors.keyName')" :options="errorKeyOptions" @change="applyErrorFilters" />
          </div>
          <div>
            <label class="input-label">{{ t('usage.errors.model') }}</label>
            <Select v-model="errorFilter.model" :aria-label="t('usage.errors.model')" :options="errorModelOptions" searchable creatable clearable @change="applyErrorFilters" />
          </div>
          <div>
            <label class="input-label">{{ t('usage.errors.category') }}</label>
            <Select v-model="errorFilter.category" :aria-label="t('usage.errors.category')" :options="errorCategoryOptions" @change="applyErrorFilters" />
          </div>
          <div>
            <label class="input-label">{{ t('usage.errors.status') }}</label>
            <Select v-model="errorFilter.status_code" :aria-label="t('usage.errors.status')" :options="errorStatusOptions" @change="applyErrorFilters" />
          </div>
        </template>
      </UsageFilters>

      <section class="mito-log-panel" :aria-label="label('requestRecords')">
        <header class="mito-log-panel-header">
          <div>
            <h2>{{ activeTab === 'errors' ? t('usage.tabs.errors') : label('requestRecords') }}</h2>
            <p aria-live="polite">{{ recordSummary }}</p>
          </div>
          <div class="mito-log-actions">
            <button v-if="activeTab === 'usage'" type="button" class="mito-log-button" :disabled="exporting" @click="exportToCSV">
              <Icon name="download" size="sm" aria-hidden="true" />{{ exporting ? t('usage.exporting') : t('usage.exportCsv') }}
            </button>
            <button type="button" class="mito-log-button" @click="resetFilters">{{ t('common.reset') }}</button>
            <button type="button" class="mito-log-button mito-log-button-primary" :disabled="activeTab === 'errors' ? errorLoading : loading" @click="refreshData">
              <Icon name="refresh" size="sm" aria-hidden="true" :class="{ 'mito-is-refreshing': activeTab === 'errors' ? errorLoading : loading }" />{{ t('common.refresh') }}
            </button>
            <div ref="columnDropdownRef" class="relative" @keydown.esc="showColumnDropdown = false">
              <button
                type="button"
                class="mito-log-button mito-log-column-button"
                data-testid="usage-column-settings"
                :aria-label="t('admin.users.columnSettings')"
                :title="t('admin.users.columnSettings')"
                :aria-expanded="showColumnDropdown"
                @click="showColumnDropdown = !showColumnDropdown"
              ><Icon name="grid" size="sm" aria-hidden="true" /></button>
              <div v-if="showColumnDropdown" class="mito-log-column-menu">
                <label v-for="col in currentToggleableColumns" :key="col.key">
                  <input type="checkbox" :checked="isCurrentColumnVisible(col.key)" :data-testid="'usage-column-toggle-' + col.key" @change="toggleCurrentColumn(col.key)">
                  <span>{{ col.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </header>

        <div v-if="errorViewEnabled" class="mito-log-tabs" role="group" :aria-label="label('requestRecords')">
          <button type="button" :aria-pressed="activeTab === 'usage'" @click="switchToUsage">{{ t('usage.tabs.usage') }}</button>
          <button type="button" :aria-pressed="activeTab === 'errors'" @click="switchToErrors">{{ t('usage.tabs.errors') }}</button>
        </div>

        <template v-if="activeTab === 'usage'">
          <RequestLogTable
            :data="usageLogs"
            :columns="visibleColumns"
            :cache-rate-audience="cacheRateAudience"
            :loading="loading"
            @sort="handleSort"
            @ip-geo-batch-failed="handleIpGeoBatchFailed"
          />
          <RequestLogPagination
            :page="pagination.page"
            :total="pagination.total"
            :page-size="pagination.page_size"
            :disabled="loading"
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </template>
        <UserErrorRequestsTable
          v-else-if="errorViewEnabled"
          :rows="errorRows"
          :total="errorTotal"
          :loading="errorLoading"
          :page="errorPage"
          :page-size="errorPageSize"
          :visible-column-keys="errVisibleColumnKeys"
          @sort="onErrorSort"
          @update:page="onErrorPage"
          @update:page-size="onErrorPageSize"
          @ip-geo-batch-failed="handleIpGeoBatchFailed"
        />
      </section>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { usageAPI } from '@/api'
import AppLayout from '@/components/layout/AppLayout.vue'
import Select, { type SelectOption } from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'
import UserErrorRequestsTable from '@/components/user/UserErrorRequestsTable.vue'
import { getPersistedPageSize } from '@/composables/usePersistedPageSize'
import { formatReasoningEffort } from '@/utils/format'
import { getBillingModeLabel, getDisplayBillingMode as resolveDisplayBillingMode } from '@/utils/billingMode'
import { resolveUsageRequestType } from '@/utils/usageRequestType'
import { COMMON_ERROR_STATUS_CODES } from '@/utils/errorBadges'
import type { UsageLog, UsageQueryParams, UserErrorRequest } from '@/types'
import type { Column } from '@/components/common/types'
import UsageFilters from './UsageFilters.vue'
import RequestLogTable from './RequestLogTable.vue'
import RequestLogPagination from './RequestLogPagination.vue'
import { useUsageFilters } from './useUsageFilters'
import { useRequestLogColumns } from './requestLogColumns'
import { showUsageCacheRate } from '@/utils/usageCacheRate'
import { useMitoLabels } from './labels'

const { t } = useI18n()
const label = useMitoLabels()
const appStore = useAppStore()
const usageFilters = useUsageFilters()
const { startDate, endDate, apiKeys, normalizedFilters, rememberModels, validRange } = usageFilters
const usageLogs = ref<UsageLog[]>([])
const loading = ref(false)
let abortController: AbortController | null = null
let errorRequestSeq = 0
let disposed = false
const exporting = ref(false)
const errorRows = ref<UserErrorRequest[]>([])
const errorLoading = ref(false)
const errorPage = ref(1)
const errorPageSize = ref(20)
const errorSortBy = ref('created_at')
const errorSortOrder = ref<'asc' | 'desc'>('desc')
const errorTotal = ref(0)
const errorFilter = ref<{ model: string | null; category: string; api_key_id: number | null; status_code: number | null }>({
  model: '',
  category: '',
  api_key_id: null,
  status_code: null,
})

const errorKeyOptions = computed<SelectOption[]>(() => [
  { value: null, label: t('usage.errors.allKeys') },
  ...apiKeys.value.map((k) => ({ value: k.id, label: k.name })),
])

// 模型候选取自当前已加载错误中出现过的模型；creatable 允许输入任意片段做后端模糊。
const errorModelOptions = computed<SelectOption[]>(() => {
  const seen = new Set<string>()
  const opts: SelectOption[] = []
  for (const r of errorRows.value) {
    if (r.model && !seen.has(r.model)) {
      seen.add(r.model)
      opts.push({ value: r.model, label: r.model })
    }
  }
  return opts
})

const errorCategoryCodes = ['auth', 'rate_limit', 'quota', 'invalid_request', 'service_unavailable', 'upstream', 'internal', 'cyber']

const errorCategoryOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('usage.errors.allCategories') },
  ...errorCategoryCodes.map((c) => ({ value: c, label: t('usage.errors.categories.' + c) })),
])

// 状态码候选用固定常用列表(与管理端 UsageFilters 共用常量),不受当前页数据限制:
// 后端 status_code 过滤对全量生效,若只列当前页出现过的码,用户就选不到仅在后续页的码。
const errorStatusOptions = computed<SelectOption[]>(() => [
  { value: null, label: t('usage.errors.allStatuses') },
  ...COMMON_ERROR_STATUS_CODES.map((c) => ({ value: c, label: String(c) })),
])

const applyErrorFilters = () => {
  if (!validRange.value) return
  errorPage.value = 1
  void loadErrors()
}

const activeTab = ref<'usage' | 'errors'>('usage')
const errorViewEnabled = computed(() => appStore.cachedPublicSettings?.allow_user_view_error_requests ?? false)

const pagination = reactive({
  page: 1,
  page_size: getPersistedPageSize(),
  total: 0,
})
const sortState = reactive({
  sort_by: 'created_at',
  sort_order: 'desc' as 'asc' | 'desc',
})

const buildUsageListParams = (page: number, pageSize: number): UsageQueryParams => ({
  page,
  page_size: pageSize,
  ...normalizedFilters.value,
  sort_by: sortState.sort_by,
  sort_order: sortState.sort_order,
})

const loadLogs = async () => {
  if (!validRange.value) return
  abortController?.abort()
  const controller = new AbortController()
  abortController = controller
  loading.value = true
  try {
    const res = await usageAPI.query(buildUsageListParams(pagination.page, pagination.page_size), {
      signal: controller.signal,
    })
    if (!controller.signal.aborted) {
      usageLogs.value = res.items
      pagination.total = res.total
      rememberModels(res.items)
    }
  } catch (error: any) {
    if (!controller.signal.aborted && error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
      appStore.showError(t('usage.failedToLoad'))
    }
  } finally {
    if (abortController === controller) loading.value = false
  }
}


const activeFilterCount = computed(() => activeTab.value === 'usage'
  ? usageFilters.selectedCount.value
  : Object.values(errorFilter.value).filter(value => value != null && value !== '').length)
const recordSummary = computed(() => {
  const total = activeTab.value === 'usage' ? pagination.total : errorTotal.value
  const page = activeTab.value === 'usage' ? pagination.page : errorPage.value
  const size = activeTab.value === 'usage' ? pagination.page_size : errorPageSize.value
  return label('recordSummary', { start: total ? (page - 1) * size + 1 : 0, end: Math.min(total, page * size), total })
})
const applyFilters = () => {
  if (!validRange.value) return
  pagination.page = 1
  void loadLogs()
}
const onFilterChange = () => {
  if (activeTab.value === 'errors') applyErrorFilters()
  else applyFilters()
}
const refreshData = () => {
  if (activeTab.value === 'errors') void loadErrors()
  else void loadLogs()
}
const resetFilters = () => {
  usageFilters.reset()
  errorFilter.value = { model: '', category: '', api_key_id: null, status_code: null }
  pagination.page = 1
  errorPage.value = 1
  refreshData()
}
const switchToUsage = () => {
  activeTab.value = 'usage'
  void loadLogs()
}
const handlePageChange = (page: number) => {
  pagination.page = page
  void loadLogs()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.page_size = pageSize
  pagination.page = 1
  void loadLogs()
}

const handleSort = (key: string, order: 'asc' | 'desc') => {
  sortState.sort_by = key
  sortState.sort_order = order
  pagination.page = 1
  void loadLogs()
}

const handleIpGeoBatchFailed = () => {
  appStore.showError(t('usage.ipGeo.batchFailed'))
}

const getRequestTypeExportText = (log: UsageLog): string => {
  const requestType = resolveUsageRequestType(log)
  if (requestType === 'cyber') return 'Cyber'
  if (requestType === 'live') return 'Live'
  if (requestType === 'ws_v2') return 'WS'
  if (requestType === 'stream') return 'Stream'
  if (requestType === 'sync') return 'Sync'
  return 'Unknown'
}

const getDisplayBillingMode = (
  row: Pick<UsageLog, 'billing_mode' | 'image_count'> | null | undefined
): string | null | undefined => resolveDisplayBillingMode(row)

const escapeCSVValue = (value: unknown): string => {
  if (value == null) return ''
  const str = String(value)
  const escaped = str.replace(/"/g, '""')
  if (str === '-') return str
  if (/^[=+\-@\t\r]/.test(str)) return `"\'${escaped}"`
  if (/[,"\n\r]/.test(str)) return `"${escaped}"`
  return str
}

const exportToCSV = async () => {
  if (!validRange.value || exporting.value) return
  if (pagination.total === 0) {
    appStore.showWarning(t('usage.noDataToExport'))
    return
  }
  exporting.value = true
  appStore.showInfo(t('usage.preparingExport'))
  try {
    const allLogs: UsageLog[] = []
    const pageSize = 100
    const exportParams = buildUsageListParams(1, pageSize)
    const totalPages = Math.ceil(pagination.total / pageSize)
    for (let page = 1; page <= totalPages; page++) {
      const response = await usageAPI.query({ ...exportParams, page })
      allLogs.push(...response.items)
    }
    if (allLogs.length === 0) {
      appStore.showWarning(t('usage.noDataToExport'))
      return
    }
    const headers = [
      'Time',
      'API Key Name',
      'Model',
      'Reasoning Effort',
      'Inbound Endpoint',
      'IP Address',
      'Type',
      'Billing Mode',
      'Input Tokens',
      'Output Tokens',
      'Cache Read Tokens',
      'Cache Creation Tokens',
      'Rate Multiplier',
      'Billed Cost',
      'Original Cost',
      'First Token (ms)',
      'Duration (ms)',
    ]
    const rows = allLogs.map((log) => [
      log.created_at,
      log.api_key?.name || '',
      log.model,
      formatReasoningEffort(log.reasoning_effort),
      log.inbound_endpoint || '',
      log.ip_address || '',
      getRequestTypeExportText(log),
      getBillingModeLabel(getDisplayBillingMode(log), t),
      log.input_tokens,
      log.output_tokens,
      log.cache_read_tokens,
      log.cache_creation_tokens,
      log.rate_multiplier,
      log.actual_cost.toFixed(8),
      log.total_cost.toFixed(8),
      log.first_token_ms ?? '',
      log.duration_ms ?? '',
    ].map(escapeCSVValue))
    const csvContent = [
      headers.map(escapeCSVValue).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `usage_${exportParams.start_date}_to_${exportParams.end_date}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    appStore.showSuccess(t('usage.exportSuccess'))
  } catch (error) {
    console.error('CSV Export failed:', error)
    appStore.showError(t('usage.exportFailed'))
  } finally {
    exporting.value = false
  }
}


const ALWAYS_VISIBLE = ['created_at']
const DEFAULT_HIDDEN_COLUMNS = ['endpoint', 'ip_address', 'user_agent', 'billing_mode']
// The split table has new column identities; do not overwrite upstream preferences.
const HIDDEN_COLUMNS_KEY = 'mito-request-log-hidden-columns'
const allColumns = useRequestLogColumns()
// Upstream v2.11.0 gates per-request cache rate behind usage_show_cache_rate_to_users
// (defaults to admin-only). The theme owns this column, so drop it at the source.
const cacheRateAudience = computed<'user' | 'admin'>(() => 'user')
const showCacheRate = computed(() =>
  showUsageCacheRate(appStore.cachedPublicSettings, cacheRateAudience.value)
)
const columnsForDisplay = computed(() =>
  showCacheRate.value ? allColumns.value : allColumns.value.filter((col) => col.key !== 'cache_hit_rate')
)

const hiddenColumns = reactive<Set<string>>(new Set())
const toggleableColumns = computed(() => columnsForDisplay.value.filter((col) => !ALWAYS_VISIBLE.includes(col.key)))
const visibleColumns = computed(() =>
  columnsForDisplay.value.filter((col) => ALWAYS_VISIBLE.includes(col.key) || !hiddenColumns.has(col.key))
)
const isColumnVisible = (key: string) => !hiddenColumns.has(key)
const toggleColumn = (key: string) => {
  if (hiddenColumns.has(key)) hiddenColumns.delete(key)
  else hiddenColumns.add(key)
  try { localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify([...hiddenColumns])) } catch { /* Storage is optional. */ }
}
const loadSavedColumns = () => {
  try {
    const saved = localStorage.getItem(HIDDEN_COLUMNS_KEY)
    const values = saved ? JSON.parse(saved) as string[] : DEFAULT_HIDDEN_COLUMNS
    values.forEach((key) => hiddenColumns.add(key))
  } catch {
    DEFAULT_HIDDEN_COLUMNS.forEach((key) => hiddenColumns.add(key))
  }
}

// 错误请求 tab 独立列设置(机制同用量列设置,存储互不影响)
const ERR_ALWAYS_VISIBLE = ['status', 'created_at']
const ERR_DEFAULT_HIDDEN_COLUMNS = ['user_agent']
const ERR_HIDDEN_COLUMNS_KEY = 'user-usage-error-hidden-columns'

// key 须与 UserErrorRequestsTable 的 allColumns 一致
const errAllColumns = computed<Column[]>(() => [
  { key: 'key_name', label: t('usage.errors.keyName') },
  { key: 'model', label: t('usage.errors.model') },
  { key: 'endpoint', label: t('usage.errors.endpoint') },
  { key: 'client_ip', label: 'IP' },
  { key: 'group', label: t('admin.usage.group') },
  { key: 'type', label: t('usage.type') },
  { key: 'platform', label: t('usage.errors.platform') },
  { key: 'category', label: t('usage.errors.category') },
  { key: 'status', label: t('usage.errors.status') },
  { key: 'message', label: t('usage.errors.message') },
  { key: 'created_at', label: t('usage.errors.time') },
  { key: 'user_agent', label: t('usage.userAgent') },
])

const errHiddenColumns = reactive<Set<string>>(new Set())
const errToggleableColumns = computed(() =>
  errAllColumns.value.filter((col) => !ERR_ALWAYS_VISIBLE.includes(col.key))
)
const errVisibleColumnKeys = computed(() =>
  errAllColumns.value
    .filter((col) => ERR_ALWAYS_VISIBLE.includes(col.key) || !errHiddenColumns.has(col.key))
    .map((col) => col.key)
)
const isErrColumnVisible = (key: string) => !errHiddenColumns.has(key)
const toggleErrColumn = (key: string) => {
  if (errHiddenColumns.has(key)) errHiddenColumns.delete(key)
  else errHiddenColumns.add(key)
  try { localStorage.setItem(ERR_HIDDEN_COLUMNS_KEY, JSON.stringify([...errHiddenColumns])) } catch { /* Storage is optional. */ }
}
const loadSavedErrColumns = () => {
  try {
    const saved = localStorage.getItem(ERR_HIDDEN_COLUMNS_KEY)
    const values = saved ? (JSON.parse(saved) as string[]) : ERR_DEFAULT_HIDDEN_COLUMNS
    values.forEach((key) => errHiddenColumns.add(key))
  } catch {
    ERR_DEFAULT_HIDDEN_COLUMNS.forEach((key) => errHiddenColumns.add(key))
  }
}

// 列设置下拉按当前 tab 分发
const currentToggleableColumns = computed(() =>
  activeTab.value === 'errors' ? errToggleableColumns.value : toggleableColumns.value
)
const isCurrentColumnVisible = (key: string) =>
  activeTab.value === 'errors' ? isErrColumnVisible(key) : isColumnVisible(key)
const toggleCurrentColumn = (key: string) => {
  if (activeTab.value === 'errors') toggleErrColumn(key)
  else toggleColumn(key)
}

const showColumnDropdown = ref(false)
const columnDropdownRef = ref<HTMLElement | null>(null)
const handleColumnClickOutside = (event: MouseEvent) => {
  if (columnDropdownRef.value && !columnDropdownRef.value.contains(event.target as HTMLElement)) {
    showColumnDropdown.value = false
  }
}

const loadErrors = async () => {
  if (!validRange.value || !errorViewEnabled.value) return
  const seq = ++errorRequestSeq
  errorLoading.value = true
  try {
    const resp = await usageAPI.listMyErrorRequests({
      page: errorPage.value,
      page_size: errorPageSize.value,
      start_date: startDate.value,
      end_date: endDate.value,
      model: (errorFilter.value.model ?? '').trim() || undefined,
      category: errorFilter.value.category || undefined,
      api_key_id: errorFilter.value.api_key_id ?? undefined,
      status_code: errorFilter.value.status_code ?? undefined,
      sort_by: errorSortBy.value,
      sort_order: errorSortOrder.value,
    })
    if (seq !== errorRequestSeq || disposed) return
    errorRows.value = resp.items
    errorTotal.value = resp.total
  } catch (error) {
    if (seq !== errorRequestSeq || disposed) return
    console.error('[RequestLogsView] loadErrors failed:', error)
    appStore.showError(t('usage.errors.failedToLoad'))
  } finally {
    if (seq === errorRequestSeq && !disposed) errorLoading.value = false
  }
}

const onErrorSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
  errorSortBy.value = sortBy
  errorSortOrder.value = sortOrder
  errorPage.value = 1
  void loadErrors()
}

const onErrorPage = (page: number) => {
  errorPage.value = page
  void loadErrors()
}

const onErrorPageSize = (pageSize: number) => {
  errorPageSize.value = pageSize
  errorPage.value = 1
  void loadErrors()
}

const switchToErrors = () => {
  if (!errorViewEnabled.value) return
  activeTab.value = 'errors'
  void loadErrors()
}


onMounted(() => {
  loadSavedColumns()
  loadSavedErrColumns()
  document.addEventListener('click', handleColumnClickOutside)
  void usageFilters.loadFilterOptions()
  refreshData()
})
onUnmounted(() => {
  disposed = true
  errorRequestSeq++
  abortController?.abort()
  document.removeEventListener('click', handleColumnClickOutside)
})
watch(errorViewEnabled, enabled => {
  if (!enabled && activeTab.value === 'errors') switchToUsage()
})
</script>
