import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AdminGroup } from '@/types'
import GroupRPMOverridesModal from '../GroupRPMOverridesModal.vue'

const mocks = vi.hoisted(() => ({
  getGroupUserGroupPolicies: vi.fn(),
  batchSetGroupUserGroupRPM: vi.fn()
}))
vi.mock('@/api/admin', () => ({
  adminAPI: {
    userGroups: { list: vi.fn() },
    groups: {
      getGroupUserGroupPolicies: mocks.getGroupUserGroupPolicies,
      batchSetGroupUserGroupRPM: mocks.batchSetGroupUserGroupRPM
    }
  }
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getGroupUserGroupPolicies.mockResolvedValue([
    {
      user_group_id: 7,
      user_group_name: 'VIP',
      user_group_code: 'vip',
      is_system: false,
      member_count: 3,
      rate_multiplier: null,
      rpm_override: 100,
      denied_models: null
    }
  ])
})

async function openEditor() {
  const wrapper = mount(GroupRPMOverridesModal, {
    props: { show: false, group: { id: 1, name: 'Group', platform: 'openai' } as AdminGroup },
    global: { stubs: {
      BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
      Icon: true, PlatformIcon: true, Pagination: true
    } }
  })
  await wrapper.setProps({ show: true })
  await flushPromises()
  return wrapper
}

describe('existing RPM override edits', () => {
  it.each(['', '1.5', '-1'])('does not save invalid RPM %j', async (value) => {
    const wrapper = await openEditor()
    await wrapper.get('tbody input[type="number"]').setValue(value)
    expect(wrapper.findAll('button').some(button => button.text() === 'common.save')).toBe(false)
    expect(mocks.batchSetGroupUserGroupRPM).not.toHaveBeenCalled()
  })

  it.each([['0', 0], ['200', 200], ['1e3', 1000]])('saves %s as %i', async (input, expected) => {
    const wrapper = await openEditor()
    await wrapper.get('tbody input[type="number"]').setValue(input)
    await wrapper.findAll('button').find(button => button.text() === 'common.save')!.trigger('click')
    await flushPromises()
    expect(mocks.batchSetGroupUserGroupRPM).toHaveBeenCalledWith(1, [{ user_group_id: 7, rpm_override: expected }])
  })
})
