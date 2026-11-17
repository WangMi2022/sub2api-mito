const ATTEMPT_KEY = 'mito_identity_login_attempt'
const SIGNED_OUT_KEY = 'mito_identity_signed_out'

export function identityReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/dashboard'
  const path = new URL(value, 'https://mito.invalid').pathname
  if (/^\/(login|register|forgot-password|reset-password|auth)(\/|$)/.test(path)) return '/dashboard'
  return value
}

// Keep an unsuccessful automatic attempt from bouncing through the IdP again.
// The user can explicitly retry; successful authentication clears the marker.
export function canStartIdentityAutomatically(storage: Storage = sessionStorage): boolean {
  return !storage.getItem(ATTEMPT_KEY) && !storage.getItem(SIGNED_OUT_KEY)
}

export function markIdentityLoginAttempt(storage: Storage = sessionStorage): void {
  storage.setItem(ATTEMPT_KEY, '1')
  storage.removeItem(SIGNED_OUT_KEY)
}

export function finishIdentityLogin(storage: Storage = sessionStorage): void {
  storage.removeItem(ATTEMPT_KEY)
  storage.removeItem(SIGNED_OUT_KEY)
}

export function markIdentitySignedOut(storage: Storage = sessionStorage): void {
  storage.setItem(SIGNED_OUT_KEY, '1')
  storage.removeItem(ATTEMPT_KEY)
}
