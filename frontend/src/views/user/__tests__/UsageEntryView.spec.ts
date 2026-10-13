import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import UsageEntryView from '../UsageEntryView.vue'

const state = vi.hoisted(() => ({ isObserver: false, theme: true }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => state }))
vi.mock('@/themes/mito', () => ({ get isMitoTheme() { return state.theme } }))
vi.mock('@/views/admin/UsageView.vue', () => ({ __esModule: true, default: { props: { observerMode: Boolean }, template: '<div data-test="management">{{ observerMode }}</div>' } }))
vi.mock('@/views/user/UsageView.vue', () => ({ __esModule: true, default: { template: '<div data-test="personal" />' } }))
vi.mock('@/themes/mito/RequestLogsView.vue', () => ({ __esModule: true, default: { template: '<div data-test="request-logs" />' } }))

it.each([
  { observer: false, theme: false, target: 'personal' },
  { observer: false, theme: true, target: 'request-logs' },
  { observer: true, theme: false, target: 'management' },
  { observer: true, theme: true, target: 'management' },
])('selects $target (observer=$observer, theme=$theme)', async ({ observer, theme, target }) => {
  state.isObserver = observer
  state.theme = theme
  const wrapper = mount(UsageEntryView)
  await vi.dynamicImportSettled()
  await flushPromises()
  expect(wrapper.find('[data-test="' + target + '"]').exists()).toBe(true)
  if (observer) expect(wrapper.text()).toBe('true')
  wrapper.unmount()
})
