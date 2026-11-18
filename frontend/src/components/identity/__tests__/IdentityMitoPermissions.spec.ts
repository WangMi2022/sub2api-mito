import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStepUp } from '@/composables/useStepUp'
import IdentityMitoPermissions from '../IdentityMitoPermissions.vue'

const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), link: vi.fn() }))
vi.mock('@/api/identity', () => ({
  identityAPI: { mitoPermissions: api.load, saveMitoPermissions: api.save, linkMitoAccount: api.link },
  identityErrorKey: (error: { reason?: string }) => `identity.errors.${error.reason || 'identity_unavailable'}`
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function account(protectedAccount = false) {
  return {
    linked: true, protected: protectedAccount,
    account: { id: 9, username: 'Example', email: 'example@example.invalid', role: 'user', status: 'active', userGroupId: 2, allowedGroups: [3], observerGroupIds: [], restrictPublicGroups: false, concurrency: 5, rpmLimit: 20, revision: 'a'.repeat(64) },
    groups: [{ id: 3, name: 'Billing', platform: 'openai', status: 'active', exclusive: true, subscriptionType: 'standard' }],
    userGroups: [{ id: 2, name: 'Business', status: 'active', code: 'business' }]
  }
}
function render() {
  return mount(IdentityMitoPermissions, {
    props: { id: 'subject', stepUp: useStepUp() },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
  })
}
beforeEach(() => { vi.resetAllMocks(); api.load.mockResolvedValue(account()); api.save.mockResolvedValue({}) })

describe('Identity Mito permissions', () => {
  it('makes protected accounts read only and never submits', async () => {
    api.load.mockResolvedValue(account(true))
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button.btn-primary').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    expect(api.save).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('links an unbound identity after confirming the existing business account and reason', async () => {
    api.load.mockResolvedValue({ linked: false, protected: false })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain('identity.mitoNotLinked')
    expect(wrapper.find('select').exists()).toBe(false)
    await wrapper.get('input[type="number"]').setValue(19)
    await wrapper.get('input[type="email"]').setValue('existing@example.invalid')
    await wrapper.get('textarea').setValue('Confirmed business account')
    api.load.mockResolvedValue(account())
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.link).toHaveBeenCalledWith('subject', { userId: 19, email: 'existing@example.invalid', reason: 'Confirmed business account' })
    expect(wrapper.find('select').exists()).toBe(true)
    expect(api.save).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('submits only business permissions with a revision and review reason', async () => {
    const initial = account()
    api.load.mockResolvedValue(initial)
    const wrapper = render()
    await flushPromises()
    await wrapper.get('textarea').setValue('Reviewed business access')
    await wrapper.findAll('input[type="number"]')[0].setValue(8)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.save).toHaveBeenCalledWith('subject', {
      role: 'user', status: 'active', userGroupId: 2, allowedGroups: [3], observerGroupIds: [], restrictPublicGroups: false, concurrency: 8, rpmLimit: 20, revision: 'a'.repeat(64), reason: 'Reviewed business access'
    })
    expect(initial.account.concurrency).toBe(5)
    expect(wrapper.emitted('changed')).toHaveLength(1)
    expect(wrapper.text()).toContain('identity.mitoPermissionsSaved')
    wrapper.unmount()
  })

  it('keeps a failed edit available and reports a stale revision', async () => {
    api.save.mockRejectedValue({ reason: 'identity_permissions_changed' })
    const wrapper = render()
    await flushPromises()
    await wrapper.get('textarea').setValue('Reviewed business access')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('identity.errors.identity_permissions_changed')
    expect(wrapper.get('textarea').element.value).toBe('Reviewed business access')
    expect(wrapper.emitted('changed')).toBeUndefined()
    wrapper.unmount()
  })
})
