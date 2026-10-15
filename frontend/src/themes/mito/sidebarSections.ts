/**
 * Mito sidebar sections.
 *
 * The upstream sidebar renders the admin menu as one flat list. This theme layer
 * inserts non-clickable section headings so the 20+ entries stay scannable,
 * without changing the upstream menu structure, ordering source or permissions.
 *
 * Only the presentation order changes: every item that upstream produced is
 * still rendered, and items this module does not know about (custom menus,
 * simple-mode entries) fall into a trailing fallback section instead of
 * disappearing.
 */
import { isMitoTheme } from './index'

interface SectionSpec {
  /** Stable identifier; also the i18n key suffix. */
  id: string
  labelKey: string
  /** Item paths in the order they should render inside the section. */
  paths: string[]
}

/**
 * Declaration order is the rendered order. Paths are matched against the items
 * that survived the upstream feature-flag filtering, so a section whose entries
 * are all switched off simply is not rendered.
 */
export const SIDEBAR_SECTIONS: SectionSpec[] = [
  {
    id: 'overview',
    labelKey: 'nav.sections.overview',
    paths: ['/admin/dashboard', '/admin/ops']
  },
  {
    id: 'identity',
    labelKey: 'nav.sections.identity',
    paths: ['/admin/users', '/admin/user-groups', '/admin/groups']
  },
  {
    id: 'runtime',
    labelKey: 'nav.sections.runtime',
    paths: ['/admin/channels', '/admin/accounts', '/admin/smart-ops', '/admin/proxies']
  },
  {
    id: 'commerce',
    labelKey: 'nav.sections.commerce',
    paths: ['/admin/orders', '/admin/subscriptions', '/admin/affiliates', '/admin/redeem', '/admin/promo-codes']
  },
  {
    id: 'insights',
    labelKey: 'nav.sections.insights',
    paths: ['/admin/usage', '/admin/audit-logs', '/admin/security-audit']
  },
  {
    id: 'system',
    labelKey: 'nav.sections.system',
    paths: ['/admin/announcements', '/admin/support-tickets', '/admin/plugins', '/admin/settings']
  }
]

const FALLBACK_LABEL_KEY = 'nav.sections.other'

type Translate = (key: string) => string

/**
 * Insert one heading per non-empty section, preserving the relative order that
 * `SIDEBAR_SECTIONS` declares. Upstream theme builds get the list untouched.
 */
export function applyMitoSidebarSections<T extends { path: string }>(
  items: T[],
  t: Translate
): T[] {
  if (!isMitoTheme) return items

  const consumed = new Set<string>()
  const out: T[] = []

  const pushSection = (labelKey: string, sectionItems: T[]): void => {
    if (sectionItems.length === 0) return
    out.push({
      path: `__section__${labelKey}`,
      label: t(labelKey),
      sectionTitle: t(labelKey)
    } as unknown as T)
    out.push(...sectionItems)
  }

  for (const section of SIDEBAR_SECTIONS) {
    const matched: T[] = []
    for (const path of section.paths) {
      const item = items.find((candidate) => candidate.path === path && !consumed.has(candidate.path))
      if (!item) continue
      consumed.add(item.path)
      matched.push(item)
    }
    pushSection(section.labelKey, matched)
  }

  pushSection(FALLBACK_LABEL_KEY, items.filter((item) => !consumed.has(item.path)))
  return out
}
