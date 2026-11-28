import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import OpsNetworkChart from '../OpsNetworkChart.vue'
import en from '@/i18n/locales/en/latencyObservability'
const mocks = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/api/admin/opsNetwork', () => ({ getNetworkSeries: mocks.read }))
it('Issue603 renders real minute samples, measured zero and unsupported qdisc without a false zero curve', async () => {
  mocks.read.mockResolvedValue({ points: [
    { at: '2026-10-30T00:00:00Z', instance: 'fixture', egress_mbps: null, tcp_retrans_percent: null, qdisc_drops: null, egress_status: 'initial_sample', tcp_status: 'initial_sample', qdisc_status: 'unsupported_unprivileged_collector' },
    { at: '2026-10-30T00:01:00Z', instance: 'fixture', egress_mbps: 0, tcp_retrans_percent: 1, qdisc_drops: null, egress_status: 'measured', tcp_status: 'measured', qdisc_status: 'unsupported_unprivileged_collector' }
  ], body_points: [{ at: '2026-10-30T00:01:00Z', bytes: 1048577, samples: 2 }] })
  const w = mount(OpsNetworkChart, { global: { plugins: [createI18n({ legacy: false, locale: 'en', messages: { en: { latencyObservability: en } } })] } })
  await flushPromises()
  expect(w.get('[data-testid="network-egress"]').text()).toContain('0 · measured')
  expect(w.get('[data-testid="network-qdisc"]').text()).toContain('Not collected · unsupported_unprivileged_collector')
  expect(w.get('[data-testid="network-qdisc"] path').attributes('d')).toBe('')
  w.unmount()
})

it('Issue605 renders measured root qdisc deltas including zero instead of inventing unavailable data', async () => {
  mocks.read.mockResolvedValue({ points: [
    { at: '2026-10-30T00:00:00Z', instance: 'fixture', egress_mbps: 0, tcp_retrans_percent: null, qdisc_drops: 0, egress_status: 'measured', tcp_status: 'no_segments', qdisc_status: 'measured_root_egress_qdisc' },
    { at: '2026-10-30T00:01:00Z', instance: 'fixture', egress_mbps: 1, tcp_retrans_percent: 1, qdisc_drops: 3, egress_status: 'measured', tcp_status: 'measured', qdisc_status: 'measured_root_egress_qdisc' }
  ], body_points: [] })
  const w = mount(OpsNetworkChart, { global: { plugins: [createI18n({ legacy: false, locale: 'en', messages: { en: { latencyObservability: en } } })] } })
  await flushPromises()
  expect(w.get('[data-testid="network-qdisc"]').text()).toContain('3 · measured_root_egress_qdisc')
  expect(w.get('[data-testid="network-qdisc"] path').attributes('d')).toContain('L')
  expect(w.get('[data-testid="network-qdisc"] circle').get('title').text()).toContain('0 · measured_root_egress_qdisc')
  w.unmount()
})

it('shows server-provided instance labels and readable axis ticks', async () => {
  mocks.read.mockResolvedValue({ points: [
    { at: '2026-10-30T00:00:00Z', instance: 'uuid-a', egress_mbps: 0.1, tcp_retrans_percent: 0, qdisc_drops: 0, egress_status: 'measured', tcp_status: 'measured', qdisc_status: 'measured_root_egress_qdisc' },
    { at: '2026-10-30T00:30:00Z', instance: 'uuid-a', egress_mbps: 0.4, tcp_retrans_percent: 0.2, qdisc_drops: 1, egress_status: 'measured', tcp_status: 'measured', qdisc_status: 'measured_root_egress_qdisc' },
    { at: '2026-10-30T00:00:00Z', instance: 'uuid-b', egress_mbps: 1, tcp_retrans_percent: 0, qdisc_drops: 0, egress_status: 'measured', tcp_status: 'measured', qdisc_status: 'measured_root_egress_qdisc' }
  ], body_points: [], instance_labels: { 'uuid-a': 'Site · 1', 'uuid-b': 'Site · 2' } })
  const w = mount(OpsNetworkChart, { global: { plugins: [createI18n({ legacy: false, locale: 'en', messages: { en: { latencyObservability: en } } })] } })
  await flushPromises()
  const options = w.findAll('option')
  expect(options.map(o => o.text())).toEqual(['Site · 1', 'Site · 2'])
  // y-axis ticks: ceiling rounded to a friendly step, three labels per chart
  const texts = w.get('[data-testid="network-egress"]').findAll('text').map(t => t.text())
  expect(texts).toContain('0')
  expect(texts).toContain('0.5')
  // area fill exists under the line
  expect(w.get('[data-testid="network-egress"] .mito-ops-network-area').attributes('d')).toContain('Z')
  w.unmount()
})

it('falls back to index plus id fragment when the server sends no labels', async () => {
  mocks.read.mockResolvedValue({ points: [
    { at: '2026-10-30T00:00:00Z', instance: 'abcdef12-3456', egress_mbps: 1, tcp_retrans_percent: null, qdisc_drops: null, egress_status: 'measured', tcp_status: 'initial_sample', qdisc_status: 'unsupported_unprivileged_collector' }
  ], body_points: [] })
  const w = mount(OpsNetworkChart, { global: { plugins: [createI18n({ legacy: false, locale: 'en', messages: { en: { latencyObservability: en } } })] } })
  await flushPromises()
  expect(w.get('option').text()).toBe('1 · abcdef12')
  w.unmount()
})
