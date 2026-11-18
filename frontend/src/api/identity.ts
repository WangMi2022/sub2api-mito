import { apiClient } from './client'
import { isStepUpBlocked, stepUpBlockReason } from '@/composables/useStepUp'

export interface IdentityUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
  emailVerified: boolean
  protected: boolean
  createdTimestamp: number
  requiredActions?: string[]
}
export interface IdentityUserInput {
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
  password?: string
  temporaryPassword?: boolean
}
export interface IdentityGroup { id: string; name: string; path: string; managed: boolean }
export interface IdentityApplication { clientId: string; name: string; accessRole: string }
export interface IdentityAccess extends IdentityApplication { granted: boolean; inherited: boolean }
export interface IdentitySession { id: string; ipAddress: string; start: number; lastAccess: number; clients: Record<string, string> }

export interface IdentityDetail { user: IdentityUser; groups: IdentityGroup[]; applications: IdentityAccess[]; sessions: IdentitySession[] }
export interface IdentityRealm {
  id: string
  realm: string
  displayName: string
  usernameEditable: boolean
  emailAsUsername: boolean
  emailDeliveryConfigured: boolean
  loginProtectionEnabled: boolean
}
export interface IdentityOverview { realm: IdentityRealm; applications: IdentityApplication[] }
export interface IdentitySecurity {
  credentialTypes: string[]
  providers: string[]
  loginFailures: { disabled: boolean; numFailures: number; lastFailure: number } | null
}
export interface IdentityLoginPolicy { oidc_only: boolean; unified_session: boolean }
export interface IdentityPage { users: IdentityUser[]; first: number; hasMore: boolean }
export interface IdentityUserFilters { enabled?: string; emailVerified?: string }

const userPath = (id: string) => `/identity/users/${encodeURIComponent(id)}`
const groupPath = (id: string) => `/identity/groups/${encodeURIComponent(id)}`
export const identityAPI = {
  loginPolicy: async () => (await apiClient.get<IdentityLoginPolicy>('/identity/login-policy')).data,
  setLoginPolicy: async (oidc_only: boolean) => (await apiClient.put<IdentityLoginPolicy>('/identity/login-policy', { oidc_only })).data,
  groupMembers: async (id: string, first = 0) => (await apiClient.get<IdentityPage>(`${groupPath(id)}/members`, { params: { first } })).data,
  capabilities: async () => (await apiClient.get<{ manage: boolean }>('/identity/capabilities')).data,
  overview: async () => (await apiClient.get<IdentityOverview>('/identity/overview')).data,
  users: async (search = '', first = 0, filters?: IdentityUserFilters) =>
    (await apiClient.get<IdentityPage>('/identity/users', { params: { search, first, ...filters } })).data,
  detail: async (id: string) => (await apiClient.get<IdentityDetail>(userPath(id))).data,
  security: async (id: string) => (await apiClient.get<IdentitySecurity>(`${userPath(id)}/security`)).data,
  applicationAccounts: async (client: string, first = 0) =>
    (await apiClient.get<IdentityPage>(`/identity/applications/${encodeURIComponent(client)}/users`, { params: { first } })).data,
  groups: async () => (await apiClient.get<IdentityGroup[]>('/identity/groups')).data,
  saveUser: (input: IdentityUserInput, id?: string) => id ? apiClient.put(userPath(id), input) : apiClient.post('/identity/users', input),
  deleteUser: (id: string, confirmation: string) => apiClient.delete(userPath(id), { data: { confirmation } }),
  password: (id: string, password: string, temporary: boolean) => apiClient.put(`${userPath(id)}/password`, { password, temporary }),
  logout: (id: string) => apiClient.post(`${userPath(id)}/logout`, {}),
  sessionLogout: (id: string, sessionId: string) => apiClient.post(`${userPath(id)}/sessions/end`, { sessionId }),
  verifyEmail: (id: string) => apiClient.put(`${userPath(id)}/verify-email`, {}),
  clearLoginFailures: (id: string) => apiClient.delete(`${userPath(id)}/login-failures`, { data: {} }),
  membership: (id: string, group: string, member: boolean) => apiClient.put(`${userPath(id)}/groups/${encodeURIComponent(group)}`, { member }),
  access: (id: string, client: string, granted: boolean) => apiClient.put(`${userPath(id)}/applications/${encodeURIComponent(client)}`, { granted }),
  saveGroup: (name: string, id?: string) => id ? apiClient.put(groupPath(id), { name }) : apiClient.post('/identity/groups', { name }),
  deleteGroup: (id: string, confirmation: string) => apiClient.delete(groupPath(id), { data: { confirmation } })
}

export function identityErrorKey(error: unknown): string {
  if (isStepUpBlocked(error)) {
    return stepUpBlockReason(error) === 'STEP_UP_TOTP_NOT_ENABLED' ? 'stepUp.notEnabled' : 'stepUp.adminApiKeyForbidden'
  }
  const reason = (error as { reason?: string; message?: string })?.reason
    || (error as { message?: string })?.message || ''
  return /^identity_[a-z_]+$/.test(reason) || reason === 'invalid_request'
    ? `identity.errors.${reason}` : 'identity.errors.identity_unavailable'
}
