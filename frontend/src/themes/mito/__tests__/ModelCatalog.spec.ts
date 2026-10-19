import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import type { UserPricingInterval } from '@/api/channels'
import PlazaModelPricingTable from '@/components/modelPlaza/PlazaModelPricingTable.vue'
import ModelCatalogCard from '../ModelCatalogCard.vue'
import ModelCatalog from '../ModelCatalog.vue'
import PlazaHomeLink from '../PlazaHomeLink.vue'
import { catalogCategory, catalogSections } from '../modelCatalog'

vi.mock('vue-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key })
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ cachedPublicSettings: null }) }))

function model(): PlazaModel {
  return {
    name: 'deepseek-v4-flash', platform: 'openai',
    pricing: {
      billing_mode: 'token', input_price: 3e-6, output_price: 9e-6,
      cache_read_price: 3e-7, cache_write_price: 3.75e-6, cache_write_1h_price: 6e-6,
      per_request_price: null, image_input_price: null, image_output_price: null, intervals: []
    },
    official_pricing: { input_price: 3e-6, output_price: 9e-6, cache_read_price: 3e-7, cache_write_price: null }
  }
}
function group(overrides: Partial<ModelPlazaGroup> = {}): ModelPlazaGroup {
  return {
    id: 1, name: 'Public group', description: '', platform: 'openai',
    subscription_type: 'standard', rate_multiplier: 0.5, user_rate_multiplier: 0.25,
    peak_rate_enabled: false, peak_start: '', peak_end: '', peak_rate_multiplier: 1,
    is_exclusive: false, image_rate_independent: false, image_rate_multiplier: 1,
    video_rate_independent: false, video_rate_multiplier: 1,
    long_context_pricing_enabled: true, models: [model()], ...overrides
  }
}
function interval(overrides: Partial<UserPricingInterval> = {}): UserPricingInterval {
  return {
    min_tokens: 0, max_tokens: 200000, input_price: null, output_price: null,
    cache_read_price: null, cache_write_price: null, per_request_price: null, ...overrides
  }
}

describe('Model catalog pricing parity with the existing plaza table', () => {
  const scenarios: Array<{ name: string; setup: (m: PlazaModel, g: ModelPlazaGroup) => void; expected: string[] }> = [
    { name: 'personal rates and both cache durations', setup: () => {}, expected: ['$0.75', '$2.25', '$0.075', '$0.9375', '$1.50'] },
    { name: 'explicit zero personal rate', setup: (_m, g) => { g.user_rate_multiplier = 0 }, expected: ['$0.00'] },
    { name: 'relative tiers and explicit price overrides', setup: m => {
      m.pricing!.intervals = [interval({ min_tokens: 200000, max_tokens: null, input_multiplier: 2, output_price: 18e-6 }), interval()]
    }, expected: ['$0.75', '$2.25', '$1.50', '$4.50'] },
    { name: 'image independent multiplier', setup: (m, g) => {
      m.pricing!.billing_mode = 'image'; m.pricing!.per_request_price = 2
      g.image_rate_independent = true; g.image_rate_multiplier = 0.4
    }, expected: ['$0.80'] },
    { name: 'video independent zero multiplier', setup: (m, g) => {
      m.pricing!.billing_mode = 'video'; m.pricing!.per_request_price = 2
      g.video_rate_independent = true; g.video_rate_multiplier = 0
    }, expected: ['$0.00'] },
    { name: 'video negative rate clamped at zero', setup: (m, g) => {
      m.pricing!.billing_mode = 'video'; m.pricing!.per_request_price = 2
      g.video_rate_independent = true; g.video_rate_multiplier = -1
    }, expected: ['$0.00'] },
    { name: 'request tiers without token conversion', setup: m => {
      m.pricing!.billing_mode = 'per_request'
      m.pricing!.intervals = [interval({ tier_label: 'HD', per_request_price: 2 }), interval({ tier_label: '4K', per_request_price: 4 })]
    }, expected: ['$0.50', '$1.00'] },
    { name: 'standard price independent of time and peak rules', setup: (m, g) => {
      m.time_pricing = { timezone: 'Asia/Shanghai', weekdays_only: true, periods: [{ start_time: '08:00', end_time: '12:00', multiplier: 2 }] }
      m.pricing!.reasoning_effort_multipliers = { high: 3 }
      g.peak_rate_enabled = true; g.peak_start = '10:00'; g.peak_end = '11:00'; g.peak_rate_multiplier = 1.5
    }, expected: ['$0.75', '$2.25'] }
  ]
  it.each(scenarios)('$name', ({ setup, expected }) => {
    const m = model(), g = group()
    setup(m, g)
    const card = mount(ModelCatalogCard, { props: { model: m, group: g } })
    const table = mount(PlazaModelPricingTable, { props: {
      models: [m], rateMultiplier: g.rate_multiplier, userRateMultiplier: g.user_rate_multiplier,
      imageRateIndependent: g.image_rate_independent, imageRateMultiplier: g.image_rate_multiplier,
      videoRateIndependent: g.video_rate_independent, videoRateMultiplier: g.video_rate_multiplier
    } })
    const cardPrices = card.get('.mito-model-price-panel').text()
    const tablePrices = table.get('tbody tr').findAll('.pz-cell').map(cell => cell.text()).join(' ')
    for (const price of expected) {
      expect(cardPrices).toContain(price)
      expect(tablePrices).toContain(price)
    }
    if (m.time_pricing) expect(card.find('.mito-model-pricing-note').exists()).toBe(true)
    if (g.image_rate_independent || g.video_rate_independent) expect(card.find('del').exists()).toBe(false)
    card.unmount(); table.unmount()
  })

  it('distinguishes missing prices from a zero price and never substitutes the official reference', () => {
    const m = model()
    m.pricing = null
    const card = mount(ModelCatalogCard, { props: { model: m, group: group() } })
    expect(card.get('.mito-model-price-panel').text()).toBe('modelPlaza.detail.noPricing')
    expect(card.get('.mito-model-price-panel').text()).not.toContain('$')
    card.unmount()
  })
})

