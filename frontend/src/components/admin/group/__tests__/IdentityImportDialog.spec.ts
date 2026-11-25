import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import type { UserGroup } from '@/types'
import enLocale from '@/i18n/locales/en'
import IdentityImportDialog from '../IdentityImportDialog.vue'

const messages = (enLocale as { admin: { groups: unknown }; common: unknown })
const i18n = createI18n({
  legacy: false, locale: 'en', messages: { en: { admin: { groups: messages.admin.groups }, common: messages.common } }
})
const gt = i18n.global.t as (key: string, args?: Record<string, unknown>) => string

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  users: vi.fn(),
  importAccounts: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn()
}))
vi.mock('@/api/admin', () => ({ adminAPI: { userGroups: { list: mocks.list } } }))
vi.mock('@/api/identity', () => ({ identityAPI: { users: mocks.users, importAccounts: mocks.importAccounts } }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError }) }))
vi.mock('@/utils/apiError', () => ({ extractApiErrorMessage: (_: unknown, fallback: string) => fallback }))

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  mocks.list.mockResolvedValue([group(1, { code: 'system_admin' }), group(2, { code: 'default_user' }), group(3, { status: 'disabled' })])
  mocks.users.mockResolvedValue({ users: [], first: 0, hasMore: false })
})

const group = (id: number, extra: Partial<UserGroup> = {}): UserGroup => ({
  id, name: `Group ${id}`, code: `code-${id}`, member_count: 0,
  is_system: false, status: 'active', description: '', created_at: '', updated_at: '', ...extra
})

const idUser = (id: string, extra: Record<string, unknown> = {}) => ({
  id, username: `user-${id}`, email: `${id}@example.com`, firstName: '', lastName: '',
  enabled: true, emailVerified: true, protected: false, createdTimestamp: 0, ...extra
})

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(IdentityImportDialog, {
    props: { show: true, ...props },
    global: { plugins: [i18n], stubs: { teleport: true, Icon: true, BaseDialog: { template: '<div><slot /></div>', props: ['show'] } } }
  })
}

describe('IdentityImportDialog', () => {
  it('defaults to the ordinary user group and lists directory accounts on search', async () => {
    mocks.users.mockResolvedValue({ users: [idUser('a'), idUser('b')], first: 2, hasMore: false })
    const wrapper = mountDialog()
    await flushPromises()
    expect((wrapper.get('[data-testid="identity-import-group"]').element as HTMLSelectElement).value).toBe('2')
    expect(wrapper.findAll('option')).toHaveLength(3) // placeholder + 2 active groups
    await wrapper.get('[data-testid="identity-import-search"]').setValue('alice')
    await wrapper.get('[data-testid="identity-import-search"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(mocks.users).toHaveBeenCalledWith('alice', 0)
    expect(wrapper.findAll('[data-testid="identity-import-candidate"]')).toHaveLength(2)
  })

  it('honours the provided default group and disables protected, disabled and email-less accounts', async () => {
    mocks.users.mockResolvedValue({
      users: [idUser('ok'), idUser('off', { enabled: false }), idUser('guard', { protected: true }), idUser('nomail', { email: '' })],
      first: 4, hasMore: false
    })
    const wrapper = mountDialog({ defaultGroupId: 1 })
    await flushPromises()
    expect((wrapper.get('[data-testid="identity-import-group"]').element as HTMLSelectElement).value).toBe('1')
    await wrapper.get('[data-testid="identity-import-search"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const boxes = wrapper.findAll('[data-testid="identity-import-candidate"]')
    expect(boxes[0].attributes('disabled')).toBeUndefined()
    expect(boxes[1].attributes('disabled')).toBeDefined()
    expect(boxes[2].attributes('disabled')).toBeDefined()
    expect(boxes[3].attributes('disabled')).toBeDefined()
    await boxes[1].setValue(true)
    expect(wrapper.text()).toContain(gt('admin.groups.identityImport.selectedCount', { count: 0 }))
  })

  it('imports selected accounts into the chosen group and emits imported', async () => {
    mocks.users.mockResolvedValue({ users: [idUser('a'), idUser('b')], first: 2, hasMore: false })
    mocks.importAccounts.mockResolvedValue({
      results: [
        { subject: 'a', status: 'created', userId: 10, username: 'user-a' },
        { subject: 'b', status: 'exists', userId: 11 }
      ]
    })
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.get('[data-testid="identity-import-search"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const boxes = wrapper.findAll('[data-testid="identity-import-candidate"]')
    await boxes[0].setValue(true)
    await boxes[1].setValue(true)
    const submit = wrapper.get('[data-testid="identity-import-submit"]')
    expect(submit.attributes('disabled')).toBeUndefined()
    await submit.trigger('click')
    await flushPromises()
    expect(mocks.importAccounts).toHaveBeenCalledWith({
      subjects: ['a', 'b'], userGroupId: 2, reason: gt('admin.groups.identityImport.reason')
    })
    expect(wrapper.emitted('imported')).toHaveLength(1)
    expect(mocks.showSuccess).toHaveBeenCalledWith(gt('admin.groups.identityImport.success', { count: 1 }))
    expect(wrapper.get('[data-testid="identity-import-results"]').text()).toContain(gt('admin.groups.identityImport.status.created'))
    expect(wrapper.get('[data-testid="identity-import-results"]').text()).toContain(gt('admin.groups.identityImport.status.exists'))
    expect(wrapper.text()).toContain(gt('admin.groups.identityImport.selectedCount', { count: 0 }))
  })

  it('reports per-item failures without emitting imported when nothing was created', async () => {
    mocks.users.mockResolvedValue({ users: [idUser('a')], first: 1, hasMore: false })
    mocks.importAccounts.mockResolvedValue({
      results: [{ subject: 'a', status: 'failed', reason: 'identity_import_email_exists' }]
    })
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.get('[data-testid="identity-import-search"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await wrapper.findAll('[data-testid="identity-import-candidate"]')[0].setValue(true)
    await wrapper.get('[data-testid="identity-import-submit"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('imported')).toBeUndefined()
    expect(mocks.showError).toHaveBeenCalledWith(gt('admin.groups.identityImport.partialFailure', { count: 1 }))
    expect(wrapper.get('[data-testid="identity-import-results"]').text()).toContain(gt('admin.groups.identityImport.reasons.identity_import_email_exists'))
  })

  it('keeps the submit disabled until a group and at least one account are chosen', async () => {
    mocks.users.mockResolvedValue({ users: [idUser('a')], first: 1, hasMore: false })
    const wrapper = mountDialog()
    await flushPromises()
    const submit = wrapper.get('[data-testid="identity-import-submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="identity-import-search"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await wrapper.findAll('[data-testid="identity-import-candidate"]')[0].setValue(true)
    expect(submit.attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-testid="identity-import-group"]').setValue('0')
    expect(submit.attributes('disabled')).toBeDefined()
  })
})
