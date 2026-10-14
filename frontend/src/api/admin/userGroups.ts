/**
 * Admin User Groups API endpoints
 * 用户组：把专属倍率 / 专属 RPM / 用户模型限制从按用户配置改为按用户组配置。
 * 未归属任何用户组的用户不允许登录或调用网关接口。
 */

import { apiClient } from '../client'
import type { UserGroup } from '@/types'

export interface CreateUserGroupRequest {
  name: string
  description?: string
}

export interface UpdateUserGroupRequest {
  name?: string
  description?: string
  status?: 'active' | 'disabled'
}

/** List all user groups（含成员数）。 */
export async function list(): Promise<UserGroup[]> {
  const { data } = await apiClient.get<UserGroup[]>('/admin/user-groups')
  return data
}

/** Get one user group by id. */
export async function getById(id: number): Promise<UserGroup> {
  const { data } = await apiClient.get<UserGroup>(`/admin/user-groups/${id}`)
  return data
}

export async function create(payload: CreateUserGroupRequest): Promise<UserGroup> {
  const { data } = await apiClient.post<UserGroup>('/admin/user-groups', payload)
  return data
}

export async function update(id: number, payload: UpdateUserGroupRequest): Promise<UserGroup> {
  const { data } = await apiClient.put<UserGroup>(`/admin/user-groups/${id}`, payload)
  return data
}

export async function remove(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/user-groups/${id}`)
  return data
}

/** List member user ids of a user group. */
export async function listMembers(id: number): Promise<number[]> {
  const { data } = await apiClient.get<{ user_ids: number[] }>(`/admin/user-groups/${id}/members`)
  return data.user_ids ?? []
}

/** Replace the member list of a user group；未列出的用户回到「未分组」。 */
export async function syncMembers(id: number, userIds: number[]): Promise<{ affected: number }> {
  const { data } = await apiClient.put<{ affected: number }>(`/admin/user-groups/${id}/members`, {
    user_ids: userIds
  })
  return data
}

const adminUserGroupsAPI = { list, getById, create, update, remove, listMembers, syncMembers }
export default adminUserGroupsAPI