describe('Model catalog visibility and details', () => {
  it('provides an explicit home link without relying on browser history', () => {
    const wrapper = mount(PlazaHomeLink, { global: {
      stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }
    } })
    expect(wrapper.get('a').attributes('href')).toBe('/home')
    expect(wrapper.get('a').text()).toBe('modelPlaza.nav.home')
    wrapper.unmount()
  })

  it('keeps different group offers and unknown models without changing source data', () => {
    const g1 = group(), g2 = group({ id: 2, name: 'Exclusive group', rate_multiplier: 3, is_exclusive: true })
    const unknown = { ...model(), name: 'custom-private-model' }
    g2.models.push(unknown)
    const original = JSON.stringify([g1, g2])
    const sections = catalogSections([g1, g2])
    expect(sections.flatMap(section => section.entries)).toHaveLength(3)
    expect(new Set(sections.flatMap(section => section.entries.map(entry => entry.key))).size).toBe(3)
    expect(catalogCategory(unknown)).toBe('other')
    expect(JSON.stringify([g1, g2])).toBe(original)
  })

  it.each([
    ['bge-reranker-v2-m3', 'rerank'], ['Qwen/Qwen3-Embedding-8B', 'embedding'],
    ['bge-m3', 'embedding'], ['deepseek-v4-flash', 'language'], ['custom-model', 'other']
  ])('classifies %s as %s', (name, expected) => {
    expect(catalogCategory({ ...model(), name })).toBe(expected)
  })

  it('passes the complete selected group/model into the existing details and closes a filtered-out offer', async () => {
    const g = group({ peak_rate_enabled: true, peak_start: '10:00', peak_end: '12:00', peak_rate_multiplier: 2 })
    const wrapper = mount(ModelCatalog, { props: { groups: [g, group({ id: 2, models: [] })] }, global: {
      stubs: { BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' }, PlazaGroupSection: true }
    } })
    expect(wrapper.find('.mito-catalog-empty-group').exists()).toBe(true)
    await wrapper.get('.mito-model-details-button').trigger('click')
    expect(wrapper.getComponent({ name: 'PlazaGroupSection' }).props('group')).toEqual(g)
    await wrapper.setProps({ groups: [] })
    expect(wrapper.findComponent({ name: 'PlazaGroupSection' }).exists()).toBe(false)
    await wrapper.setProps({ groups: [g] })
    expect(wrapper.findComponent({ name: 'PlazaGroupSection' }).exists()).toBe(false)
    wrapper.unmount()
  })
})
