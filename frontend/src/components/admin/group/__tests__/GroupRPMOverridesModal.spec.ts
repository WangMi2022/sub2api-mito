import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AdminGroup } from '@/types'
import GroupRPMOverridesModal from '../GroupRPMOverridesModal.vue'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  getGroupUserGroupPolicies: vi.fn(),
  batchSetGroupUserGroupRPM: vi.fn()
}))
vi.mock('@/api/admin', () => ({
  adminAPI: {
    userGroups: { list: mocks.list },
    groups: {
      getGroupUserGroupPolicies: mocks.getGroupUserGroupPolicies,
      batchSetGroupUserGroupRPM: mocks.batchSetGroupUserGroupRPM
    }
  }
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mocks.getGroupUserGroupPolicies.mockResolvedValue([])
  mocks.list.mockResolvedValue([{ id: 7, name: 'VIP', code: 'vip', is_system: false, member_count: 3 }])
  mocks.batchSetGroupUserGroupRPM.mockResolvedValue(undefined)
})

async function selectUserGroup() {
  const wrapper = mount(GroupRPMOverridesModal, {
    props: { show: false, group: { id: 1, name: 'Group', platform: 'openai' } as AdminGroup },
    global: { stubs: {
      BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
      Icon: true, PlatformIcon: true, Pagination: true, teleport: true
    } }
  })
  await wrapper.setProps({ show: true })
  await flushPromises()
  await wrapper.get('.select-trigger').trigger('click')
  expect(wrapper.findAll('.select-option').map(option => option.text()).join(' ')).toContain('VIP')
  await wrapper.get('.select-option').trigger('click')
  return wrapper
}

describe('GroupRPMOverridesModal new user group override validation', () => {
  it.each(['', '1.5', '-1'])('does not add invalid RPM %j', async (value) => {
    const wrapper = await selectUserGroup()
    const input = wrapper.get('input[placeholder="100"]')
    await input.setValue('100')
    await input.setValue(value)
    const add = wrapper.findAll('button').find(b => b.text() === 'common.add')!
    expect(add.attributes('disabled')).toBeDefined()
    await add.trigger('click')
    expect(wrapper.find('tbody tr').exists()).toBe(false)
    expect(mocks.batchSetGroupUserGroupRPM).not.toHaveBeenCalled()
  })

  it.each([0, 100])('saves integer RPM %i including unlimited zero', async (value) => {
    const wrapper = await selectUserGroup()
    await wrapper.get('input[placeholder="100"]').setValue(String(value))
    await wrapper.findAll('button').find(b => b.text() === 'common.add')!.trigger('click')
    await wrapper.findAll('button').find(b => b.text() === 'common.save')!.trigger('click')
    await flushPromises()
    expect(mocks.batchSetGroupUserGroupRPM).toHaveBeenCalledWith(1, [{ user_group_id: 7, rpm_override: value }])
  })
})
