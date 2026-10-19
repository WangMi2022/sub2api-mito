import { beforeEach, describe, expect, it, vi } from 'vitest'

const theme = vi.hoisted(() => ({ mito: true }))
vi.mock('../index', () => ({
  get isMitoTheme() {
    return theme.mito
  }
}))

import {
  applyMitoSidebarSections,
  applyMitoUserSidebarSections,
  groupMitoSidebarSections
} from '../sidebarSections'

const t = (key: string) => key
const item = (path: string) => ({ path, label: path })

beforeEach(() => {
  theme.mito = true
})

describe('applyMitoSidebarSections', () => {
  it('inserts one heading per declared section and keeps the declared order', () => {
    const items = [
      item('/admin/dashboard'),
      item('/admin/ops'),
      item('/admin/users'),
      item('/admin/user-groups'),
      item('/admin/groups'),
      item('/admin/channels'),
      item('/admin/accounts'),
      item('/admin/smart-ops'),
      item('/admin/proxies'),
      item('/admin/orders'),
      item('/admin/subscriptions'),
      item('/admin/affiliates'),
      item('/admin/redeem'),
      item('/admin/promo-codes'),
      item('/admin/usage'),
      item('/admin/audit-logs'),
      item('/admin/security-audit'),
      item('/admin/announcements'),
      item('/admin/support-tickets'),
      item('/admin/plugins'),
      item('/admin/settings')
    ]

    const out = applyMitoSidebarSections(items, t)
    const headings = out.filter((entry) => 'sectionTitle' in entry).map((entry) => entry.sectionTitle)

    expect(headings).toEqual([
      'nav.sections.overview',
      'nav.sections.identity',
      'nav.sections.runtime',
      'nav.sections.commerce',
      'nav.sections.insights',
      'nav.sections.system'
    ])
  })

  it('never drops an item, including ones no section claims', () => {
    const items = [
      item('/admin/dashboard'),
      { path: '/custom/7', label: 'Custom' },
      item('/admin/settings')
    ]

    const out = applyMitoSidebarSections(items, t)
    const paths = out.filter((entry) => !('sectionTitle' in entry)).map((entry) => entry.path)

    // Every input item survives exactly once.
    expect(paths.sort()).toEqual(['/admin/dashboard', '/admin/settings', '/custom/7'])
    // Unclaimed entries fall into a trailing fallback section.
    const fallbackIndex = out.findIndex((entry) => entry.sectionTitle === 'nav.sections.other')
    expect(fallbackIndex).toBeGreaterThan(-1)
    expect(out.slice(fallbackIndex)).toContainEqual({ path: '/custom/7', label: 'Custom' })
  })

  it('omits a section whose entries are all hidden by feature flags', () => {
    const items = [item('/admin/dashboard'), item('/admin/users'), item('/admin/user-groups'), item('/admin/groups')]

    const out = applyMitoSidebarSections(items, t)
    const headings = out.filter((entry) => 'sectionTitle' in entry).map((entry) => entry.sectionTitle)

    expect(headings).toEqual(['nav.sections.overview', 'nav.sections.identity'])
    expect(headings).not.toContain('nav.sections.runtime')
  })

  it('preserves the declared order of items inside a section regardless of input order', () => {
    const items = [item('/admin/groups'), item('/admin/users'), item('/admin/user-groups')]

    const out = applyMitoSidebarSections(items, t)
    const identityIndex = out.findIndex((entry) => entry.sectionTitle === 'nav.sections.identity')
    const paths = out.slice(identityIndex + 1).map((entry) => entry.path)

    expect(paths).toEqual(['/admin/users', '/admin/user-groups', '/admin/groups'])
  })

  it('leaves the list untouched when the Mito theme is off', () => {
    theme.mito = false
    const items = [item('/admin/dashboard'), item('/admin/users')]

    expect(applyMitoSidebarSections(items, t)).toEqual(items)
  })

  it('uses a unique key for each heading so Vue does not reuse nodes', () => {
    const out = applyMitoSidebarSections([item('/admin/dashboard'), item('/admin/users')], t)
    const keys = out.map((entry) => entry.path)

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('groupMitoSidebarSections', () => {
  const heading = (key: string) => ({ path: `__section__${key}`, label: key, sectionTitle: key })

  it('collects items under the heading that precedes them', () => {
    const grouped = groupMitoSidebarSections([
      heading('a'), item('/1'), item('/2'),
      heading('b'), item('/3')
    ])

    expect(grouped.map((section) => section.label)).toEqual(['a', 'b'])
    expect(grouped[0].items.map((entry) => entry.path)).toEqual(['/1', '/2'])
    expect(grouped[1].items.map((entry) => entry.path)).toEqual(['/3'])
  })

  it('drops a heading that has no entries so no empty group renders', () => {
    const grouped = groupMitoSidebarSections([heading('a'), item('/1'), heading('empty'), heading('b'), item('/2')])

    expect(grouped.map((section) => section.label)).toEqual(['a', 'b'])
  })

  it('keeps items that appear before any heading in an implicit group', () => {
    const grouped = groupMitoSidebarSections([item('/orphan'), heading('a'), item('/1')])

    expect(grouped.map((section) => section.items.map((entry) => entry.path))).toEqual([['/orphan'], ['/1']])
  })

  it('returns nothing for an empty list', () => {
    expect(groupMitoSidebarSections([])).toEqual([])
  })

  it('gives every group a unique key', () => {
    const grouped = groupMitoSidebarSections([heading('a'), item('/1'), heading('b'), item('/2')])
    const keys = grouped.map((section) => section.path)

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('applyMitoUserSidebarSections', () => {
  const userPaths = [
    '/dashboard', '/keys', '/batch-image',
    '/usage', '/usage-stats',
    '/available-channels', '/monitor',
    '/subscriptions', '/purchase', '/orders', '/redeem', '/affiliate',
    '/support-tickets', '/profile'
  ]

  it('groups the regular-user menu in declared order', () => {
    const out = applyMitoUserSidebarSections(userPaths.map(item), t)
    const headings = out.filter((entry) => 'sectionTitle' in entry).map((entry) => entry.sectionTitle)

    expect(headings).toEqual([
      'nav.sections.workspace',
      'nav.sections.usage',
      'nav.sections.services',
      'nav.sections.billing',
      'nav.sections.account'
    ])
  })

  it('never drops a user entry, including unclaimed custom menus', () => {
    const out = applyMitoUserSidebarSections([item('/dashboard'), { path: '/custom/3', label: 'Custom' }], t)
    const paths = out.filter((entry) => !('sectionTitle' in entry)).map((entry) => entry.path)

    expect(paths).toContain('/custom/3')
    expect(out.at(-1)).toMatchObject({ path: '/custom/3' })
  })

  it('does not leak user section ids into the admin menu', () => {
    const out = applyMitoSidebarSections([item('/admin/dashboard'), item('/keys')], t)
    expect(out.map((entry) => entry.sectionTitle).filter(Boolean)).toEqual(['nav.sections.overview', 'nav.sections.other'])
  })
})
