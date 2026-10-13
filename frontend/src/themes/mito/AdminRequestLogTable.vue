<template>
  <UsageTable
    flat
    variant="request-log"
    :data="data"
    :loading="loading"
    :columns="columns"
    :server-side-sort="serverSideSort"
    :show-account-billing="true"
    :show-upstream-endpoint="true"
    :resizable-columns="true"
    :column-width-storage-key="COLUMN_WIDTH_STORAGE_KEY"
    :default-sort-key="defaultSortKey"
    :default-sort-order="defaultSortOrder"
    @sort="(key, order) => $emit('sort', key, order)"
    @userClick="(id, email) => $emit('userClick', id, email)"
    @ipGeoBatchFailed="$emit('ipGeoBatchFailed')"
  >
    <template #cell-created_at="{ row }">
      <time :datetime="row.created_at" :title="formatDateTime(row.created_at)">{{ compactDate(row.created_at) }}</time>
    </template>

    <template #cell-first_token_ms="{ row }">
      <span
        v-if="row.first_token_ms != null"
        class="mito-log-metric"
        :class="LATENCY_TEXT_CLASSES[firstTokenSeverity(row.first_token_ms)]"
      >{{ duration(row.first_token_ms) }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-tps="{ row }">
      <span
        v-if="formatUsageOutputTps(row)"
        class="mito-log-metric"
        :title="t('usage.latencyTpsHint')"
      >{{ formatUsageOutputTps(row) }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-duration_ms="{ row }">
      <span
        v-if="row.duration_ms != null"
        class="mito-log-metric"
        :class="LATENCY_TEXT_CLASSES[durationSeverity(row.duration_ms)]"
      >{{ duration(row.duration_ms) }}</span>
      <span v-else class="mito-log-muted">—</span>
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
      <span
        class="mito-log-metric"
        :class="cacheRateClass(row)"
        :title="label('cacheRateHint')"
      >{{ cacheRate(row) }}</span>
    </template>

    <template #cell-cost="{ row, showCostDetails, hideCostDetails }">
      <div class="mito-log-cost-cell">
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
        <span class="mito-log-cost-flags">
          <span
            v-if="showLongContextBadge && row.long_context_billing_applied"
            class="mito-log-special"
            :title="t('admin.usage.longContextPricingTooltip')"
          >{{ t('admin.usage.longContext') }}</span>
          <span
            v-if="row.account_rate_multiplier != null"
            class="mito-log-account-cost"
          >A ${{ accountBilled(row).toFixed(6) }}</span>
        </span>
      </div>
    </template>

    <template #cell-account_cost="{ row }">
      <span v-if="row.account_rate_multiplier != null" class="mito-log-cost">${{ accountBilled(row).toFixed(6) }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-special_billing="{ row }">
      <span
        v-if="showLongContextBadge && row.long_context_billing_applied"
        class="mito-log-special"
        :title="t('admin.usage.longContextPricingTooltip')"
      >{{ t('admin.usage.longContext') }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-rate_multiplier="{ row }">
      <span v-if="row.rate_multiplier != null" class="mito-log-rate">{{ row.rate_multiplier.toFixed(2) }}x</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-account_rate_multiplier="{ row }">
      <span v-if="row.account_rate_multiplier != null" class="mito-log-rate">{{ row.account_rate_multiplier.toFixed(2) }}x</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-upstream_model="{ row }">
      <div class="mito-log-upstream">
        <span v-if="row.upstream_model" class="mito-log-upstream-model" :title="row.upstream_model">{{ row.upstream_model }}</span>
        <span v-else class="mito-log-muted">—</span>
        <span
          v-if="row.upstream_model_mismatch === true && row.upstream_response_model"
          class="mito-log-mismatch"
          :title="modelAuditTitle(row)"
        >↳ {{ row.upstream_response_model }}</span>
      </div>
    </template>

    <template #cell-cache_creation_5m_tokens="{ row }">
      <span class="mito-log-metric" :class="{ 'mito-log-muted': !row.cache_creation_5m_tokens }">{{ compactNumber(row.cache_creation_5m_tokens) }}</span>
    </template>

    <template #cell-cache_creation_1h_tokens="{ row }">
      <span class="mito-log-metric" :class="{ 'mito-log-muted': !row.cache_creation_1h_tokens }">{{ compactNumber(row.cache_creation_1h_tokens) }}</span>
    </template>

    <template #cell-cache_ttl_overridden="{ row }">
      <span
        v-if="row.cache_ttl_overridden"
        class="mito-log-special"
        :title="t('usage.cacheTtlOverriddenHint')"
      >{{ row.cache_creation_1h_tokens > 0 ? label('cache1h') : label('cache5m') }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-image_count="{ row }">
      <span :class="row.image_count ? 'mito-log-metric' : 'mito-log-muted'">
        {{ row.image_count ? row.image_count + t('usage.imageUnit') : '—' }}
      </span>
    </template>

    <template #cell-image_size="{ row }">
      <span v-if="isImageUsage(row)" class="mito-log-metric">{{ formatImageBillingSize(row, t) }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-image_tokens="{ row }">
      <span v-if="imageTokenTotal(row)" class="mito-log-metric">{{ compactNumber(imageTokenTotal(row)) }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-image_cost="{ row }">
      <span v-if="imageCostTotal(row)" class="mito-log-cost">${{ imageCostTotal(row).toFixed(6) }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-billing_type="{ row }">
      <span class="mito-log-badge">{{ billingTypeLabel(row.billing_type) }}</span>
    </template>

    <template #cell-billing_tier="{ row }">
      <span v-if="row.billing_tier" class="mito-log-badge">{{ row.billing_tier }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-channel_id="{ row }">
      <span v-if="row.channel_id != null" class="mito-log-metric">#{{ row.channel_id }}</span>
      <span v-else class="mito-log-muted">—</span>
    </template>

    <template #cell-service_tier="{ row }">
      <span class="mito-log-badge">{{ getUsageServiceTierLabel(row.service_tier, t) }}</span>
    </template>
  </UsageTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UsageTable from '@/components/admin/usage/UsageTable.vue'
import { useAppStore } from '@/stores/app'
import { formatDateTime } from '@/utils/format'
import { formatUsageOutputTps } from '@/utils/usageTps'
import { LATENCY_TEXT_CLASSES, durationSeverity, firstTokenSeverity } from '@/utils/latencyHealth'
import { formatImageBillingSize } from '@/utils/imageUsage'
import { isImageUsage } from '@/utils/billingMode'
import { getUsageServiceTierLabel } from '@/utils/usageServiceTier'
import type { AdminUsageLog } from '@/types'
import type { Column } from '@/components/common/types'
import { useMitoLabels } from './labels'

/** Column widths are stored apart from the visibility preference keys. */
const COLUMN_WIDTH_STORAGE_KEY = 'mito-admin-usage-column-widths-v1'

withDefaults(defineProps<{
  data: AdminUsageLog[]
  columns: Column[]
  loading?: boolean
  serverSideSort?: boolean
  defaultSortKey?: string
  defaultSortOrder?: 'asc' | 'desc'
  /** Kept for API parity with the shared table; timing lives in its own columns here. */
  enableTimingDetails?: boolean
  showAccountBilling?: boolean
  showUpstreamEndpoint?: boolean
  flat?: boolean
  variant?: 'default' | 'request-log'
}>(), {
  loading: false,
  serverSideSort: true,
  defaultSortKey: 'created_at',
  defaultSortOrder: 'desc',
  enableTimingDetails: false,
  showAccountBilling: true,
  showUpstreamEndpoint: true,
  flat: true,
  variant: 'request-log',
})

defineEmits<{
  sort: [key: string, order: 'asc' | 'desc']
  userClick: [userID: number, email?: string]
  ipGeoBatchFailed: []
}>()

const { t } = useI18n()
const label = useMitoLabels()
const app = useAppStore()

const showLongContextBadge = computed(() => app.cachedPublicSettings?.usage_show_long_context_badge !== false)
const tokenFields = ['input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_creation_tokens'] as const
const cellSlot = (field: string) => 'cell-' + field
const tokenLabel = (field: typeof tokenFields[number]) => ({
  input_tokens: t('usage.in'),
  output_tokens: t('usage.out'),
  cache_read_tokens: label('cacheRead'),
  cache_creation_tokens: label('cacheWrite'),
})[field]

/** Same compact thresholds as the personal request log. */
function compactDate(value: string): string {
  const formatted = formatDateTime(value)
  return /^\d{4}-/.test(formatted) ? formatted.slice(5) : formatted
}

function compactNumber(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}

function duration(ms: number): string {
  return ms < 1000 ? Math.round(ms) + 'ms' : (ms / 1000).toFixed(2) + 's'
}

/** Prompt-token denominator identical to the personal list and the token trend. */
function cacheRate(row: AdminUsageLog): string {
  const prompt = (row.input_tokens || 0) + (row.cache_read_tokens || 0) + (row.cache_creation_tokens || 0)
  return prompt > 0 ? ((row.cache_read_tokens || 0) / prompt * 100).toFixed(1) + '%' : '—'
}

function cacheRateClass(row: AdminUsageLog): string {
  const rate = cacheRate(row)
  return rate === '—' ? 'mito-log-muted' : 'mito-log-cache-rate'
}

function accountBilled(row: AdminUsageLog): number {
  const base = row.account_stats_cost != null ? row.account_stats_cost : (row.total_cost ?? 0)
  const result = base * (row.account_rate_multiplier ?? 1)
  return Number.isNaN(result) ? 0 : result
}

function imageTokenTotal(row: AdminUsageLog): number {
  return (row.image_input_tokens || 0) + (row.image_output_tokens || 0)
}

function imageCostTotal(row: AdminUsageLog): number {
  return (row.image_input_cost || 0) + (row.image_output_cost || 0)
}

function billingTypeLabel(type: number | null | undefined): string {
  return type === 1 ? t('admin.usage.billingTypeSubscription') : t('admin.usage.billingTypeBalance')
}

function modelAuditTitle(row: AdminUsageLog): string {
  return [
    `${t('usage.requestedModel')}: ${row.model || '-'}`,
    `${t('usage.sentUpstreamModel')}: ${row.upstream_model || '-'}`,
    `${t('usage.upstreamResponseModel')}: ${row.upstream_response_model || '-'}`,
  ].join('\n')
}
</script>
