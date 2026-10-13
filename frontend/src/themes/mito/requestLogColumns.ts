import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Column } from '@/components/common/types'
import { useMitoLabels } from './labels'

export function useRequestLogColumns() {
  const { t } = useI18n()
  const label = useMitoLabels()
  return computed<Column[]>(() => [
    { key: 'created_at', label: t('usage.time'), sortable: true, class: 'mito-col-time' },
    { key: 'api_key', label: label('key'), class: 'mito-col-key' },
    { key: 'request_id', label: label('requestId'), class: 'mito-col-request' },
    { key: 'model', label: t('usage.model'), sortable: true, class: 'mito-col-model' },
    { key: 'group', label: t('admin.usage.group'), class: 'mito-col-group' },
    { key: 'reasoning_effort', label: t('usage.reasoningEffort'), class: 'mito-col-reasoning' },
    { key: 'stream', label: t('usage.type'), class: 'mito-col-type' },
    { key: 'first_token_ms', label: t('usage.latencyFirstToken'), class: 'mito-col-number' },
    { key: 'tps', label: 'TPS', class: 'mito-col-number' },
    { key: 'duration_ms', label: t('usage.duration'), class: 'mito-col-number' },
    { key: 'input_tokens', label: t('usage.in'), class: 'mito-col-number' },
    { key: 'output_tokens', label: t('usage.out'), class: 'mito-col-number' },
    { key: 'cache_read_tokens', label: label('cacheRead'), class: 'mito-col-number' },
    { key: 'cache_hit_rate', label: t('usage.cacheHitRate'), class: 'mito-col-rate' },
    { key: 'cache_creation_tokens', label: label('cacheWrite'), class: 'mito-col-number' },
    { key: 'cost', label: t('usage.cost'), class: 'mito-col-cost' },
    { key: 'special_billing', label: label('specialBilling'), class: 'mito-col-special' },
    { key: 'rate_multiplier', label: label('rate'), class: 'mito-col-rate' },
    { key: 'billing_mode', label: t('admin.usage.billingMode'), class: 'mito-col-type' },
    { key: 'endpoint', label: t('usage.endpoint'), class: 'mito-col-endpoint' },
    { key: 'ip_address', label: 'IP', class: 'mito-col-ip' },
    { key: 'user_agent', label: t('usage.userAgent'), class: 'mito-col-agent' },
  ])
}
