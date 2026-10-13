import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import RequestLogTable from '../RequestLogTable.vue'
import type { UsageLog } from '@/types'

const settings = reactive({ subscription_enabled: true, usage_show_long_context_badge: true })
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ cachedPublicSettings: settings, showSuccess: vi.fn(), showError: vi.fn() }) }))
vi.mock('vue-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))
vi.mock('@/utils/ipGeoLookup', () => ({ getEntry: () => ({ status: 'idle' }), fetchBatch: vi.fn(), fetchOne: vi.fn() }))

const row = {
  id: 1, request_id: 'request-full-id', created_at: '2026-10-12T10:00:00Z',
  model: 'requested-model', upstream_model: 'mapped-model', api_key: { name: 'my-key' },
  group: { id: 1, name: 'my-group' }, billing_type: 1, billing_mode: 'token',
  reasoning_effort: 'high', stream: true, request_type: 'stream',
  first_token_ms: 10000, duration_ms: 20000, input_tokens: 100, output_tokens: 1000,
  cache_read_tokens: 800, cache_creation_tokens: 100, image_count: 0,
  cache_creation_5m_tokens: 100, cache_creation_1h_tokens: 0,
  actual_cost: 0.125, total_cost: 0.25, rate_multiplier: 0.5,
  input_cost: 0.1, output_cost: 0.1, cache_creation_cost: 0.02, cache_read_cost: 0.03,
  long_context_billing_applied: true,
} as UsageLog
const fields = ['created_at', 'api_key', 'request_id', 'model', 'group', 'reasoning_effort', 'stream',
  'first_token_ms', 'tps', 'duration_ms', 'input_tokens', 'output_tokens', 'cache_read_tokens',
  'cache_hit_rate', 'cache_creation_tokens', 'cost', 'special_billing', 'rate_multiplier']
let wrapper: VueWrapper
function render(data: UsageLog[] = [row]) {
  wrapper = mount(RequestLogTable, { props: {
    data, loading: false, columns: fields.map(key => ({ key, label: key, class: 'col-' + key, sortable: key === 'created_at' })),
  }, global: { stubs: { Icon: true, Teleport: true, UsageTimingDialog: true } } })
  return wrapper
}
beforeEach(() => {
  settings.subscription_enabled = true
  settings.usage_show_long_context_badge = true
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: true, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks() })

describe('request log table with the real upstream table', () => {
  it('overrides cells while preserving model mapping, copying and numeric semantics', async () => {
    const copy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } })
    render()
    expect(wrapper.get('td.col-created_at').text()).not.toContain('2026-')
    expect(wrapper.get('td.col-model').text()).toContain('mapped-model')
    expect(wrapper.get('td.col-api_key').text()).toBe('my-key')
    expect(wrapper.get('td.col-group').text()).toContain('my-group')
    expect(wrapper.find('.mito-log-subscription').exists()).toBe(true)
    expect(wrapper.get('td.col-first_token_ms').text()).toBe('10.00s')
    expect(wrapper.get('td.col-tps').text()).toBe('50.0 t/s')
    expect(wrapper.get('td.col-output_tokens').text()).toBe('1.0K')
    expect(wrapper.get('td.col-cache_hit_rate').text()).toBe('80.0%')
    expect(wrapper.get('td.col-cost .mito-log-cost').text()).toBe('$0.125000')
    expect(wrapper.get('td.col-rate_multiplier').text()).toBe('0.50x')
    await wrapper.get('td.col-request_id button').trigger('click')
    await flushPromises()
    expect(copy).toHaveBeenCalledWith('request-full-id')
    await wrapper.get('th.col-created_at').trigger('click')
    expect(wrapper.emitted('sort')).toEqual([['created_at', 'asc']])
  })

  it('does not invent absent timings or throughput and honors display feature flags', async () => {
    render([{ ...row, first_token_ms: null, duration_ms: 0, input_tokens: 0, cache_read_tokens: 0,
      cache_creation_tokens: 0, image_count: 1, actual_cost: 0, rate_multiplier: 0 }])
    expect(wrapper.get('td.col-first_token_ms').text()).toBe('—')
    expect(wrapper.get('td.col-duration_ms').text()).toBe('0ms')
    expect(wrapper.get('td.col-tps').text()).toBe('—')
    expect(wrapper.get('td.col-cache_hit_rate').text()).toBe('—')
    expect(wrapper.get('td.col-cost').text()).toBe('$0.000000')
    expect(wrapper.get('td.col-rate_multiplier').text()).toBe('0.00x')
    settings.subscription_enabled = false
    settings.usage_show_long_context_badge = false
    await flushPromises()
    expect(wrapper.find('.mito-log-subscription').exists()).toBe(false)
    expect(wrapper.find('.mito-log-special').exists()).toBe(false)
  })

  it('opens existing billing and token details by keyboard and keeps them inside the viewport', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const tooltip = this.getAttribute('role') === 'tooltip'
      return { x: 1000, left: 1000, right: 1020, y: 750, top: 750, bottom: 768,
        width: tooltip ? 280 : 20, height: tooltip ? 220 : 18, toJSON: () => ({}) } as DOMRect
    })
    render()
    const cost = wrapper.get('.mito-log-cost')
    await cost.trigger('focus')
    await flushPromises()
    const tooltip = wrapper.get('[role="tooltip"]')
    expect(tooltip.text()).toContain('usage.costDetails')
    expect(tooltip.text()).toContain('$0.10000000')
    expect(parseFloat((tooltip.element as HTMLElement).style.left)).toBeLessThanOrEqual(window.innerWidth - 288)
    expect(parseFloat((tooltip.element as HTMLElement).style.top)).toBeLessThanOrEqual(window.innerHeight - 118)
    await cost.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
    const tokens = wrapper.get('td.col-input_tokens .mito-log-metric')
    await tokens.trigger('focus')
    expect(wrapper.get('[role="tooltip"]').text()).toContain('100')
    await tokens.trigger('blur')
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('keeps the same cell overrides in the upstream mobile layout', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
    render()
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.get('[data-field="cost"] .mito-log-cost').text()).toBe('$0.125000')
    expect(wrapper.get('[data-field="cache_hit_rate"]').text()).toContain('80.0%')
  })
})
