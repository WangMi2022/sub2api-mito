import { describe, expect, it } from 'vitest'
import { parseIQPresets, serializeIQPresets, upsertIQPreset, IQ_PRESET_LIMIT, type IQTestPreset } from '../iqTestPresets'

function preset(overrides: Partial<IQTestPreset> = {}): IQTestPreset {
  return {
    id: 'p1', name: '我的题面', questionKind: 'pelican', prompt: '创建一个 HTML',
    reasoningEffort: 'high', parallelCount: 2, updatedAt: '2026-11-26T00:00:00Z', ...overrides
  }
}

describe('iqTestPresets', () => {
  it('parses saved presets and keeps valid fields', () => {
    const parsed = parseIQPresets(JSON.stringify([preset()]))
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({ name: '我的题面', questionKind: 'pelican', reasoningEffort: 'high', parallelCount: 2 })
  })

  it('returns empty list for broken storage instead of throwing', () => {
    expect(parseIQPresets(null)).toEqual([])
    expect(parseIQPresets('not json')).toEqual([])
    expect(parseIQPresets('{"a":1}')).toEqual([])
  })

  it('drops invalid entries and normalizes out-of-range values', () => {
    const raw = JSON.stringify([
      preset({ id: 'ok', parallelCount: 99, reasoningEffort: 'bogus' }),
      preset({ id: 'ok' }), // duplicate id
      preset({ id: 'no-name', name: '  ' }),
      preset({ id: 'no-prompt', prompt: '' }),
      preset({ id: 'bad-kind', questionKind: 'ciallo' as never }),
      preset({ id: 'huge', prompt: 'x'.repeat(32001) }),
      null
    ])
    const parsed = parseIQPresets(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({ id: 'ok', parallelCount: 8, reasoningEffort: 'medium' })
  })

  it('upsert replaces same-name preset and keeps newest first', () => {
    const list = [preset({ id: 'a', name: '甲' }), preset({ id: 'b', name: '乙' })]
    const next = upsertIQPreset(list, preset({ id: 'c', name: '甲', prompt: '新题面' }))
    expect(next.map((p) => p.name)).toEqual(['甲', '乙'])
    expect(next[0]).toMatchObject({ id: 'c', prompt: '新题面' })
  })

  it('caps the list at the preset limit', () => {
    let list: IQTestPreset[] = []
    for (let i = 0; i < IQ_PRESET_LIMIT + 5; i++) list = upsertIQPreset(list, preset({ id: `p${i}`, name: `方案${i}` }))
    expect(list).toHaveLength(IQ_PRESET_LIMIT)
    expect(list[0].name).toBe(`方案${IQ_PRESET_LIMIT + 4}`)
    expect(parseIQPresets(serializeIQPresets(list))).toHaveLength(IQ_PRESET_LIMIT)
  })
})
