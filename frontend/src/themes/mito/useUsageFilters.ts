import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { keysAPI, userGroupsAPI } from '@/api'
import { useAppStore } from '@/stores/app'
import { FeatureFlags, resolveFeatureFlag } from '@/utils/featureFlags'
import { requestTypeToLegacyStream } from '@/utils/usageRequestType'
import type { ApiKey, Group, UsageQueryParams } from '@/types'
import type { SelectOption } from '@/components/common/Select.vue'

const localDate = (date: Date) => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'),
].join('-')

// Preserve the upstream default and date-only API contract.
export function defaultUsageRange() {
  const end = new Date()
  return { start: localDate(new Date(end.getTime() - 86400000)), end: localDate(end) }
}

export function usageGranularity(start: string, end: string): 'hour' | 'day' {
  return new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime() <= 86400000 ? 'hour' : 'day'
}

/** Shared filter state only; each page owns its own data requests. */
export function useUsageFilters() {
  const { t } = useI18n()
  const app = useAppStore()
  const range = defaultUsageRange()
  const startDate = ref(range.start)
  const endDate = ref(range.end)
  const filters = ref<UsageQueryParams>({})
  function setFilter<K extends keyof UsageQueryParams>(key: K, value: UsageQueryParams[K]) {
    filters.value = { ...filters.value, [key]: value }
  }
  function setDate(boundary: 'start' | 'end', value: string) {
    if (boundary === 'start') startDate.value = value
    else endDate.value = value
  }
  const apiKeys = ref<ApiKey[]>([])
  const groups = ref<Group[]>([])
  const modelValues = ref<string[]>([])
  const subscriptionFeatureEnabled = computed(() => resolveFeatureFlag(app.cachedPublicSettings, FeatureFlags.subscription))
  const validRange = computed(() => Boolean(startDate.value && endDate.value && startDate.value <= endDate.value))
  const normalizedFilters = computed<UsageQueryParams>(() => {
    const legacyStream = filters.value.request_type
      ? requestTypeToLegacyStream(filters.value.request_type)
      : filters.value.stream
    return { ...filters.value, start_date: startDate.value, end_date: endDate.value, stream: legacyStream ?? undefined }
  })
  const selectedCount = computed(() =>
    Object.values(filters.value).filter(value => value != null && value !== '').length +
    Number(startDate.value !== range.start || endDate.value !== range.end)
  )
  const apiKeyOptions = computed<SelectOption[]>(() => [
    { value: null, label: t('usage.allApiKeys') },
    ...apiKeys.value.map(key => ({ value: key.id, label: key.name })),
  ])
  const groupOptions = computed<SelectOption[]>(() => [
    { value: null, label: t('admin.usage.allGroups') },
    ...groups.value.map(group => ({ value: group.id, label: group.name })),
  ])
  // Logs add models from actual returned rows. The searchable, creatable control
  // can still filter a model that is not present on the current page.
  const modelOptions = computed<SelectOption[]>(() => [
    { value: null, label: t('admin.usage.allModels') },
    ...Array.from(new Set([...modelValues.value, filters.value.model].filter((value): value is string => Boolean(value))))
      .sort().map(model => ({ value: model, label: model })),
  ])
  const requestTypeOptions = computed<SelectOption[]>(() => [
    { value: null, label: t('admin.usage.allTypes') },
    ...(['ws_v2', 'live', 'stream', 'sync'] as const).map(value => ({
      value, label: t('usage.' + (value === 'ws_v2' ? 'ws' : value)),
    })),
  ])
  const compactionOptions = computed<SelectOption[]>(() => [
    { value: null, label: t('usage.allCompactionTypes') },
    { value: true, label: t('usage.compactionOnly') },
  ])
  const billingTypeOptions = computed<SelectOption[]>(() => [
    { value: null, label: t('admin.usage.allBillingTypes') },
    { value: 0, label: t('admin.usage.billingTypeBalance') },
    { value: 1, label: t('admin.usage.billingTypeSubscription') },
  ])
  const billingModeOptions = computed<SelectOption[]>(() => [
    { value: null, label: t('admin.usage.allBillingModes') },
    ...([['token', 'Token'], ['per_request', 'PerRequest'], ['image', 'Image'], ['video', 'Video']] as const)
      .map(([value, label]) => ({ value, label: t('admin.usage.billingMode' + label) })),
  ])
  function rememberModels(rows: { model?: string }[]) {
    modelValues.value = Array.from(new Set([...modelValues.value, ...rows.map(row => row.model).filter((model): model is string => Boolean(model))]))
  }
  async function loadFilterOptions() {
    async function loadKeys() {
      const first = await keysAPI.list(1, 100)
      const keys = [...first.items]
      for (let page = 2; page <= first.pages; page++) {
        const result = await keysAPI.list(page, 100)
        if (!result.items.length) break
        keys.push(...result.items)
      }
      apiKeys.value = keys
    }
    const results = await Promise.allSettled([
      loadKeys(),
      userGroupsAPI.getAvailable().then(result => { groups.value = result }),
    ])
    if (results.some(result => result.status === 'rejected')) app.showError(t('usage.failedToLoad'))
  }
  function reset() {
    const current = defaultUsageRange()
    startDate.value = current.start
    endDate.value = current.end
    filters.value = {}
  }
  return {
    startDate, endDate, filters, setFilter, setDate, apiKeys, normalizedFilters, validRange, selectedCount,
    subscriptionFeatureEnabled, apiKeyOptions, groupOptions, modelOptions, requestTypeOptions,
    compactionOptions, billingTypeOptions, billingModeOptions, rememberModels, loadFilterOptions, reset,
  }
}

export type UsageFiltersState = ReturnType<typeof useUsageFilters>
