import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GroupRPMOverridesModal from '../GroupRPMOverridesModal.vue'
import GroupRateMultipliersModal from '../GroupRateMultipliersModal.vue'
import type { AdminGroup, UserGroup } from '@/types'

const mocks = vi.hoisted(() => ({ list: vi.fn(), getGroupUserGroupPolicies: vi.fn() }))
vi.mock('@/api/admin', () => ({ adminAPI: { userGroups: { list: mocks.list }, groups: mocks } }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showError: vi.fn() }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  mocks.list.mockResolvedValue([])
  mocks.getGroupUserGroupPolicies.mockResolvedValue([])
})
afterEach(() => { vi.restoreAllMocks() })

describe.each([GroupRPMOverridesModal, GroupRateMultipliersModal])('group modal lifecycle', (component) => {
  function open(show = true) {
    return mount(component, {
      props: { show, group: { id: 1, name: 'Group', platform: 'openai' } as AdminGroup },
      global: { stubs: {
        BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
        Icon: true, PlatformIcon: true, Pagination: true
      } }
    })
  }

  it('removes the shared select document listener on unmount', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const wrapper = open()
    await flushPromises()
    const handlers = add.mock.calls.filter(([event]) => event === 'click').map(([, handler]) => handler)
    expect(handlers.length).toBeGreaterThan(0)
    wrapper.unmount()
    for (const handler of handlers) expect(remove).toHaveBeenCalledWith('click', handler)
  })

  it('removes a teleported menu and ignores a pending list when navigating away', async () => {
    let resolve!: (groups: UserGroup[]) => void
    mocks.list.mockReturnValue(new Promise<UserGroup[]>(done => { resolve = done }))
    const wrapper = open()
    await flushPromises()
    await wrapper.get('.select-trigger').trigger('click')
    expect(document.querySelector('.select-dropdown-portal')).not.toBeNull()
    wrapper.unmount()
    resolve([])
    await flushPromises()
    expect(document.querySelector('.select-dropdown-portal')).toBeNull()
    expect(mocks.list).toHaveBeenCalledOnce()
  })

  it('loads groups only while open and refreshes them after reopening', async () => {
    const wrapper = open(false)
    await flushPromises()
    expect(mocks.list).not.toHaveBeenCalled()
    await wrapper.setProps({ show: true })
    await flushPromises()
    expect(mocks.list).toHaveBeenCalledOnce()
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true })
    await flushPromises()
    expect(mocks.list).toHaveBeenCalledTimes(2)
  })
})
