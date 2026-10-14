import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AdminGroup } from '@/types'
import GroupRateMultipliersModal from '../GroupRateMultipliersModal.vue'

const mocks = vi.hoisted(() => ({
  getGroupUserGroupPolicies: vi.fn(),
  batchSetGroupUserGroupRates: vi.fn(),
  showError: vi.fn()
}))
vi.mock('@/api/admin', () => ({ adminAPI: { groups: mocks, userGroups: { list: vi.fn() } } }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showError: mocks.showError, showSuccess: vi.fn() }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
beforeEach(() => vi.resetAllMocks())
afterEach(() => vi.restoreAllMocks())

function deferred() {
  let resolve!: (value: unknown) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const group = (id: number) => ({ id, name: `Group ${id}`, platform: 'openai', rate_multiplier: 1 } as AdminGroup)
const entries = (id: number) => [{
  user_group_id: id,
  user_group_name: `UG ${id}`,
  user_group_code: `ug${id}`,
  is_system: false,
  member_count: 2,
  rate_multiplier: 2,
  rpm_override: null,
  denied_models: null
}]

async function openGroup() {
  const wrapper = mount(GroupRateMultipliersModal, {
    props: { show: false, group: group(1) },
    global: { stubs: {
      BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
      Icon: true, PlatformIcon: true, Pagination: true
    } }
  })
  await wrapper.setProps({ show: true })
  return wrapper
}

describe('group rate multiplier request ownership', () => {
  it('keeps the reopened group data when an older response finishes last', async () => {
    const old = deferred()
    mocks.getGroupUserGroupPolicies.mockReturnValueOnce(old.promise).mockResolvedValueOnce(entries(2))
    const wrapper = await openGroup()
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true, group: group(2) })
    await flushPromises()
    old.resolve(entries(1))
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('UG 2')
    expect(wrapper.get('tbody').text()).not.toContain('UG 1')
    await wrapper.get('tbody input[type="number"]').setValue('3')
    await wrapper.findAll('button').find(button => button.text() === 'common.save')!.trigger('click')
    expect(mocks.batchSetGroupUserGroupRates).toHaveBeenCalledWith(2, [{ user_group_id: 2, rate_multiplier: 3 }])
  })

  it('does not end the new load or report an error when an old request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const old = deferred()
    const current = deferred()
    mocks.getGroupUserGroupPolicies.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = await openGroup()
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true, group: group(2) })
    old.reject(new Error('old request failed'))
    await flushPromises()
    expect(mocks.showError).not.toHaveBeenCalled()
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
    current.resolve(entries(2))
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('UG 2')
  })

  it('loads a different group while the dialog remains open', async () => {
    mocks.getGroupUserGroupPolicies.mockResolvedValueOnce(entries(1)).mockResolvedValueOnce(entries(2))
    const wrapper = await openGroup()
    await flushPromises()
    await wrapper.setProps({ group: group(2) })
    await flushPromises()
    expect(mocks.getGroupUserGroupPolicies).toHaveBeenLastCalledWith(2)
    expect(wrapper.get('tbody').text()).toContain('UG 2')
  })

  it('discards the previous group draft before loading the next group', async () => {
    mocks.getGroupUserGroupPolicies.mockResolvedValueOnce(entries(1)).mockReturnValueOnce(deferred().promise)
    const wrapper = await openGroup()
    await flushPromises()
    await wrapper.get('tbody input[type="number"]').setValue('3')
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true, group: group(2) })
    expect(wrapper.findAll('button').some(button => button.text() === 'common.save')).toBe(false)
  })

  it('ignores a request failure after unmounting', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const request = deferred()
    mocks.getGroupUserGroupPolicies.mockReturnValue(request.promise)
    const wrapper = await openGroup()
    wrapper.unmount()
    request.reject(new Error('offline'))
    await flushPromises()
    expect(mocks.showError).not.toHaveBeenCalled()
  })
})
