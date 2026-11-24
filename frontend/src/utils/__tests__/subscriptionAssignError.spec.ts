import { describe, expect, it } from 'vitest'
import { formatAssignError, parseAssignError } from '../subscriptionAssignError'

const REAL_CONFLICT =
  'user 4: error: code=409 reason="SUBSCRIPTION_ASSIGN_CONFLICT" message="subscription exists but request conflicts with existing assignment semantics" metadata=map[conflict_reason:validity_days_mismatch]'

const t = (key: string, values?: Record<string, unknown>) => {
  const templates: Record<string, string> = {
    'admin.subscriptions.batchAssign.errors.unknownUser': '未知用户',
    'admin.subscriptions.batchAssign.errors.userFallback': '用户 #{id}',
    'admin.subscriptions.batchAssign.errors.conflict_validity_days_mismatch': '{user}：有效期不一致',
    'admin.subscriptions.batchAssign.errors.conflict_notes_mismatch': '{user}：备注不一致',
    'admin.subscriptions.batchAssign.errors.conflict_generic': '{user}：订阅冲突',
    'admin.subscriptions.batchAssign.errors.GROUP_NOT_SUBSCRIPTION_TYPE': '分组不是订阅类型',
    'admin.subscriptions.batchAssign.errors.fallback': '{user}：分配失败（{detail}）'
  }
  let out = templates[key] ?? key
  for (const [k, v] of Object.entries(values ?? {})) out = out.replace(`{${k}}`, String(v))
  return out
}
const label = (id: number) => (id === 4 ? 'alice@example.com' : `用户 #${id}`)

describe('parseAssignError', () => {
  it('parses the real backend debug format', () => {
    expect(parseAssignError(REAL_CONFLICT)).toEqual({
      userId: 4,
      reason: 'SUBSCRIPTION_ASSIGN_CONFLICT',
      conflictReason: 'validity_days_mismatch'
    })
  })

  it('tolerates missing metadata and user prefix', () => {
    expect(parseAssignError('error: code=400 reason="GROUP_NOT_SUBSCRIPTION_TYPE" message="x" metadata=map[]')).toEqual({
      userId: null,
      reason: 'GROUP_NOT_SUBSCRIPTION_TYPE',
      conflictReason: ''
    })
    expect(parseAssignError('boom')).toEqual({ userId: null, reason: '', conflictReason: '' })
  })
})

describe('formatAssignError', () => {
  it('renders validity mismatch with the user email', () => {
    expect(formatAssignError(REAL_CONFLICT, t, label)).toBe('alice@example.com：有效期不一致')
  })

  it('renders notes mismatch and unknown conflict reasons', () => {
    const notes = REAL_CONFLICT.replace('validity_days_mismatch', 'notes_mismatch')
    expect(formatAssignError(notes, t, label)).toBe('alice@example.com：备注不一致')
    const other = REAL_CONFLICT.replace('validity_days_mismatch', 'future_reason')
    expect(formatAssignError(other, t, label)).toBe('alice@example.com：订阅冲突')
  })

  it('falls back for unknown reasons without swallowing the detail', () => {
    const raw = 'user 9: error: code=500 reason="SOMETHING_NEW" message="db down" metadata=map[]'
    const out = formatAssignError(raw, t, label)
    expect(out).toContain('用户 #9')
    expect(out).toContain('SOMETHING_NEW')
    expect(out).toContain('db down')
  })

  it('keeps completely unparseable entries visible', () => {
    expect(formatAssignError('connection reset', t, label)).toContain('connection reset')
  })

  it('respects keyExists probing for unregistered locales', () => {
    const out = formatAssignError(REAL_CONFLICT, t, label, () => false)
    expect(out).toContain('SUBSCRIPTION_ASSIGN_CONFLICT')
  })
})
