import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { UserGroup } from '@/types'
import AssignUserGroupPicker from '../AssignUserGroupPicker.vue'

const mocks = vi.hoisted(() => ({ list: vi.fn(), listMembers: vi.fn() }))
vi.mock('@/api/admin', () => ({
  userGroupsAPI: { list: mocks.list, listMembers: mocks.listMembers }
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
beforeEach(() => { vi.resetAllMocks() })

const group = (id: number, extra: Partial<UserGroup> = {}): UserGroup => ({
  id, name: `Group ${id}`, code: `code-${id}`, member_count: id,
  is_system: false, status: 'active', description: '', created_at: '', updated_at: '', ...extra
})

function mountPicker(modelValue: Array<{ id: number; name: string; memberIds: number[] }> = []) {
  return mount(AssignUserGroupPicker, {
    props: { modelValue },
    global: { stubs: { teleport: true, Icon: true } }
  })
}

describe('AssignUserGroupPicker', () => {
  it('lists user groups on mount', async () => {
    mocks.list.mockResolvedValue([group(1), group(2)])
    const wrapper = mountPicker()
    await flushPromises()
    expect(mocks.list).toHaveBeenCalledOnce()
    await wrapper.get('.select-trigger').trigger('click')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(2)
  })

  it('expands the selected group into member ids', async () => {
    mocks.list.mockResolvedValue([group(1, { name: 'Ops' }), group(2)])
    mocks.listMembers.mockResolvedValue([11, 22, 33])
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.get('.select-trigger').trigger('click')
    await wrapper.findAll('[role="option"]')[0].trigger('click')
    await flushPromises()

    // Select emits (value, option); the picker must read the id from the value.
    expect(mocks.listMembers).toHaveBeenCalledWith(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [[{ id: 1, name: 'Ops', memberIds: [11, 22, 33] }]]
    ])
  })

  it('disables groups that are already selected', async () => {
    mocks.list.mockResolvedValue([group(1), group(2)])
    const wrapper = mountPicker([{ id: 1, name: 'Group 1', memberIds: [11] }])
    await flushPromises()
    await wrapper.get('.select-trigger').trigger('click')
    expect(wrapper.findAll('[role="option"]')[0].attributes('aria-disabled')).toBe('true')
    expect(wrapper.findAll('[role="option"]')[1].attributes('aria-disabled')).toBe('false')
  })

  it('emits the remaining groups when one is removed', async () => {
    mocks.list.mockResolvedValue([group(1), group(2)])
    const wrapper = mountPicker([
      { id: 1, name: 'Group 1', memberIds: [11] },
      { id: 2, name: 'Group 2', memberIds: [22] }
    ])
    await flushPromises()
    const removeButtons = wrapper.findAll('[data-testid="assign-user-group-selected"] button')
    await removeButtons[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [[{ id: 2, name: 'Group 2', memberIds: [22] }]]
    ])
  })

  it('keeps the selection unchanged when loading a group fails', async () => {
    mocks.list.mockResolvedValue([group(1)])
    mocks.listMembers.mockRejectedValue(new Error('boom'))
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.get('.select-trigger').trigger('click')
    await wrapper.findAll('[role="option"]')[0].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('admin.subscriptions.assignTarget.loadFailed')
    warn.mockRestore()
  })
})
