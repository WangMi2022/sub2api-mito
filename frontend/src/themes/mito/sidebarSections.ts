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
 *
 * The regular-user menu uses the same mechanism with its own section list.
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


/**
 * Regular-user menu sections. The user menu is much shorter than the admin
 * menu, but grouping it keeps the entry point scannable and lets the theme
 * render a calmer, more deliberate hierarchy.
 */
export const USER_SIDEBAR_SECTIONS: SectionSpec[] = [
  {
    id: 'workspace',
    labelKey: 'nav.sections.workspace',
    paths: ['/dashboard', '/keys', '/batch-image']
  },
  {
    id: 'usage',
    labelKey: 'nav.sections.usage',
    paths: ['/usage', '/usage-stats']
  },
  {
    id: 'services',
    labelKey: 'nav.sections.services',
    paths: ['/available-channels', '/monitor', '/pelican-showcase']
  },
  {
    id: 'billing',
    labelKey: 'nav.sections.billing',
    paths: ['/subscriptions', '/purchase', '/orders', '/redeem', '/affiliate']
  },
  {
    id: 'account',
    labelKey: 'nav.sections.account',
    paths: ['/support-tickets', '/profile']
  }
]

const FALLBACK_LABEL_KEY = 'nav.sections.other'

type Translate = (key: string) => string

/**
 * Insert one heading per non-empty section, preserving the relative order that
 * `SIDEBAR_SECTIONS` declares. Upstream theme builds get the list untouched.
 */
function applySections<T extends { path: string }>(
  specs: SectionSpec[],
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

  for (const section of specs) {
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

/** Insert section headings into the admin menu. */
export function applyMitoSidebarSections<T extends { path: string }>(
  items: T[],
  t: Translate
): T[] {
  return applySections(SIDEBAR_SECTIONS, items, t)
}

/** Insert section headings into the regular-user menu. */
export function applyMitoUserSidebarSections<T extends { path: string }>(
  items: T[],
  t: Translate
): T[] {
  return applySections(USER_SIDEBAR_SECTIONS, items, t)
}

export interface NavSection<T> {
  /** Stable key for the section wrapper. */
  path: string
  /** Already-translated section label. */
  label: string
  items: T[]
}

/**
 * Turn the flat, heading-annotated list into real groups so the template can
 * render a two-level hierarchy: section heading on top, its entries indented
 * beneath it.
 *
 * An item that is not preceded by a heading is placed in an implicit fallback
 * group, which keeps the function total — no entry can be dropped.
 */
export function groupMitoSidebarSections<T extends { path: string; sectionTitle?: string }>(
  items: T[]
): NavSection<T>[] {
  const sections: NavSection<T>[] = []
  let current: NavSection<T> | null = null

  for (const item of items) {
    if (item.sectionTitle) {
      current = { path: item.path, label: item.sectionTitle, items: [] }
      sections.push(current)
      continue
    }
    if (!current) {
      current = { path: '__section__implicit', label: '', items: [] }
      sections.push(current)
    }
    current.items.push(item)
  }

  // A heading with no surviving entries must not render as an empty group.
  return sections.filter((section) => section.items.length > 0)
}
