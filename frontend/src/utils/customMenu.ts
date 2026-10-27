export type CustomMenuLike = {
  id: string
  label: string
  label_zh?: string
  label_en?: string
  icon_svg: string
  url: string
  visibility: 'user' | 'admin'
  sort_order: number
  parent_id?: string | null
}

export function getCustomMenuLabel(item: CustomMenuLike, locale: string): string {
  const preferredLabel = locale.toLowerCase().startsWith('zh') ? item.label_zh : item.label_en
  return preferredLabel?.trim() || item.label?.trim() || item.label_en?.trim() || item.label_zh?.trim() || ''
}
