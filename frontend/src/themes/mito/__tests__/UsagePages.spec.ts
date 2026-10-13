import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import RequestLogsView from '../RequestLogsView.vue'
import UsageStatsView from '../UsageStatsView.vue'
import UsageFilters from '../UsageFilters.vue'
import RequestLogTable from '../RequestLogTable.vue'
import RequestLogPagination from '../RequestLogPagination.vue'
import UserErrorRequestsTable from '@/components/user/UserErrorRequestsTable.vue'
import UsageStatsCards from '@/components/admin/usage/UsageStatsCards.vue'
import ModelDistributionChart from '@/components/charts/ModelDistributionChart.vue'
import Select from '@/components/common/Select.vue'

const api = vi.hoisted(() => ({
  query: vi.fn(), getStats: vi.fn(), getDashboardModels: vi.fn(), getDashboardSnapshotV2: vi.fn(),
  listMyErrorRequests: vi.fn(), list: vi.fn(), getAvailable: vi.fn(),
}))
const notices = vi.hoisted(() => ({ showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() }))
const settings = reactive({ allow_user_view_error_requests: false, subscription_enabled: true })
vi.mock('@/api', () => ({ usageAPI: api, keysAPI: { list: api.list }, userGroupsAPI: { getAvailable: api.getAvailable } }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ ...notices, cachedPublicSettings: settings }) }))
vi.mock('vue-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))

const row = {
  id: 1, request_id: 'req-1', model: '=SUM(1,2)', api_key: { name: '+formula-key' },
  created_at: '2026-10-12T10:00:00Z', input_tokens: 100, output_tokens: 10,
  cache_read_tokens: 800, cache_creation_tokens: 100, actual_cost: 0.1, total_cost: 0.2,
  rate_multiplier: 0.5, duration_ms: 1000, first_token_ms: 100, request_type: 'stream', stream: true,
}
const wrappers: VueWrapper[] = []
function render(component: typeof RequestLogsView | typeof UsageStatsView) {
  const wrapper = mount(component, { global: { stubs: {
    AppLayout: { template: '<main><slot /></main>' }, Select: true, Icon: true,
    RequestLogTable: true, RequestLogPagination: true, UserErrorRequestsTable: true,
    UsageStatsCards: true, ModelDistributionChart: true, GroupDistributionChart: true,
    EndpointDistributionChart: true, TokenUsageTrend: true,
  } } })
  wrappers.push(wrapper)
  return wrapper
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  delete window.__APP_CONFIG__
  settings.allow_user_view_error_requests = false
  settings.subscription_enabled = true
  api.query.mockReset().mockResolvedValue({ items: [row], total: 200, pages: 10 })
  api.getStats.mockReset().mockResolvedValue({ total_requests: 200, endpoints: [] })
  api.getDashboardModels.mockReset().mockResolvedValue({ models: [{ model: 'sample-model' }] })
  api.getDashboardSnapshotV2.mockReset().mockResolvedValue({ trend: [], groups: [] })
  api.listMyErrorRequests.mockReset().mockResolvedValue({ items: [], total: 0 })
  api.list.mockReset().mockResolvedValue({ items: [{ id: 1, name: 'key' }], pages: 1 })
  api.getAvailable.mockReset().mockResolvedValue([{ id: 2, name: 'group' }])
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('independent usage pages', () => {
  it('loads only request rows on the log page and keeps filters, sorting and pagination', async () => {
    api.list.mockResolvedValueOnce({ items: [{ id: 1, name: 'key' }], pages: 2 })
      .mockResolvedValueOnce({ items: [{ id: 3, name: 'second key' }], pages: 2 })
    const wrapper = render(RequestLogsView)
    await flushPromises()
    expect(api.query).toHaveBeenCalledOnce()
    expect(api.getStats).not.toHaveBeenCalled()
    expect(api.getDashboardModels).not.toHaveBeenCalled()
    expect(api.getDashboardSnapshotV2).not.toHaveBeenCalled()
    expect(wrapper.findComponent(UsageStatsCards).exists()).toBe(false)
    const filters = wrapper.getComponent(UsageFilters)
    const state = filters.props('state')
    expect(state.apiKeys.value.map(key => key.id)).toEqual([1, 3])
    expect(state.modelOptions.value.some(option => option.value === row.model)).toBe(true)
    const controls = filters.findAllComponents(Select)
    ;[3, 'typed-model', 2, 'stream'].forEach((value, index) => controls[index].vm.$emit('update:modelValue', value))
    controls[3].vm.$emit('change')
    await flushPromises()
    expect(api.query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, api_key_id: 3, group_id: 2, model: 'typed-model', stream: true }), expect.any(Object))
    wrapper.getComponent(RequestLogPagination).vm.$emit('update:page', 3)
    await flushPromises()
    expect(api.query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }), expect.any(Object))
    wrapper.getComponent(RequestLogTable).vm.$emit('sort', 'model', 'asc')
    await flushPromises()
    expect(api.query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, sort_by: 'model', sort_order: 'asc' }), expect.any(Object))
    wrapper.getComponent(RequestLogPagination).vm.$emit('update:pageSize', 50)
    await flushPromises()
    expect(api.query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, page_size: 50 }), expect.any(Object))
  })

  it('loads aggregate APIs on the stats page without querying request rows', async () => {
    const wrapper = render(UsageStatsView)
    await flushPromises()
    expect(api.query).not.toHaveBeenCalled()
    expect(api.listMyErrorRequests).not.toHaveBeenCalled()
    expect(api.getStats).toHaveBeenCalledOnce()
    expect(api.getDashboardModels).toHaveBeenCalledOnce()
    expect(api.getDashboardSnapshotV2).toHaveBeenCalledOnce()
    expect(wrapper.findComponent(RequestLogTable).exists()).toBe(false)
    const filters = wrapper.getComponent(UsageFilters)
    filters.props('state').filters.value = { group_id: 7 }
    filters.vm.$emit('change')
    await flushPromises()
    expect(api.getStats).toHaveBeenLastCalledWith(expect.objectContaining({ group_id: 7 }))
    expect(api.getDashboardSnapshotV2).toHaveBeenLastCalledWith(expect.objectContaining({ group_id: 7, include_trend: true, include_group_stats: true }))
  })

  it.each([RequestLogsView, UsageStatsView])('blocks queries for an invalid date range', async component => {
    const wrapper = render(component)
    await flushPromises()
    Object.values(api).forEach(mock => mock.mockClear())
    const dates = wrapper.findAll('input[type="date"]')
    await dates[0].setValue('2099-01-01')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('valid start and end date')
    expect(api.query).not.toHaveBeenCalled()
    expect(api.getStats).not.toHaveBeenCalled()
    expect(api.getDashboardModels).not.toHaveBeenCalled()
    expect(api.getDashboardSnapshotV2).not.toHaveBeenCalled()
  })

  it('ignores an aborted log response after a newer filter has completed', async () => {
    const first = deferred<{ items: typeof row[]; total: number }>()
    api.query.mockReturnValueOnce(first.promise)
    const wrapper = render(RequestLogsView)
    const signal = api.query.mock.calls[0][1].signal as AbortSignal
    wrapper.getComponent(UsageFilters).vm.$emit('change')
    await flushPromises()
    expect(signal.aborted).toBe(true)
    first.resolve({ items: [{ ...row, id: 99 }], total: 999 })
    await flushPromises()
    expect(wrapper.getComponent(RequestLogTable).props('data')[0].id).toBe(1)
    expect(wrapper.getComponent(RequestLogPagination).props('total')).toBe(200)
  })

  it('ignores stale aggregate responses after a newer filter has completed', async () => {
    const stats = deferred<{ total_requests: number }>()
    const models = deferred<{ models: { model: string }[] }>()
    api.getStats.mockReturnValueOnce(stats.promise)
    api.getDashboardModels.mockReturnValueOnce(models.promise)
    const wrapper = render(UsageStatsView)
    wrapper.getComponent(UsageFilters).vm.$emit('change')
    await flushPromises()
    stats.resolve({ total_requests: 999 })
    models.resolve({ models: [{ model: 'stale-model' }] })
    await flushPromises()
    expect(wrapper.getComponent(UsageStatsCards).props('stats')).toMatchObject({ total_requests: 200 })
    expect(wrapper.getComponent(ModelDistributionChart).props('modelStats')).toEqual([{ model: 'sample-model' }])
  })

  it('preserves column preferences and gates error requests with the public setting', async () => {
    const wrapper = render(RequestLogsView)
    await flushPromises()
    expect(wrapper.find('.mito-log-tabs').exists()).toBe(false)
    expect(api.listMyErrorRequests).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="usage-column-settings"]').trigger('click')
    await wrapper.get('[data-testid="usage-column-toggle-tps"]').setValue(false)
    expect(wrapper.getComponent(RequestLogTable).props('columns').some(column => column.key === 'tps')).toBe(false)
    expect(JSON.parse(localStorage.getItem('mito-request-log-hidden-columns')!)).toContain('tps')
    settings.allow_user_view_error_requests = true
    await flushPromises()
    await wrapper.findAll('.mito-log-tabs button')[1].trigger('click')
    await flushPromises()
    expect(api.listMyErrorRequests).toHaveBeenCalledOnce()
    expect(wrapper.findComponent(UserErrorRequestsTable).exists()).toBe(true)
    settings.allow_user_view_error_requests = false
    await flushPromises()
    expect(wrapper.findComponent(UserErrorRequestsTable).exists()).toBe(false)
    expect(wrapper.findComponent(RequestLogTable).exists()).toBe(true)
  })

  it('exports all pages with CSV formula escaping and a fixed query snapshot', async () => {
    const createUrl = vi.fn<(blob: Blob) => string>(() => 'blob:csv')
    const revoke = vi.fn()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(blob: Blob | MediaSource) { return createUrl(blob as Blob) }
      static revokeObjectURL(url: string) { revoke(url) }
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = render(RequestLogsView)
    await flushPromises()
    const button = wrapper.findAll('button').find(button => button.text() === 'usage.exportCsv')!
    await button.trigger('click')
    await flushPromises()
    expect(api.query.mock.calls.slice(1).map(call => call[0].page)).toEqual([1, 2])
    const blob = createUrl.mock.calls[0][0] as Blob
    const csv = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(blob)
    })
    expect(csv).toContain('"\'=SUM(1,2)"')
    expect(csv).toContain('"\'+formula-key"')
    expect(revoke).toHaveBeenCalledWith('blob:csv')
  })
})
