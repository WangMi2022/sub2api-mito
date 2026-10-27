/**
 * Custom menu parenting.
 *
 * Administrators can nest a custom menu entry under one of the built-in
 * collapsible sidebar parents (for example 渠道管理). Both the settings page and
 * the sidebar read this module so the selectable options and the attachment
 * points can never drift apart.
 */

export interface SidebarParentOption {
  /** Sidebar path of the built-in parent item; also stored as `parent_id`. */
  value: string
  /** i18n key of the parent label, so options follow the active locale. */
  labelKey: string
}

/**
 * Built-in collapsible parents, in sidebar order. Only admin-side menus are
 * listed: the user-side navigation has no collapsible parents, so a custom entry
 * aimed at users has nowhere to nest.
 */
export const SIDEBAR_PARENT_OPTIONS: SidebarParentOption[] = [
  { value: '/admin/channels', labelKey: 'nav.channelManagement' },
  { value: '/admin/smart-ops', labelKey: 'accountOps.smartTitle' },
  { value: '/admin/security-audit', labelKey: 'nav.securityAudit' },
  { value: '/admin/affiliates', labelKey: 'nav.affiliateManagement' },
  { value: '/admin/orders', labelKey: 'nav.orderManagement' }
]

export function isKnownSidebarParent(value: string | null | undefined): boolean {
  return Boolean(value) && SIDEBAR_PARENT_OPTIONS.some((option) => option.value === value)
}

interface NavItemLike {
  path: string
  children?: unknown[]
}

/**
 * Place every custom entry into the sidebar: as a child of its declared parent
 * when that parent is present, otherwise at top level.
 *
 * Falling back to top level is deliberate. A parent can be absent because its
 * feature flag is off, or because it was renamed; hiding the entry in that case
 * would silently drop something an administrator configured.
 */
export function attachCustomMenuItems<T extends NavItemLike>(
  items: T[],
  menus: CustomMenuLike[],
  createItem: (menu: CustomMenuLike) => T
): T[] {
  for (const menu of menus) {
    const child = createItem(menu)
    const parent = menu.parent_id
      ? items.find((item) => item.path === menu.parent_id)
      : undefined

    if (parent) {
      parent.children = [...(parent.children ?? []), child]
    } else {
      items.push(child)
    }
  }
  return items
}
import type { CustomMenuLike } from '@/utils/customMenu'

