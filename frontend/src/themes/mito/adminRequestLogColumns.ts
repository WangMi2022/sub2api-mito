import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Column } from '@/components/common/types'
import { useMitoLabels } from './labels'

/**
 * Admin usage audit list.
 *
 * Mirrors the personal request-log table (density, column order and semantics)
 * and adds the administrator-only fields: user/account identity, upstream model
 * audit, account rate and cost, cache TTL splits, image billing, billing
 * type/tier, channel and service tier. Columns that only matter while auditing
 * stay hidden by default; UsageView keeps the hidden-key list, so operator
 * preferences and future upstream updates do not fight each other.
 */
export function useAdminUsageColumns() {
  const { t } = useI18n()
  const label = useMitoLabels()

  return computed<Column[]>(() => [
    { key: 'created_at', label: t('usage.time'), sortable: true, class: 'mito-log-col-time', width: 136, minWidth: 108 },
    { key: 'user', label: t('admin.usage.user'), class: 'mito-log-col-user', width: 188, minWidth: 132 },
    { key: 'api_key', label: t('usage.apiKeyFilter'), class: 'mito-log-col-key', width: 132, minWidth: 96 },
    { key: 'account', label: t('admin.usage.account'), class: 'mito-log-col-account', width: 152, minWidth: 112 },
    { key: 'model', label: t('usage.model'), sortable: true, class: 'mito-log-col-model', width: 208, minWidth: 148 },
    { key: 'reasoning_effort', label: t('usage.reasoningEffort'), class: 'mito-log-col-reasoning', width: 132, minWidth: 104 },
    { key: 'endpoint', label: t('usage.endpoint'), class: 'mito-log-col-endpoint', width: 208, minWidth: 144 },
    { key: 'group', label: t('admin.usage.group'), class: 'mito-log-col-group', width: 132, minWidth: 100 },
    { key: 'stream', label: t('usage.type'), class: 'mito-log-col-type', width: 120, minWidth: 96 },
    { key: 'first_token_ms', label: t('usage.latencyFirstToken'), class: 'mito-log-col-number', width: 96, minWidth: 80 },
    { key: 'tps', label: 'TPS', class: 'mito-log-col-number', width: 88, minWidth: 72 },
    { key: 'duration_ms', label: t('usage.duration'), class: 'mito-log-col-number', width: 96, minWidth: 80 },
    { key: 'input_tokens', label: t('usage.in'), class: 'mito-log-col-number', width: 92, minWidth: 76 },
    { key: 'output_tokens', label: t('usage.out'), class: 'mito-log-col-number', width: 92, minWidth: 76 },
    { key: 'cache_read_tokens', label: label('cacheRead'), class: 'mito-log-col-number', width: 92, minWidth: 76 },
    { key: 'cache_hit_rate', label: t('usage.cacheHitRate'), class: 'mito-log-col-rate', width: 96, minWidth: 80 },
    { key: 'cache_creation_tokens', label: label('cacheWrite'), class: 'mito-log-col-number', width: 92, minWidth: 76 },
    { key: 'cost', label: t('usage.cost'), class: 'mito-log-col-cost', width: 132, minWidth: 110 },
    { key: 'special_billing', label: label('specialBilling'), class: 'mito-log-col-special', width: 108, minWidth: 92 },
    { key: 'rate_multiplier', label: label('rate'), class: 'mito-log-col-rate', width: 84, minWidth: 68 },
    { key: 'billing_mode', label: t('admin.usage.billingMode'), class: 'mito-log-col-type', width: 112, minWidth: 94 },
    { key: 'ip_address', label: t('admin.usage.ipAddress'), class: 'mito-log-col-ip', width: 176, minWidth: 124 },
    { key: 'upstream_model', label: label('upstreamModel'), class: 'mito-log-col-model', width: 208, minWidth: 148 },
    { key: 'account_rate_multiplier', label: label('accountRate'), class: 'mito-log-col-rate', width: 100, minWidth: 80 },
    { key: 'account_cost', label: label('accountCost'), class: 'mito-log-col-cost', width: 120, minWidth: 98 },
    { key: 'cache_creation_5m_tokens', label: label('cache5m'), class: 'mito-log-col-number', width: 100, minWidth: 84 },
    { key: 'cache_creation_1h_tokens', label: label('cache1h'), class: 'mito-log-col-number', width: 100, minWidth: 84 },
    { key: 'cache_ttl_overridden', label: label('ttlOverride'), class: 'mito-log-col-special', width: 112, minWidth: 92 },
    { key: 'image_count', label: t('usage.imageCount'), class: 'mito-log-col-number', width: 96, minWidth: 80 },
    { key: 'image_size', label: t('usage.imageBillingSize'), class: 'mito-log-col-type', width: 132, minWidth: 108 },
    { key: 'image_tokens', label: label('imageTokens'), class: 'mito-log-col-number', width: 112, minWidth: 92 },
    { key: 'image_cost', label: label('imageCost'), class: 'mito-log-col-cost', width: 112, minWidth: 92 },
    { key: 'billing_type', label: t('admin.usage.billingType'), class: 'mito-log-col-type', width: 120, minWidth: 98 },
    { key: 'billing_tier', label: label('billingTier'), class: 'mito-log-col-type', width: 124, minWidth: 100 },
    { key: 'channel_id', label: label('channelId'), class: 'mito-log-col-type', width: 96, minWidth: 80 },
    { key: 'service_tier', label: t('usage.serviceTier'), class: 'mito-log-col-type', width: 120, minWidth: 94 },
    { key: 'request_id', label: label('requestId'), class: 'mito-log-col-request', width: 176, minWidth: 124 },
    { key: 'upstream_request_id', label: t('admin.usage.upstreamRequestId'), class: 'mito-log-col-request', width: 176, minWidth: 124 },
    { key: 'user_agent', label: t('usage.userAgent'), class: 'mito-log-col-agent', width: 208, minWidth: 144 },
  ])
}

/** Hidden until the operator switches them on; the visible core matches the request-log list. */
export const ADMIN_USAGE_DEFAULT_HIDDEN_COLUMNS = [
  'request_id',
  'upstream_request_id',
  'user_agent',
  'upstream_model',
  'account_rate_multiplier',
  'account_cost',
  'cache_creation_5m_tokens',
  'cache_creation_1h_tokens',
  'cache_ttl_overridden',
  'image_count',
  'image_size',
  'image_tokens',
  'image_cost',
  'billing_type',
  'billing_tier',
  'channel_id',
  'service_tier',
] as const
