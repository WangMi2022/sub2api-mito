export type CustomMenuLike = {
  id: string
  label: string
  label_zh?: string
  label_en?: string
  icon_svg: string
  url: string
  /** Override ordinary-user access independently from sidebar placement. */
  user_visible?: boolean
  admin_placement?: 'user' | 'admin'
  visibility: 'user' | 'admin'
  sort_order: number
  parent_id?: string | null
}

export function getCustomMenuLabel(item: CustomMenuLike, locale: string): string {
  const preferredLabel = locale.toLowerCase().startsWith('zh') ? item.label_zh : item.label_en
  return preferredLabel?.trim() || item.label?.trim() || item.label_en?.trim() || item.label_zh?.trim() || ''
}

export function isCustomMenuUserVisible(item: Pick<CustomMenuLike, 'visibility' | 'user_visible'>): boolean {
  return item.user_visible ?? item.visibility === 'user'
}

export function getCustomMenuAdminPlacement(item: Pick<CustomMenuLike, 'visibility' | 'admin_placement'>): 'user' | 'admin' {
  return item.admin_placement ?? item.visibility
}
