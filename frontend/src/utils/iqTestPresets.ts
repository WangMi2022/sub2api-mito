// 智商测试「自定义题面」的已保存配置。权威数据存服务端(按登录管理员隔离,
// 跨设备可见);localStorage 仅作离线缓存与旧版本数据迁移来源,不含凭据。
export interface IQTestPreset {
  id: string
  name: string
  questionKind: 'candy' | 'pelican'
  prompt: string
  reasoningEffort: string
  parallelCount: number
  updatedAt: string
}

export const IQ_PRESET_STORAGE_KEY = 'sub2api-iq-test-presets'
export const IQ_PRESET_LIMIT = 20
export const IQ_PRESET_NAME_MAX = 40
export const IQ_PRESET_PROMPT_MAX = 32000

const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])

// 读出的条目逐个校验,坏数据丢弃而不是让弹窗崩溃。
export function parseIQPresets(raw: string | null): IQTestPreset[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  const presets: IQTestPreset[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const p = item as Partial<IQTestPreset>
    if (typeof p.id !== 'string' || !p.id || seen.has(p.id)) continue
    if (typeof p.name !== 'string' || !p.name.trim()) continue
    if (p.questionKind !== 'candy' && p.questionKind !== 'pelican') continue
    if (typeof p.prompt !== 'string' || !p.prompt.trim() || p.prompt.length > IQ_PRESET_PROMPT_MAX) continue
    seen.add(p.id)
    presets.push({
      id: p.id,
      name: p.name.trim().slice(0, IQ_PRESET_NAME_MAX),
      questionKind: p.questionKind,
      prompt: p.prompt,
      reasoningEffort: typeof p.reasoningEffort === 'string' && EFFORTS.has(p.reasoningEffort) ? p.reasoningEffort : 'medium',
      parallelCount: Number.isFinite(Number(p.parallelCount)) ? Math.min(8, Math.max(1, Math.floor(Number(p.parallelCount)))) : 1,
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : ''
    })
    if (presets.length >= IQ_PRESET_LIMIT) break
  }
  return presets
}

export function serializeIQPresets(presets: IQTestPreset[]): string {
  return JSON.stringify(presets.slice(0, IQ_PRESET_LIMIT))
}

// 同名保存视为覆盖更新,保持列表稳定;新条目排最前。
export function upsertIQPreset(presets: IQTestPreset[], preset: IQTestPreset): IQTestPreset[] {
  const rest = presets.filter((p) => p.id !== preset.id && p.name !== preset.name)
  return [preset, ...rest].slice(0, IQ_PRESET_LIMIT)
}

// 服务端 DTO(snake_case)与前端结构的互转。
export interface IQTestPresetWire {
  id: string
  name: string
  question_kind: 'candy' | 'pelican'
  prompt: string
  reasoning_effort: string
  parallel_count: number
  updated_at: string
}

export function presetFromWire(w: IQTestPresetWire): IQTestPreset {
  return {
    id: w.id, name: w.name, questionKind: w.question_kind, prompt: w.prompt,
    reasoningEffort: w.reasoning_effort, parallelCount: w.parallel_count, updatedAt: w.updated_at
  }
}

export function presetToWire(p: IQTestPreset): IQTestPresetWire {
  return {
    id: p.id, name: p.name, question_kind: p.questionKind, prompt: p.prompt,
    reasoning_effort: p.reasoningEffort, parallel_count: p.parallelCount, updated_at: p.updatedAt
  }
}
