/** Sanitized, authorized projection of the configured channel monitor. */
export interface PlazaMonitoring {
  source: 'v1' | 'v2' | 'v3'
  status: 'operational' | 'degraded' | 'down' | 'unknown'
  availability: number | null
  range: string
  latency_ms: number | null
  latency_kind: 'ttft' | 'probe'
  /** Aggregate tokens/second; null when hidden or not collected. */
  throughput: number | null
  updated_at: string | null
  cells: Array<{ at: string; status: PlazaMonitoring['status'] }>
}

export function monitorNumber(value: number | null | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits)
}

export function monitorLatency(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
}
