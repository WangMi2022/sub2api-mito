import type { Column } from '@/components/common/types'

// Minimums reserve room for real badges, quota windows and action controls.
const sizes: Record<string, Pick<Column, 'width' | 'minWidth' | 'maxWidth' | 'resizable'>> = {
  select: { width: 52, minWidth: 52, maxWidth: 52, resizable: false },
  name: { width: 240, minWidth: 176 },
  id: { width: 80, minWidth: 72 },
  platform_type: { width: 176, minWidth: 144 },
  capacity: { width: 120, minWidth: 104 },
  status: { width: 128, minWidth: 112 },
  schedulable: { width: 112, minWidth: 104 },
  today_stats: { width: 176, minWidth: 156 },
  groups: { width: 176, minWidth: 144 },
  usage: { width: 224, minWidth: 200 },
  proxy: { width: 152, minWidth: 120 },
  priority: { width: 96, minWidth: 88 },
  scheduler_score: { width: 160, minWidth: 144 },
  rate_multiplier: { width: 112, minWidth: 104 },
  upstream_billing_rate: { width: 144, minWidth: 128 },
  last_used_at: { width: 160, minWidth: 136 },
  created_at: { width: 160, minWidth: 136 },
  expires_at: { width: 160, minWidth: 136 },
  notes: { width: 240, minWidth: 144 },
  actions: { width: 216, minWidth: 200 }
}

export function withAccountColumnSizes(columns: Column[]): Column[] {
  return columns.map(column => ({ ...column, ...sizes[column.key] }))
}
