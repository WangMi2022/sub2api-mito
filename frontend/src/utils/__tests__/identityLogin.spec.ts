import { beforeEach, describe, expect, it } from 'vitest'
import { canStartIdentityAutomatically, finishIdentityLogin, identityReturnPath, markIdentityLoginAttempt, markIdentitySignedOut } from '../identityLogin'

describe('unified identity navigation', () => {
  beforeEach(() => sessionStorage.clear())

  it('preserves application routes but rejects external and authentication loops', () => {
    expect(identityReturnPath('/keys?group=3#usage')).toBe('/keys?group=3#usage')
    for (const path of ['https://outside.example', '//outside.example', '/\\outside.example', '/login', '/auth/oidc/callback', '/reset-password', undefined]) {
      expect(identityReturnPath(path)).toBe('/dashboard')
    }
  })

  it('stops automatic loops until a successful login or an explicit retry', () => {
    expect(canStartIdentityAutomatically()).toBe(true)
    markIdentityLoginAttempt()
    expect(canStartIdentityAutomatically()).toBe(false)
    finishIdentityLogin()
    expect(canStartIdentityAutomatically()).toBe(true)
    markIdentitySignedOut()
    expect(canStartIdentityAutomatically()).toBe(false)
    markIdentityLoginAttempt()
    expect(canStartIdentityAutomatically()).toBe(false)
    finishIdentityLogin()
    expect(canStartIdentityAutomatically()).toBe(true)
  })
})
