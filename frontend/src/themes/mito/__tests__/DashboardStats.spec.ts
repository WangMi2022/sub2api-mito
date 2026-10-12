import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import type { UserDashboardStats } from '@/api/usage'
import DashboardStats from '../DashboardStats.vue'

const stats: UserDashboardStats = {
  total_api_keys: 1,
  active_api_keys: 1,
  total_requests: 0,
  total_input_tokens: 100000,
  total_output_tokens: 0,
  total_cache_creation_tokens: 12500,
  total_cache_read_tokens: 37500,
  total_tokens: 100000,
  total_cost: 0,
  total_actual_cost: 0,
  today_requests: 0,
  today_input_tokens: 4000,
  today_output_tokens: 0,
  today_cache_creation_tokens: 500,
  today_cache_read_tokens: 1500,
  today_tokens: 4000,
  today_cost: 0,
  today_actual_cost: 0,
  average_duration_ms: 0,
  rpm: 0,
  tpm: 0,
  by_platform: [],
}

describe('Mito 仪表盘缓存统计', () => {
  it.each([
    { locale: 'zh', today: '今日缓存 Tokens', total: '累计缓存 Tokens' },
    { locale: 'en', today: 'Cache tokens (today)', total: 'Cache tokens (all time)' },
  ])('$locale 同时显示今日和累计缓存，并明确区分统计周期', ({ locale, today, total }) => {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: { zh: {}, en: {} },
      missingWarn: false,
      fallbackWarn: false,
    })
    const wrapper = mount(DashboardStats, {
      props: { stats, balance: 0, isSimple: false },
      global: { plugins: [i18n], stubs: { Icon: true } },
    })

    expect(wrapper.text()).toContain(`${today} 2.0K`)
    expect(wrapper.text()).toContain(`${total} 50.0K`)
    wrapper.unmount()
  })
})
