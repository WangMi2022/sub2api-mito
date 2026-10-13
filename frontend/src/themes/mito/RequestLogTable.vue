<template>
  <UsageTable
    flat
    variant="request-log"
    :data="data"
    :columns="columns"
    :loading="loading"
    :server-side-sort="true"
    :show-account-billing="false"
    :show-upstream-endpoint="false"
    default-sort-key="created_at"
    default-sort-order="desc"
    @sort="(key, order) => $emit('sort', key, order)"
    @ip-geo-batch-failed="$emit('ipGeoBatchFailed')"
  >
    <template #cell-created_at="{ row }">
      <time :datetime="row.created_at" :title="formatDateTime(row.created_at)">{{ compactDate(row.created_at) }}</time>
    </template>
    <template #cell-group="{ row }">
      <div class="mito-log-group">
        <span v-if="row.group" class="mito-log-channel" :title="row.group.name">{{ row.group.name }}</span>
        <span v-else>—</span>
        <span v-if="subscriptionEnabled && row.billing_type === 1" class="mito-log-subscription">{{ t('admin.usage.billingTypeSubscription') }}</span>
      </div>
    </template>
    <template #cell-first_token_ms="{ row }">
      <span v-if="row.first_token_ms != null" class="mito-log-metric" :class="LATENCY_TEXT_CLASSES[firstTokenSeverity(row.first_token_ms)]" :title="String(row.first_token_ms) + ' ms'">{{ duration(row.first_token_ms) }}</span>
      <span v-else>—</span>
    </template>
    <template #header-tps>
      <span class="mito-log-metric" :title="t('usage.latencyTpsHint')">TPS</span>
    </template>
    <template #cell-tps="{ row }">
      <span class="mito-log-metric" :title="t('usage.latencyTpsHint')">{{ formatUsageOutputTps(row) || '—' }}</span>
    </template>
    <template #cell-duration_ms="{ row }">
      <span v-if="row.duration_ms != null" class="mito-log-metric" :class="LATENCY_TEXT_CLASSES[durationSeverity(row.duration_ms)]" :title="String(row.duration_ms) + ' ms'">{{ duration(row.duration_ms) }}</span>
      <span v-else>—</span>
    </template>
    <template v-for="field in tokenFields" :key="field" #[cellSlot(field)]="{ row, showTokenDetails, hideTokenDetails }">
      <span
        class="mito-log-metric"
        tabindex="0"
        :aria-label="tokenLabel(field) + ': ' + (row[field] ?? 0).toLocaleString()"
        @mouseenter="showTokenDetails($event, row)"
        @mouseleave="hideTokenDetails"
        @focus="showTokenDetails($event, row)"
        @blur="hideTokenDetails"
        @keydown.esc="hideTokenDetails"
      >{{ compactNumber(row[field]) }}</span>
    </template>
    <template #cell-cache_hit_rate="{ row }">
      <span class="mito-log-metric text-sky-600 dark:text-sky-400" :title="label('cacheRateHint')">{{ cacheRate(row) }}</span>
    </template>
    <template #cell-cost="{ row, showCostDetails, hideCostDetails }">
      <span
        class="mito-log-cost"
        tabindex="0"
        :aria-label="t('usage.costDetails') + ': $' + (row.actual_cost ?? 0).toFixed(6)"
        @mouseenter="showCostDetails($event, row)"
        @mouseleave="hideCostDetails"
        @focus="showCostDetails($event, row)"
        @blur="hideCostDetails"
        @keydown.esc="hideCostDetails"
      >${{ (row.actual_cost ?? 0).toFixed(6) }}</span>
    </template>
    <template #cell-special_billing="{ row }">
      <span v-if="showLongContextBadge && row.long_context_billing_applied" class="mito-log-special" :title="t('admin.usage.longContextPricingTooltip')">{{ t('admin.usage.longContext') }}</span>
      <span v-else>—</span>
    </template>
    <template #cell-rate_multiplier="{ row }">
      <span v-if="row.rate_multiplier != null" class="mito-log-rate">{{ row.rate_multiplier.toFixed(2) }}x</span>
      <span v-else>—</span>
    </template>
  </UsageTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UsageTable from '@/components/admin/usage/UsageTable.vue'
import { useAppStore } from '@/stores/app'
import { FeatureFlags, resolveFeatureFlag } from '@/utils/featureFlags'
import { formatDateTime } from '@/utils/format'
import { formatUsageOutputTps } from '@/utils/usageTps'
import { LATENCY_TEXT_CLASSES, durationSeverity, firstTokenSeverity } from '@/utils/latencyHealth'
import type { UsageLog } from '@/types'
import type { Column } from '@/components/common/types'
import { useMitoLabels } from './labels'

defineProps<{ data: UsageLog[]; columns: Column[]; loading: boolean }>()
defineEmits<{ sort: [key: string, order: 'asc' | 'desc']; ipGeoBatchFailed: [] }>()
const { t } = useI18n()
const label = useMitoLabels()
const app = useAppStore()
const subscriptionEnabled = computed(() => resolveFeatureFlag(app.cachedPublicSettings, FeatureFlags.subscription))
const showLongContextBadge = computed(() => app.cachedPublicSettings?.usage_show_long_context_badge !== false)
const tokenFields = ['input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_creation_tokens'] as const
const cellSlot = (field: string) => 'cell-' + field
const tokenLabel = (field: typeof tokenFields[number]) => ({
  input_tokens: t('usage.in'), output_tokens: t('usage.out'),
  cache_read_tokens: label('cacheRead'), cache_creation_tokens: label('cacheWrite'),
})[field]
const duration = (ms: number) => ms < 1000 ? Math.round(ms) + 'ms' : (ms / 1000).toFixed(2) + 's'
function compactDate(value: string): string {
  const formatted = formatDateTime(value)
  return /^\d{4}-/.test(formatted) ? formatted.slice(5) : formatted
}
function compactNumber(value: number | undefined): string {
  if (!value) return '—'
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
  return String(value)
}
function cacheRate(row: UsageLog): string {
  // Same prompt-token denominator as the upstream TokenUsageTrend.
  const prompt = (row.input_tokens || 0) + (row.cache_read_tokens || 0) + (row.cache_creation_tokens || 0)
  return prompt > 0 ? ((row.cache_read_tokens || 0) / prompt * 100).toFixed(1) + '%' : '—'
}
</script>
