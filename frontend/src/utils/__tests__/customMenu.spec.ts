import { describe, expect, it } from 'vitest'
import { getCustomMenuLabel, isCustomMenuUserVisible, getCustomMenuAdminPlacement, getCustomMenuExternalUrl } from '@/utils/customMenu'

const menuItem = {
  id: 'help',
  label: 'Legacy name',
  label_zh: '帮助中心',
  label_en: 'Help Center',
  icon_svg: '',
  url: 'https://example.com',
  visibility: 'user' as const,
  sort_order: 0,
}

describe('getCustomMenuLabel', () => {
  it('selects the localized label for the active language', () => {
    expect(getCustomMenuLabel(menuItem, 'zh')).toBe('帮助中心')
    expect(getCustomMenuLabel(menuItem, 'en')).toBe('Help Center')
  })

  it('falls back to the legacy label, then to another available locale', () => {
    expect(getCustomMenuLabel({ ...menuItem, label_zh: '', label_en: '' }, 'zh')).toBe('Legacy name')
    expect(getCustomMenuLabel({ ...menuItem, label: '', label_zh: '帮助中心', label_en: '' }, 'en'))
      .toBe('帮助中心')
  })
})

describe('ordinary-user menu audience', () => {
  it('keeps legacy defaults and allows independent overrides for either placement', () => {
    expect(isCustomMenuUserVisible(menuItem)).toBe(true)
    expect(isCustomMenuUserVisible({ ...menuItem, visibility: 'admin' })).toBe(false)
    expect(isCustomMenuUserVisible({ ...menuItem, visibility: 'admin', user_visible: true })).toBe(true)
    expect(isCustomMenuUserVisible({ ...menuItem, user_visible: false })).toBe(false)
  })
})

it('preserves admin placement when the legacy audience changes for compatibility', () => {
  expect(getCustomMenuAdminPlacement({ visibility: 'user', admin_placement: 'admin' })).toBe('admin')
  expect(getCustomMenuAdminPlacement({ visibility: 'admin', admin_placement: 'user' })).toBe('user')
})

describe('direct custom menu links', () => {
  it('keeps legacy pages embedded and uses the destination URL without embedding parameters', () => {
    expect(getCustomMenuExternalUrl(menuItem)).toBeUndefined()
    expect(getCustomMenuExternalUrl({ ...menuItem, open_in_new_tab: false })).toBeUndefined()
    expect(getCustomMenuExternalUrl({ ...menuItem, open_in_new_tab: true, url: 'https://example.com/compute?project=one#nodes' }))
      .toBe('https://example.com/compute?project=one#nodes')
  })

  it.each(['javascript:alert(1)', 'data:text/html,test', '//example.com', 'md:help', ''])('rejects unsafe or in-app destination %s', (url) => {
    expect(getCustomMenuExternalUrl({ url, open_in_new_tab: true })).toBeUndefined()
  })
})
