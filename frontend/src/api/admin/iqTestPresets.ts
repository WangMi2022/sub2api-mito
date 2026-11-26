/**
 * 智商测试自定义题面方案:按登录管理员存服务端,跨设备可见。
 */
import { apiClient } from '../client'

export interface IQTestPresetDTO {
  id: string
  name: string
  question_kind: 'candy' | 'pelican'
  prompt: string
  reasoning_effort: string
  parallel_count: number
  updated_at: string
}

export async function listIQTestPresets(): Promise<IQTestPresetDTO[]> {
  const { data } = await apiClient.get<IQTestPresetDTO[]>('/admin/iq-test-presets')
  return data ?? []
}

export async function saveIQTestPresets(presets: IQTestPresetDTO[]): Promise<IQTestPresetDTO[]> {
  const { data } = await apiClient.put<IQTestPresetDTO[]>('/admin/iq-test-presets', { presets })
  return data ?? []
}
