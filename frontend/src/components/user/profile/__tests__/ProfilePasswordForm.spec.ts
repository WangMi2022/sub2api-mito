import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePasswordForm from '@/components/user/profile/ProfilePasswordForm.vue'

const { changePasswordMock, identityStartMock, appSettings, showSuccessMock, showErrorMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  identityStartMock: vi.fn(),
  appSettings: { mito_oidc_only: false },
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn()
}))

vi.mock('@/api', () => ({
  userAPI: {
    changePassword: changePasswordMock,
    startIdentityPasswordChange: identityStartMock
  }
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    cachedPublicSettings: appSettings,
    showSuccess: showSuccessMock,
    showError: showErrorMock
  })
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'profile.changePassword': 'Change Password',
          'profile.currentPassword': 'Current Password',
          'profile.newPassword': 'New Password',
          'profile.confirmNewPassword': 'Confirm New Password',
          'profile.passwordHint': 'Password must be at least 8 characters long',
          'profile.changingPassword': 'Changing...',
          'profile.changePasswordButton': 'Change Password',
          'profile.passwordsNotMatch': 'New passwords do not match',
          'profile.passwordTooShort': 'Password must be at least 8 characters long',
          'profile.passwordChangeSuccess': 'Password changed successfully',
          'profile.passwordChangeFailed': 'Failed to change password'
        }
        return translations[key] ?? key
      }
    })
  }
})

describe('ProfilePasswordForm', () => {
  beforeEach(() => { appSettings.mito_oidc_only = false; vi.clearAllMocks() })

  it('uses identity self-service and never submits local credentials in unified-only mode', async () => {
    appSettings.mito_oidc_only = true
    identityStartMock.mockRejectedValue({ message: 'Identity provider unavailable' })
    const wrapper = mount(ProfilePasswordForm, { props: { embedded: true } })
    expect(wrapper.find('#old_password').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(false)
    await wrapper.get('[data-testid="identity-password-change"] button').trigger('click')
    await vi.waitFor(() => expect(identityStartMock).toHaveBeenCalledTimes(1))
    expect(changePasswordMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith('Identity provider unavailable')
    expect(showSuccessMock).not.toHaveBeenCalled()
  })

  it('restores the local password form when unified-only sign-in is disabled', () => {
    const wrapper = mount(ProfilePasswordForm)
    expect(wrapper.find('#old_password').exists()).toBe(true)
    expect(wrapper.find('[data-testid="identity-password-change"]').exists()).toBe(false)
  })

  it('shows validation failures as toast messages instead of inline errors', async () => {
    const wrapper = mount(ProfilePasswordForm)

    await wrapper.get('#old_password').setValue('old-password')
    await wrapper.get('#new_password').setValue('new-password')
    await wrapper.get('#confirm_password').setValue('different-password')
    await wrapper.get('form').trigger('submit.prevent')

    expect(changePasswordMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith('New passwords do not match')
    expect(wrapper.find('.input-error-text').exists()).toBe(false)
  })

  it.each([
    [{ status: 400, code: 'PASSWORD_INCORRECT', message: 'current password is incorrect' }, 'current password is incorrect'],
    [{ response: { data: { detail: 'backend failure' } } }, 'backend failure'],
    [{}, 'Failed to change password'],
  ])('shows API failure %j as a toast', async (error, expectedMessage) => {
    changePasswordMock.mockRejectedValue(error)

    const wrapper = mount(ProfilePasswordForm)

    await wrapper.get('#old_password').setValue('old-password')
    await wrapper.get('#new_password').setValue('new-password')
    await wrapper.get('#confirm_password').setValue('new-password')
    await wrapper.get('form').trigger('submit.prevent')

    expect(changePasswordMock).toHaveBeenCalledWith('old-password', 'new-password')
    expect(showErrorMock).toHaveBeenLastCalledWith(expectedMessage)
    expect(wrapper.find('.input-error-text').exists()).toBe(false)
  })
})
