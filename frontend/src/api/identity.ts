import { apiClient } from './client'

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
}
export interface IdentityUserInput {
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
  password?: string
}
export interface IdentityGroup { id: string; name: string; path: string; managed: boolean }
export interface IdentityApplication { clientId: string; name: string; accessRole: string }
export interface IdentityAccess extends IdentityApplication { granted: boolean; inherited: boolean }
export interface IdentitySession { id: string; ipAddress: string; start: number; lastAccess: number; clients: Record<string, string> }
export interface IdentityDetail { user: IdentityUser; groups: IdentityGroup[]; applications: IdentityAccess[]; sessions: IdentitySession[] }
export interface IdentityOverview { realm: { id: string; realm: string; displayName: string }; applications: IdentityApplication[] }
export interface IdentityPage { users: IdentityUser[]; first: number; hasMore: boolean }

const userPath = (id: string) => `/identity/users/${encodeURIComponent(id)}`
const groupPath = (id: string) => `/identity/groups/${encodeURIComponent(id)}`
export const identityAPI = {
  capabilities: async () => (await apiClient.get<{ manage: boolean }>('/identity/capabilities')).data,
  overview: async () => (await apiClient.get<IdentityOverview>('/identity/overview')).data,
  users: async (search = '', first = 0) => (await apiClient.get<IdentityPage>('/identity/users', { params: { search, first } })).data,
  detail: async (id: string) => (await apiClient.get<IdentityDetail>(userPath(id))).data,
  groups: async () => (await apiClient.get<IdentityGroup[]>('/identity/groups')).data,
  saveUser: (input: IdentityUserInput, id?: string) => id ? apiClient.put(userPath(id), input) : apiClient.post('/identity/users', input),
  deleteUser: (id: string, confirmation: string) => apiClient.delete(userPath(id), { data: { confirmation } }),
  password: (id: string, password: string) => apiClient.put(`${userPath(id)}/password`, { password }),
  logout: (id: string) => apiClient.post(`${userPath(id)}/logout`, {}),
  membership: (id: string, group: string, member: boolean) => apiClient.put(`${userPath(id)}/groups/${encodeURIComponent(group)}`, { member }),
  access: (id: string, client: string, granted: boolean) => apiClient.put(`${userPath(id)}/applications/${encodeURIComponent(client)}`, { granted }),
  saveGroup: (name: string, id?: string) => id ? apiClient.put(groupPath(id), { name }) : apiClient.post('/identity/groups', { name }),
  deleteGroup: (id: string, confirmation: string) => apiClient.delete(groupPath(id), { data: { confirmation } })
}

export function identityErrorKey(error: unknown): string {
  const reason = (error as { reason?: string; message?: string })?.reason
    || (error as { message?: string })?.message || ''
  return /^identity_[a-z_]+$/.test(reason) || reason === 'invalid_request'
    ? `identity.errors.${reason}` : 'identity.errors.identity_unavailable'
}
