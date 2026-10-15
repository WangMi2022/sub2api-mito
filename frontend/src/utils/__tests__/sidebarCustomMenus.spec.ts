import { describe, expect, it } from 'vitest'
import {
  SIDEBAR_PARENT_OPTIONS,
  attachCustomMenuItems,
  isKnownSidebarParent
} from '../sidebarCustomMenus'

interface Item {
  path: string
  label: string
  children?: Item[]
}

const item = (path: string, children?: Item[]): Item => ({ path, label: path, children })
const menu = (id: string, parent_id?: string) => ({
  id,
  label: `menu-${id}`,
  icon_svg: '',
  parent_id
})
const create = (entry: { id: string; label: string }) => item(`/custom/${entry.id}`)

describe('SIDEBAR_PARENT_OPTIONS', () => {
  it('exposes only built-in collapsible admin parents and recognises them', () => {
    expect(SIDEBAR_PARENT_OPTIONS.map((option) => option.value)).toEqual([
      '/admin/channels',
      '/admin/smart-ops',
      '/admin/security-audit',
      '/admin/affiliates',
      '/admin/orders'
    ])
    expect(isKnownSidebarParent('/admin/channels')).toBe(true)
    expect(isKnownSidebarParent('/admin')).toBe(false)
    expect(isKnownSidebarParent('')).toBe(false)
    expect(isKnownSidebarParent(undefined)).toBe(false)
  })
})

describe('attachCustomMenuItems', () => {
  it('appends an entry to the children of its declared parent', () => {
    const items = [item('/admin/channels', [item('/admin/channels/pricing')])]

    attachCustomMenuItems(items, [menu('a', '/admin/channels')], create)

    expect(items).toHaveLength(1)
    expect(items[0].children?.map((child) => child.path)).toEqual([
      '/admin/channels/pricing',
      '/custom/a'
    ])
  })

  it('keeps an entry at top level when no parent is declared', () => {
    const items = [item('/admin/channels', [])]

    attachCustomMenuItems(items, [menu('a')], create)

    expect(items.map((entry) => entry.path)).toEqual(['/admin/channels', '/custom/a'])
    expect(items[0].children).toEqual([])
  })

  it('does not overwrite existing children of the parent', () => {
    const sibling = item('/custom/existing')
    const items = [item('/admin/orders', [sibling])]

    attachCustomMenuItems(items, [menu('a', '/admin/orders')], create)

    expect(items[0].children).toContain(sibling)
    expect(items[0].children).toHaveLength(2)
  })

  it('falls back to top level for an unknown or stale parent instead of dropping the entry', () => {
    const items = [item('/admin/channels', [])]

    attachCustomMenuItems(items, [menu('a', '/admin/removed-menu')], create)

    expect(items.map((entry) => entry.path)).toEqual(['/admin/channels', '/custom/a'])
  })

  it('falls back to top level when the declared parent is hidden for this session', () => {
    // e.g. /admin/affiliates is dropped by a feature flag before attachment.
    const items: Item[] = []

    attachCustomMenuItems(items, [menu('a', '/admin/affiliates')], create)

    expect(items.map((entry) => entry.path)).toEqual(['/custom/a'])
  })

  it('attaches several entries to the same parent in declaration order', () => {
    const items = [item('/admin/smart-ops', [])]

    attachCustomMenuItems(items, [menu('a', '/admin/smart-ops'), menu('b', '/admin/smart-ops')], create)

    expect(items[0].children?.map((child) => child.path)).toEqual(['/custom/a', '/custom/b'])
  })
})
