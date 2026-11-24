/**
 * 批量分配订阅失败项的人性化文案。
 *
 * 后端 bulk-assign 的 errors 数组是调试格式：
 *   `user 4: error: code=409 reason="SUBSCRIPTION_ASSIGN_CONFLICT" message="..." metadata=map[conflict_reason:validity_days_mismatch]`
 * 这里把它解析成结构化信息，交给 i18n 渲染成用户能看懂的提示；
 * 解析不了的条目原样返回，绝不吞错误。
 */

export interface ParsedAssignError {
  userId: number | null
  reason: string
  conflictReason: string
}

const USER_PREFIX = /^user\s+(\d+):\s*/
const REASON_PATTERN = /reason="([^"]+)"/
const CONFLICT_PATTERN = /conflict_reason:([A-Za-z0-9_]+)/

export function parseAssignError(raw: string): ParsedAssignError {
  let userId: number | null = null
  let rest = raw
  const userMatch = USER_PREFIX.exec(raw)
  if (userMatch) {
    userId = Number(userMatch[1])
    rest = raw.slice(userMatch[0].length)
  }
  const reason = REASON_PATTERN.exec(rest)?.[1] ?? ''
  const conflictReason = CONFLICT_PATTERN.exec(rest)?.[1] ?? ''
  return { userId, reason, conflictReason }
}

/** 后端 reason 是否已有对应的友好文案（i18n key 存在）。 */
const KNOWN_REASONS = new Set([
  'SUBSCRIPTION_ASSIGN_CONFLICT',
  'SUBSCRIPTION_ALREADY_EXISTS',
  'SUBSCRIPTION_RESTORE_CONFLICT',
  'GROUP_NOT_SUBSCRIPTION_TYPE',
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_SUSPENDED',
  'SUBSCRIPTION_NIL_INPUT',
  'INVALID_INPUT',
  'ADJUST_WOULD_EXPIRE'
])

const KNOWN_CONFLICTS = new Set(['validity_days_mismatch', 'notes_mismatch'])

export type AssignErrorTranslator = (key: string, values?: Record<string, unknown>) => string

/**
 * 把一条 bulk-assign 错误渲染成本地化文案。
 * keyExists 用于探测 i18n key 是否注册（vue-i18n 的 te），未注册的 reason 走兜底。
 */
export function formatAssignError(
  raw: string,
  t: AssignErrorTranslator,
  userLabel: (userId: number) => string,
  keyExists?: (key: string) => boolean
): string {
  const { userId, reason, conflictReason } = parseAssignError(raw)
  const base = 'admin.subscriptions.batchAssign.errors'
  const user = userId != null ? userLabel(userId) : t(`${base}.unknownUser`)

  if (reason && KNOWN_REASONS.has(reason)) {
    let detailKey = `${base}.${reason}`
    if (reason === 'SUBSCRIPTION_ASSIGN_CONFLICT') {
      const conflict = KNOWN_CONFLICTS.has(conflictReason) ? conflictReason : 'generic'
      detailKey = `${base}.conflict_${conflict}`
    }
    if (!keyExists || keyExists(detailKey)) {
      return t(detailKey, { user })
    }
  }
  // 未知错误：保留原始信息便于排查，但去掉冗长的机器前缀。
  const cleaned = raw.replace(USER_PREFIX, '').replace(/^error:\s*/, '')
  return t(`${base}.fallback`, { user, detail: cleaned || raw })
}
