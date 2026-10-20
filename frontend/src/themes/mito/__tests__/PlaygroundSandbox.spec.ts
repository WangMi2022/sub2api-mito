import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { getModelPlaza, type ModelPlazaGroup, type ModelPlazaResponse } from '@/api/modelPlaza'
import PlaygroundSandbox from '../PlaygroundSandbox.vue'

vi.mock('@/api/modelPlaza', () => ({ getModelPlaza: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function catalog(): ModelPlazaResponse {
  const group: ModelPlazaGroup = {
    id: 1, name: 'Demo group', description: '', platform: 'openai',
    subscription_type: 'standard', rate_multiplier: 1,
    peak_rate_enabled: false, peak_start: '', peak_end: '', peak_rate_multiplier: 1,
    is_exclusive: false, image_rate_independent: false, image_rate_multiplier: 1,
    video_rate_independent: false, video_rate_multiplier: 1, long_context_pricing_enabled: false,
    models: ['deepseek-chat', 'kimi-k2'].map(name => ({
      name, platform: 'openai', official_pricing: null,
      pricing: {
        billing_mode: 'token', input_price: 1e-6, output_price: 2e-6,
        cache_read_price: null, cache_write_price: null, cache_write_1h_price: null,
        per_request_price: null, image_input_price: null, image_output_price: null, intervals: []
      }
    }))
  }
  return { description: '', groups: [group] }
}

let wrapper: VueWrapper | undefined
async function renderSandbox() {
  wrapper = mount(PlaygroundSandbox, { global: { stubs: { ModelIcon: true, Icon: true } } })
  await flushPromises()
  return wrapper
}

function response(view: VueWrapper) {
  return JSON.parse(view.get('.mito-console-json').text())
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
  vi.mocked(getModelPlaza).mockResolvedValue(catalog())
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('Homepage API sandbox', () => {
  it('shows a complete preview without starting a simulated request', async () => {
    const view = await renderSandbox()
    expect(response(view)).toMatchObject({
      id: 'chatcmpl-preview', status: 'preview', endpoint: '/v1/chat/completions',
      model: 'deepseek-chat', tokens: '1200 in / 800 out', cost: '$0.0028'
    })
    expect(view.get('.mito-console-foot b').attributes('data-state')).toBe('preview')
    expect(view.get('.mito-console-foot b').text()).toBe('home.mito.playground.statePreview')
    expect(view.find('.mito-console-placeholder').exists()).toBe(false)
    expect(view.find('.mito-console-caret').exists()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    expect(getModelPlaza).toHaveBeenCalledTimes(1)
  })

  it('keeps the preview aligned with endpoint, model, tokens and estimate', async () => {
    const view = await renderSandbox()
    await view.get('.mito-select-trigger').trigger('click')
    await view.findAll('.mito-select-option')[1].trigger('click')
    await view.get('.mito-select-trigger.is-model').trigger('click')
    await view.findAll('.mito-select-option')[1].trigger('click')
    await view.findAll('input[type="range"]')[0].setValue('2000')
    await view.findAll('input[type="range"]')[1].setValue('1000')
    expect(response(view)).toMatchObject({
      status: 'preview', endpoint: '/v1/responses', model: 'kimi-k2',
      route: 'ADAPTIVE / Demo group / kimi-k2', tokens: '2000 in / 1000 out', cost: '$0.0040'
    })
    expect(view.get('.mito-estimate dd').text()).toBe(response(view).cost)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('streams only on click, locks parameters and restores preview after an edit', async () => {
    const view = await renderSandbox()
    await view.get('.mito-run').trigger('click')
    expect(view.get('.mito-console-foot b').attributes('data-state')).toBe('busy')
    expect(view.get('.mito-console-body').attributes('aria-busy')).toBe('true')
    expect(response(view).status).toBe('preview')
    for (const control of view.findAll('.mito-select-trigger, input[type="range"], .mito-run')) {
      expect(control.attributes('disabled')).toBeDefined()
    }
    await vi.advanceTimersByTimeAsync(328)
    expect(view.find('.mito-console-caret').exists()).toBe(true)
    await vi.runAllTimersAsync()
    expect(response(view)).toMatchObject({ status: 'ok', model: 'deepseek-chat', cost: '$0.0028' })
    expect(view.get('.mito-console-foot b').attributes('data-state')).toBe('ok')
    expect(view.get('.mito-console-body').attributes('aria-busy')).toBe('false')
    expect(view.find('.mito-console-caret').exists()).toBe(false)
    await view.findAll('input[type="range"]')[0].setValue('2000')
    expect(response(view)).toMatchObject({ status: 'preview', tokens: '2000 in / 800 out', cost: '$0.0036' })
    expect(view.get('.mito-console-foot b').attributes('data-state')).toBe('preview')
  })

  it('shows the complete result immediately when reduced motion is requested', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    const view = await renderSandbox()
    await view.get('.mito-run').trigger('click')
    expect(response(view).status).toBe('ok')
    expect(view.get('.mito-run').attributes('disabled')).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('escapes catalog content in the initial highlighted response', async () => {
    const data = catalog()
    data.groups[0].name = '<img src=x onerror="alert(1)">'
    vi.mocked(getModelPlaza).mockResolvedValue(data)
    const view = await renderSandbox()
    expect(response(view).route).toContain(data.groups[0].name)
    expect(view.find('.mito-console-json img').exists()).toBe(false)
    expect(view.get('.mito-console-json').html()).toContain('&lt;img')
  })

  it('cleans up both waiting and streaming timers when unmounted', async () => {
    const view = await renderSandbox()
    await view.get('.mito-run').trigger('click')
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    view.unmount()
    wrapper = undefined
    expect(vi.getTimerCount()).toBe(0)

    const streamingView = await renderSandbox()
    await streamingView.get('.mito-run').trigger('click')
    await vi.advanceTimersByTimeAsync(328)
    expect(streamingView.find('.mito-console-caret').exists()).toBe(true)
    streamingView.unmount()
    wrapper = undefined
    expect(vi.getTimerCount()).toBe(0)
  })
})
