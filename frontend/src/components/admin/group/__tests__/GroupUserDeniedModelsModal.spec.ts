import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AdminGroup } from '@/types'
import GroupUserDeniedModelsModal from '../GroupUserDeniedModelsModal.vue'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  getGroupUserGroupPolicies: vi.fn(),
  batchSetGroupUserGroupDeniedModels: vi.fn(),
  getModelAllowlistCandidates: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn()
}))
vi.mock('@/api/admin', () => ({
  adminAPI: {
    userGroups: { list: mocks.list },
    groups: {
      getGroupUserGroupPolicies: mocks.getGroupUserGroupPolicies,
      batchSetGroupUserGroupDeniedModels: mocks.batchSetGroupUserGroupDeniedModels,
      getModelAllowlistCandidates: mocks.getModelAllowlistCandidates
    }
  }
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())

const savedEntry = {
  user_group_id: 3,
  user_group_name: 'alice-group',
  user_group_code: 'alice',
  is_system: false,
  member_count: 5,
  rate_multiplier: null,
  rpm_override: null,
  denied_models: ['gpt-6-luna']
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mocks.getGroupUserGroupPolicies.mockResolvedValue([savedEntry])
  mocks.getModelAllowlistCandidates.mockResolvedValue(['gpt-6-luna', 'gpt-6-sol'])
  mocks.list.mockResolvedValue([{ id: 7, name: 'bob-group', code: 'bob', is_system: false, member_count: 2 }])
  mocks.batchSetGroupUserGroupDeniedModels.mockResolvedValue(undefined)
})

async function openModal() {
  const wrapper = mount(GroupUserDeniedModelsModal, {
    props: { show: false, group: { id: 1, name: 'Group A', platform: 'openai' } as AdminGroup },
    global: { stubs: {
      BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
      Icon: true, PlatformIcon: true, Pagination: true, teleport: true
    } }
  })
  await wrapper.setProps({ show: true })
  await flushPromises()
  return wrapper
}

const buttonByText = (wrapper: Awaited<ReturnType<typeof openModal>>, text: string) =>
  wrapper.findAll('button').find(b => b.text() === text)

describe('GroupUserDeniedModelsModal', () => {
  it('lists saved limits with their models and offers group models as suggestions', async () => {
    const wrapper = await openModal()
    const row = wrapper.get('[data-testid="denied-models-row-3"]')
    expect(row.text()).toContain('alice-group')
    expect(row.findAll('[data-testid="model-tag"]').map(tag => tag.text())).toEqual(['gpt-6-luna'])
    expect(mocks.getModelAllowlistCandidates).toHaveBeenCalledWith(1)
    expect(buttonByText(wrapper, 'common.save')).toBeUndefined()
  })

  it('adds a user group with denied models and saves the whole group', async () => {
    const wrapper = await openModal()
    await wrapper.get('.select-trigger').trigger('click')
    await wrapper.get('.select-search-input').setValue('bob')
    await wrapper.get('.select-option').trigger('click')

    const addButton = wrapper.get('[data-testid="denied-models-add"]')
    expect(addButton.attributes('disabled')).toBeDefined()
    const drafts = wrapper.findAll('[data-testid="model-tag-draft"]')
    const draft = drafts[drafts.length - 1]
    await draft.setValue('gpt-6-*')
    await draft.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await addButton.trigger('click')

    await wrapper.get('[data-testid="denied-models-save"]').trigger('click')
    await flushPromises()
    expect(mocks.batchSetGroupUserGroupDeniedModels).toHaveBeenCalledWith(1, [
      { user_group_id: 3, denied_models: ['gpt-6-luna'] },
      { user_group_id: 7, denied_models: ['gpt-6-*'] }
    ])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('drops user groups whose list became empty or who were removed', async () => {
    const wrapper = await openModal()
    await wrapper.get('[data-testid="denied-models-remove-3"]').trigger('click')
    await wrapper.get('[data-testid="denied-models-save"]').trigger('click')
    await flushPromises()
    expect(mocks.batchSetGroupUserGroupDeniedModels).toHaveBeenCalledWith(1, [])
  })

  it('shows the server reason when saving fails', async () => {
    mocks.batchSetGroupUserGroupDeniedModels.mockRejectedValueOnce({ message: 'wildcard "*" is only allowed at the end of a model name' })
    const wrapper = await openModal()
    await wrapper.get('[data-testid="denied-models-remove-3"]').trigger('click')
    await wrapper.get('[data-testid="denied-models-save"]').trigger('click')
    await flushPromises()
    expect(mocks.showError).toHaveBeenCalledWith('wildcard "*" is only allowed at the end of a model name')
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('loads saved limits even when mounted already open, so saving keeps them', async () => {
    const wrapper = mount(GroupUserDeniedModelsModal, {
      props: { show: true, group: { id: 1, name: 'Group A', platform: 'openai' } as AdminGroup },
      global: { stubs: {
        BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
        Icon: true, PlatformIcon: true, Pagination: true
      } }
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="denied-models-row-3"]').exists()).toBe(true)
  })

  it('ignores model suggestions from the previously opened group', async () => {
    let resolveOld!: (models: string[]) => void
    mocks.getModelAllowlistCandidates
      .mockReturnValueOnce(new Promise<string[]>(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce(['current-model'])
    const wrapper = await openModal()
    await wrapper.setProps({ group: { id: 2, name: 'Group B', platform: 'openai' } as AdminGroup })
    await flushPromises()
    resolveOld(['old-model'])
    await flushPromises()
    await wrapper.findAll('[data-testid="model-tag-draft"]').at(-1)!.trigger('focus')
    expect(wrapper.findAll('[role="option"]').map(option => option.text())).toContain('current-model')
    expect(wrapper.findAll('[role="option"]').map(option => option.text())).not.toContain('old-model')
  })

  it('clears every limit of the group at once', async () => {
    const wrapper = await openModal()
    await wrapper.get('[data-testid="denied-models-clear-all"]').trigger('click')
    await flushPromises()
    expect(mocks.batchSetGroupUserGroupDeniedModels).toHaveBeenCalledWith(1, [{ user_group_id: 3, denied_models: [] }])
    expect(wrapper.find('[data-testid="denied-models-row-3"]').exists()).toBe(false)
  })
})
