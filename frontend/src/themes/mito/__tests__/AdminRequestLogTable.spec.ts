import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import AdminRequestLogTable from '../AdminRequestLogTable.vue'
import { ADMIN_USAGE_DEFAULT_HIDDEN_COLUMNS, useAdminUsageColumns } from '../adminRequestLogColumns'
import type { AdminUsageLog } from '@/types'
import type { Column } from '@/components/common/types'

const settings = reactive({ usage_show_long_context_badge: true })
vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ cachedPublicSettings: settings, showSuccess: vi.fn(), showError: vi.fn() }),
}))
vi.mock('vue-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))
vi.mock('@/utils/ipGeoLookup', () => ({ getEntry: () => ({ status: 'idle' }), fetchBatch: vi.fn(), fetchOne: vi.fn() }))

const baseRow = {
  id: 1, user_id: 2, api_key_id: 3, account_id: 4,
  request_id: 'req-admin-audit', upstream_request_id: 'up-req',
  created_at: '2026-10-12T10:00:00Z',
  user: { id: 2, email: 'operator@test.com' }, api_key: { name: 'prod-key' },
  account: { id: 4, name: 'primary-account' },
  model: 'requested-model', upstream_model: 'mapped-model',
  upstream_model_mismatch: true, upstream_response_model: 'other-model',
  group: { id: 1, name: 'mito-group' },
  reasoning_effort: 'high', stream: true, request_type: 'stream',
  billing_mode: 'token', billing_type: 1, billing_tier: 'premium',
  channel_id: 7, service_tier: 'priority',
  rate_multiplier: 0.5, account_rate_multiplier: 1.5,
  account_stats_cost: 0.2,
  first_token_ms: 10000, duration_ms: 20000,
  input_tokens: 100, output_tokens: 1000,
  cache_read_tokens: 800, cache_creation_tokens: 100,
  cache_creation_5m_tokens: 100, cache_creation_1h_tokens: 0, cache_ttl_overridden: true,
  image_count: 0, image_size: null,
  image_input_tokens: 0, image_output_tokens: 0,
  image_input_cost: 0, image_output_cost: 0,
  actual_cost: 0.125, total_cost: 0.25,
  long_context_billing_applied: true,
} as unknown as AdminUsageLog

/** Column order comes straight from the theme module; the spec guards the contract. */
const columnKeys = [
  'created_at', 'user', 'api_key', 'account', 'model', 'reasoning_effort', 'endpoint', 'group',
  'stream', 'first_token_ms', 'tps', 'duration_ms', 'input_tokens', 'output_tokens',
  'cache_read_tokens', 'cache_hit_rate', 'cache_creation_tokens', 'cost', 'special_billing',
  'rate_multiplier', 'billing_mode', 'ip_address', 'upstream_model', 'account_rate_multiplier',
  'account_cost', 'cache_creation_5m_tokens', 'cache_creation_1h_tokens', 'cache_ttl_overridden',
  'image_count', 'image_size', 'image_tokens', 'image_cost', 'billing_type', 'billing_tier',
  'channel_id', 'service_tier', 'request_id', 'upstream_request_id', 'user_agent',
]
const columns: Column[] = columnKeys.map(key => ({ key, label: key, class: `col-${key}`, sortable: key === 'created_at' }))

function render(data: AdminUsageLog[] = [baseRow]) {
  return mount(AdminRequestLogTable, {
    props: { data, loading: false, columns },
    global: { stubs: { Icon: true, Teleport: true, UsageTimingDialog: true } },
  })
}

describe('admin request log table', () => {
  it('renders the request-log density with the administrator audit fields', () => {
    const wrapper = render()
    expect(wrapper.get('td.col-created_at').text()).not.toContain('2026-')
    expect(wrapper.get('td.col-user').text()).toContain('operator@test.com')
    expect(wrapper.get('td.col-account').text()).toContain('primary-account')
    expect(wrapper.get('td.col-first_token_ms').text()).toBe('10.00s')
    expect(wrapper.get('td.col-tps').text()).toBe('50.0 t/s')
    expect(wrapper.get('td.col-duration_ms').text()).toBe('20.00s')
    expect(wrapper.get('td.col-output_tokens').text()).toBe('1.0K')
    expect(wrapper.get('td.col-cache_hit_rate').text()).toBe('80.0%')
    expect(wrapper.get('td.col-cache_creation_5m_tokens').text()).toBe('100')
    expect(wrapper.get('td.col-cache_creation_1h_tokens').text()).toBe('—')
    expect(wrapper.get('td.col-cost .mito-log-cost').text()).toBe('$0.125000')
    expect(wrapper.get('td.col-cost .mito-log-account-cost').text()).toBe('A $0.300000')
    expect(wrapper.get('td.col-account_cost').text()).toBe('$0.300000')
    expect(wrapper.get('td.col-rate_multiplier').text()).toBe('0.50x')
    expect(wrapper.get('td.col-account_rate_multiplier').text()).toBe('1.50x')
    expect(wrapper.get('td.col-upstream_model').text()).toContain('mapped-model')
    expect(wrapper.get('td.col-upstream_model .mito-log-mismatch').text()).toContain('other-model')
    expect(wrapper.get('td.col-billing_type').text()).toBe('admin.usage.billingTypeSubscription')
    expect(wrapper.get('td.col-billing_tier').text()).toBe('premium')
    expect(wrapper.get('td.col-channel_id').text()).toBe('#7')
    expect(wrapper.get('td.col-cache_ttl_overridden').text()).toBe('Write 5m')
    expect(wrapper.find('td.col-cost .mito-log-special').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders the image billing fields for image requests', () => {
    const imageRow = {
      ...baseRow, billing_mode: 'image', image_count: 2, image_size: '1024x1024',
      image_input_tokens: 10, image_output_tokens: 20,
      image_input_cost: 0.01, image_output_cost: 0.02, cache_creation_1h_tokens: 40,
    } as unknown as AdminUsageLog
    const wrapper = render([imageRow])
    expect(wrapper.get('td.col-image_count').text()).toContain('2')
    expect(wrapper.get('td.col-image_size').text()).toContain('1024x1024')
    expect(wrapper.get('td.col-image_tokens').text()).toBe('30')
    expect(wrapper.get('td.col-image_cost').text()).toBe('$0.030000')
    expect(wrapper.get('td.col-cache_creation_1h_tokens').text()).toBe('40')
    expect(wrapper.get('td.col-cache_ttl_overridden').text()).toBe('Write 1h')
    wrapper.unmount()
  })

  it('keeps audit-only cells empty instead of inventing values', () => {
    const empty = { ...baseRow, upstream_model: null, upstream_model_mismatch: false, upstream_response_model: null,
      account_rate_multiplier: null, account_stats_cost: null,
      channel_id: null, billing_tier: null, image_count: 0, image_size: null,
      image_input_tokens: 0, image_output_tokens: 0,
      image_input_cost: 0, image_output_cost: 0, cache_creation_5m_tokens: 0, cache_ttl_overridden: false,
      long_context_billing_applied: false } as unknown as AdminUsageLog
    const wrapper = render([empty])
    expect(wrapper.get('td.col-upstream_model').text()).toBe('—')
    expect(wrapper.get('td.col-account_rate_multiplier').text()).toBe('—')
    expect(wrapper.get('td.col-account_cost').text()).toBe('—')
    expect(wrapper.get('td.col-channel_id').text()).toBe('—')
    expect(wrapper.get('td.col-billing_tier').text()).toBe('—')
    expect(wrapper.get('td.col-cache_ttl_overridden').text()).toBe('—')
    expect(wrapper.find('td.col-cost .mito-log-account-cost').exists()).toBe(false)
    expect(wrapper.find('.mito-log-special').exists()).toBe(false)
    wrapper.unmount()
  })

  it('hides the audit-only columns by default while keeping the request-log core visible', () => {
    expect(ADMIN_USAGE_DEFAULT_HIDDEN_COLUMNS).toEqual(expect.arrayContaining([
      'request_id', 'upstream_request_id', 'user_agent', 'upstream_model',
      'account_rate_multiplier', 'account_cost', 'cache_creation_5m_tokens', 'cache_creation_1h_tokens',
      'cache_ttl_overridden', 'image_count', 'image_size', 'image_tokens', 'image_cost',
      'billing_type', 'billing_tier', 'channel_id', 'service_tier',
    ]))
    for (const key of ['created_at', 'user', 'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_hit_rate', 'cost']) {
      expect(ADMIN_USAGE_DEFAULT_HIDDEN_COLUMNS as readonly string[]).not.toContain(key)
    }
  })

  it('exposes every administrator field in the column contract', () => {
    const columns = useAdminUsageColumns()
    expect(columns.value.map(column => column.key)).toEqual(columnKeys)
    expect(columns.value.every(column => typeof column.width === 'number')).toBe(true)
  })
})
