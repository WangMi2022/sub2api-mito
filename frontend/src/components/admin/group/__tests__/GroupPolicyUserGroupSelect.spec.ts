import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { UserGroup } from '@/types'
import GroupPolicyUserGroupSelect from '../GroupPolicyUserGroupSelect.vue'

const mocks = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/api/admin', () => ({ adminAPI: { userGroups: { list: mocks.list } } }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
beforeEach(() => { vi.resetAllMocks() })

const group = (id: number, extra: Partial<UserGroup> = {}): UserGroup => ({
  id, name: `Group ${id}`, code: `code-${id}`, member_count: id,
  is_system: false, status: 'active', description: '', created_at: '', updated_at: '', ...extra
})

function mountSelector(configuredIds: number[] = [], modelValue: UserGroup | null = null) {
  return mount(GroupPolicyUserGroupSelect, {
    props: { modelValue, configuredIds },
    global: { stubs: { teleport: true, Icon: true } }
  })
}

describe('GroupPolicyUserGroupSelect', () => {
  it('shows all existing groups without typing or a ten-result limit', async () => {
    mocks.list.mockResolvedValue(Array.from({ length: 15 }, (_, index) => group(index + 1, { is_system: index === 0 })))
    const wrapper = mountSelector()
    await flushPromises()
    await wrapper.get('.select-trigger').trigger('click')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(15)
    expect(wrapper.get('[role="option"]').text()).toContain('admin.userGroups.systemBadge')
    expect(wrapper.findAll('[role="option"]').at(-1)!.text()).toContain('Group 15')
    expect(mocks.list).toHaveBeenCalledOnce()
  })

  it('searches names and codes locally and selects with the keyboard', async () => {
    const vip = group(9, { name: 'VIP', code: 'enterprise' })
    mocks.list.mockResolvedValue([group(1), vip])
    const wrapper = mountSelector()
    await flushPromises()
    await wrapper.get('.select-trigger').trigger('click')
    const search = wrapper.get('.select-search-input')
    await search.setValue('ENTERPRISE')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
    await search.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([[vip]])
    expect(mocks.list).toHaveBeenCalledOnce()
  })

  it('marks configured and disabled groups and makes removed policies selectable again', async () => {
    mocks.list.mockResolvedValue([group(1), group(2, { status: 'disabled' }), group(3)])
    const wrapper = mountSelector([1])
    await flushPromises()
    await wrapper.get('.select-trigger').trigger('click')
    const options = wrapper.findAll('[role="option"]')
    expect(options[0].text()).toContain('admin.groups.userGroupAlreadyConfigured')
    expect(options[0].attributes('aria-disabled')).toBe('true')
    expect(options[1].attributes('aria-disabled')).toBe('true')
    await options[0].trigger('click')
    await options[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ configuredIds: [] })
    await wrapper.findAll('[role="option"]')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(group(1))
  })

  it('shows request failure and recovers with retry', async () => {
    let reject!: (error: Error) => void
    mocks.list.mockReturnValueOnce(new Promise((_, fail) => { reject = fail })).mockResolvedValueOnce([group(5)])
    const wrapper = mountSelector()
    await wrapper.get('.select-trigger').trigger('click')
    expect(wrapper.get('.select-empty').text()).toBe('common.loading')
    reject(new Error('offline'))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('admin.userGroups.failedToLoad')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[role="option"]').text()).toContain('Group 5')
  })

  it('clears a selected group and disables selection while its policy is loading', async () => {
    const selected = group(4)
    mocks.list.mockResolvedValue([selected])
    const wrapper = mountSelector([], selected)
    await flushPromises()
    expect(wrapper.get('.select-trigger').text()).toContain(selected.name)
    await wrapper.get('.select-clear').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
    await wrapper.setProps({ disabled: true })
    await wrapper.get('.select-trigger').trigger('click')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('loads a fresh list on remount and ignores a late response from the old instance', async () => {
    let resolveOld!: (groups: UserGroup[]) => void
    mocks.list.mockReturnValueOnce(new Promise<UserGroup[]>(resolve => { resolveOld = resolve })).mockResolvedValueOnce([group(7)])
    const previous = mountSelector()
    previous.unmount()
    const current = mountSelector()
    await flushPromises()
    resolveOld([group(1)])
    await flushPromises()
    await current.get('.select-trigger').trigger('click')
    expect(current.get('[role="option"]').text()).toContain('Group 7')
    expect(current.findAll('[role="option"]')).toHaveLength(1)
  })
})
