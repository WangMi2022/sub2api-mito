import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import type { Column } from '@/components/common/types'
import { withAccountColumnSizes } from '../accountTableColumns'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'zh-CN' }, t: (key: string) => key }),
}))

const storageKey = 'test-account-column-widths'
const columns: Column[] = [
  { key: 'name', label: '名称', sortable: true, width: 200, minWidth: 120, maxWidth: 360 },
  { key: 'status', label: '状态', width: 140, minWidth: 100 },
  { key: 'actions', label: '操作', width: 200, minWidth: 180 },
]
const rows = [
  { id: 1, name: 'Beta', status: 'active' },
  { id: 2, name: 'Alpha', status: 'inactive' },
]
const mounted: VueWrapper[] = []

function viewport(desktop: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: desktop,
    media: query,
    onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
}

function createTable(props: Partial<InstanceType<typeof DataTable>['$props']> = {}) {
  const wrapper = mount(DataTable, {
    attachTo: document.body,
    props: { columns, data: rows, resizableColumns: true, columnWidthStorageKey: storageKey, ...props },
  })
  mounted.push(wrapper)
  return wrapper
}

function unmountTable(wrapper: VueWrapper) {
  wrapper.unmount()
  mounted.splice(mounted.indexOf(wrapper), 1)
}

const handle = (wrapper: VueWrapper, key = 'name') =>
  wrapper.get(`th[data-column-key="${key}"] [role="separator"]`)
const width = (wrapper: VueWrapper, key = 'name') =>
  (wrapper.get(`col[data-column-key="${key}"]`).element as HTMLElement).style.width
const saved = () => JSON.parse(localStorage.getItem(storageKey) || 'null')

async function pointer(
  target: EventTarget, type: string, clientX: number,
  options: { pointerId?: number; button?: number; isPrimary?: boolean } = {},
) {
  // jsdom has MouseEvent but not PointerEvent; preserve the actual pointer lifecycle fields.
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: options.button ?? 0 })
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 7 },
    isPrimary: { value: options.isPrimary ?? true },
  })
  target.dispatchEvent(event)
  await nextTick()
  await nextTick()
}

beforeEach(() => {
  localStorage.clear()
  viewport(true)
})
afterEach(() => {
  for (const wrapper of [...mounted]) unmountTable(wrapper)
  vi.restoreAllMocks()
  document.documentElement.classList.remove('mito-column-resizing')
})

describe('Mito table column sizing', () => {
  it('drags a whole column, commits on release, and keeps resize clicks separate from sorting', async () => {
    const wrapper = createTable()
    const separator = handle(wrapper)
    const table = wrapper.get('table').element as HTMLTableElement
    expect(table.style.width).toBe('540px')
    expect(table.style.tableLayout).toBe('fixed')
    expect(separator.attributes('aria-label')).toContain('名称')

    await pointer(separator.element, 'pointerdown', 100)
    expect(document.activeElement).toBe(separator.element)
    await pointer(window, 'pointermove', 160)
    expect(width(wrapper)).toBe('260px')
    expect(table.style.width).toBe('600px')
    expect(wrapper.findAll('tbody td[data-column-key="name"]')).toHaveLength(2)
    expect(separator.attributes('aria-valuenow')).toBe('260')
    expect(saved()).toBeNull()
    expect(document.documentElement.classList.contains('mito-column-resizing')).toBe(true)

    await pointer(window, 'pointerup', 180)
    await separator.trigger('click')
    expect(width(wrapper)).toBe('280px')
    expect(saved().widths.name).toBe(280)
    expect(document.documentElement.classList.contains('mito-column-resizing')).toBe(false)
    expect(wrapper.emitted('sort')).toBeUndefined()

    await wrapper.get('th[data-column-key="name"]').trigger('click')
    expect(wrapper.get('th[data-column-key="name"]').attributes('aria-sort')).toBe('ascending')
    expect(wrapper.emitted('sort')).toBeUndefined()
    expect(wrapper.findAll('tbody td[data-column-key="name"]').map(cell => cell.text())).toEqual(['Alpha', 'Beta'])
    expect(width(wrapper)).toBe('280px')
  })

  it('preserves server-side sort events while keeping resize clicks separate', async () => {
    const wrapper = createTable({ serverSideSort: true })
    await handle(wrapper).trigger('keydown', { key: 'ArrowRight' })
    await handle(wrapper).trigger('click')
    expect(wrapper.emitted('sort')).toBeUndefined()
    await wrapper.get('th[data-column-key="name"]').trigger('click')
    expect(wrapper.emitted('sort')?.at(-1)).toEqual(['name', 'asc'])
    expect(wrapper.findAll('tbody td[data-column-key="name"]').map(cell => cell.text())).toEqual(['Beta', 'Alpha'])
    expect(width(wrapper)).toBe('208px')
  })

  it('limits pointer resizing to the declared minimum and maximum', async () => {
    const wrapper = createTable()
    await pointer(handle(wrapper).element, 'pointerdown', 100)
    await pointer(window, 'pointermove', -1000)
    expect(width(wrapper)).toBe('120px')
    await pointer(window, 'pointerup', 1000)
    expect(width(wrapper)).toBe('360px')
    expect(saved().widths.name).toBe(360)
  })

  it('accounts for horizontal scrolling during a drag', async () => {
    const wrapper = createTable()
    const scroll = wrapper.get('.table-wrapper').element
    scroll.scrollLeft = 30
    await pointer(handle(wrapper).element, 'pointerdown', 100)
    scroll.scrollLeft = 50
    await pointer(window, 'pointerup', 120)
    expect(width(wrapper)).toBe('240px')
  })

  it('supports keyboard increments and bounds, and double-click restores the default', async () => {
    const wrapper = createTable()
    const separator = handle(wrapper)
    await separator.trigger('keydown', { key: 'ArrowRight' })
    expect(width(wrapper)).toBe('208px')
    await separator.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
    expect(width(wrapper)).toBe('184px')
    await separator.trigger('keydown', { key: 'Home' })
    expect(width(wrapper)).toBe('120px')
    await separator.trigger('keydown', { key: 'End' })
    expect(width(wrapper)).toBe('360px')
    await separator.trigger('dblclick')
    expect(width(wrapper)).toBe('200px')
    expect(saved().widths.name).toBeUndefined()
    expect(wrapper.emitted('sort')).toBeUndefined()
  })

  it('restores saved widths by field after hiding, reordering and remounting columns', async () => {
    const wrapper = createTable()
    await handle(wrapper).trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    await wrapper.setProps({ columns: [columns[1], columns[2]] })
    expect(wrapper.find('col[data-column-key="name"]').exists()).toBe(false)
    await wrapper.setProps({ columns: [columns[1], columns[0], columns[2]] })
    expect(width(wrapper)).toBe('224px')
    expect(width(wrapper, 'status')).toBe('140px')
    unmountTable(wrapper)
    const remounted = createTable({ columns: [columns[1], columns[0], columns[2]] })
    expect(width(remounted)).toBe('224px')
    expect(width(remounted, 'status')).toBe('140px')
  })

  it.each(['bad-json', '{"version":2,"widths":{"name":300}}', '{"version":1,"widths":[]}', '{"version":1,"widths":{"name":"300","status":-4}}']) (
    'ignores malformed or unsupported stored preferences: %s', state => {
      localStorage.setItem(storageKey, state)
      const wrapper = createTable()
      expect(width(wrapper)).toBe('200px')
      expect(width(wrapper, 'status')).toBe('140px')
    },
  )

  it('clamps previously saved widths when the column bounds change', () => {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, widths: { name: 9999, status: 1 } }))
    const wrapper = createTable()
    expect(width(wrapper)).toBe('360px')
    expect(width(wrapper, 'status')).toBe('100px')
  })

  it('continues resizing when reading and writing browser storage fail', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('storage unavailable') })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('storage unavailable') })
    const wrapper = createTable()
    expect(width(wrapper)).toBe('200px')
    await handle(wrapper).trigger('keydown', { key: 'ArrowRight' })
    expect(width(wrapper)).toBe('208px')
    await pointer(handle(wrapper).element, 'pointerdown', 100)
    await pointer(window, 'pointerup', 120)
    expect(width(wrapper)).toBe('228px')
  })

  it('keeps separate table preference keys isolated', async () => {
    const wrapper = createTable()
    await handle(wrapper).trigger('keydown', { key: 'ArrowRight' })
    await wrapper.setProps({ columnWidthStorageKey: 'another-table' })
    expect(width(wrapper)).toBe('200px')
    await handle(wrapper).trigger('keydown', { key: 'ArrowLeft' })
    await wrapper.setProps({ columnWidthStorageKey: storageKey })
    expect(width(wrapper)).toBe('208px')
  })

  it.each(['Escape', 'pointercancel', 'blur', 'lostpointercapture']) (
    'cancels on %s without saving the interrupted width', async reason => {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, widths: { name: 224 } }))
      const wrapper = createTable()
      const separator = handle(wrapper)
      await pointer(separator.element, 'pointerdown', 100)
      await pointer(window, 'pointermove', 140)
      expect(width(wrapper)).toBe('264px')
      if (reason === 'Escape') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
      } else if (reason === 'pointercancel') {
        await pointer(window, reason, 140)
      } else {
        (reason === 'blur' ? window : separator.element).dispatchEvent(new Event(reason))
      }
      await nextTick()
      expect(width(wrapper)).toBe('224px')
      expect(saved().widths.name).toBe(224)
      expect(document.documentElement.classList.contains('mito-column-resizing')).toBe(false)
      await pointer(window, 'pointermove', 220)
      expect(width(wrapper)).toBe('224px')
    },
  )

  it('cancels and detaches active pointer listeners on unmount', async () => {
    const wrapper = createTable()
    await pointer(handle(wrapper).element, 'pointerdown', 100)
    await pointer(window, 'pointermove', 160)
    unmountTable(wrapper)
    expect(document.documentElement.classList.contains('mito-column-resizing')).toBe(false)
    await pointer(window, 'pointerup', 180)
    expect(saved()).toBeNull()
    const next = createTable()
    expect(width(next)).toBe('200px')
  })

  it('cancels an active drag when its column is hidden', async () => {
    const wrapper = createTable()
    await pointer(handle(wrapper).element, 'pointerdown', 100)
    await pointer(window, 'pointermove', 160)
    await wrapper.setProps({ columns: columns.slice(1) })
    await pointer(window, 'pointerup', 200)
    expect(saved()).toBeNull()
    expect(document.documentElement.classList.contains('mito-column-resizing')).toBe(false)
    await wrapper.setProps({ columns })
    expect(width(wrapper)).toBe('200px')
  })

  it('ignores right clicks, secondary touches and unrelated pointer IDs', async () => {
    const wrapper = createTable()
    await pointer(handle(wrapper).element, 'pointerdown', 100, { button: 2 })
    await pointer(window, 'pointerup', 160)
    expect(width(wrapper)).toBe('200px')
    await pointer(handle(wrapper).element, 'pointerdown', 100, { isPrimary: false })
    await pointer(window, 'pointerup', 160)
    expect(width(wrapper)).toBe('200px')
    await pointer(handle(wrapper).element, 'pointerdown', 100)
    await pointer(window, 'pointerup', 160, { pointerId: 99 })
    expect(width(wrapper)).toBe('200px')
    await pointer(window, 'pointerup', 160)
    expect(width(wrapper)).toBe('260px')
  })

  it('preserves selection and fixed columns while resizing an account table', async () => {
    const wrapper = createTable({
      columns: withAccountColumnSizes([{ key: 'select', label: '' }, ...columns]),
      stickyFirstColumn: true, stickyActionsColumn: true,
    })
    expect(width(wrapper, 'select')).toBe('52px')
    expect(wrapper.find('th[data-column-key="select"] [role="separator"]').exists()).toBe(false)
    expect(wrapper.get('th[data-column-key="name"]').classes()).toContain('sticky-col-left-second')
    expect(wrapper.get('th[data-column-key="actions"]').classes()).toContain('sticky-col-right')
    expect((wrapper.get('.table-wrapper').element as HTMLElement).style.getPropertyValue('--select-col-width')).toBe('52px')
    await handle(wrapper).trigger('keydown', { key: 'ArrowRight' })
    expect(width(wrapper)).toBe('248px')
    expect(wrapper.findAll('tbody tr[data-row-id]')).toHaveLength(2)
    expect(wrapper.get('tbody td[data-column-key="actions"]').classes()).toContain('sticky-col-right')
  })

  it('keeps built-in checkboxes independent from resize controls', async () => {
    const wrapper = createTable({ selectable: true, selectedKeys: [], rowKey: 'id' })
    await wrapper.get('input[data-test="select-all"]').setValue(true)
    expect(wrapper.emitted('update:selectedKeys')?.at(-1)).toEqual([[1, 2]])
    await handle(wrapper).trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:selectedKeys')).toHaveLength(1)
    expect((wrapper.get('table').element as HTMLTableElement).style.width).toBe('592px')
  })

  it('keeps the virtual row window populated after resizing', async () => {
    // jsdom has no layout: supply the row height that the real virtualizer measures.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-index') ? 56 : 448
    })
    const data = Array.from({ length: 100 }, (_, index) => ({ id: index + 1, name: `Row ${index + 1}` }))
    const wrapper = createTable({ data, virtualizeThreshold: 3, estimateRowHeight: 56 })
    await nextTick()
    const count = wrapper.findAll('tbody tr[data-row-id]').length
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(data.length)
    await pointer(handle(wrapper).element, 'pointerdown', 100)
    await pointer(window, 'pointerup', 150)
    expect(width(wrapper)).toBe('250px')
    expect(wrapper.findAll('tbody tr[data-row-id]')).toHaveLength(count)
    expect(wrapper.find('tbody tr[aria-hidden="true"]').exists()).toBe(true)
  })

  it('requires an explicit opt-in and leaves mobile cards without resize controls', () => {
    const disabled = createTable({ resizableColumns: false })
    expect(disabled.find('[role="separator"]').exists()).toBe(false)
    expect(disabled.find('colgroup').exists()).toBe(false)
    expect((disabled.get('table').element as HTMLTableElement).style.width).toBe('')
    viewport(false)
    const mobile = createTable()
    expect(mobile.find('table').exists()).toBe(false)
    expect(mobile.find('[role="separator"]').exists()).toBe(false)
    expect(mobile.find('.mito-mobile-table').exists()).toBe(true)
    expect(mobile.text()).toContain('Beta')
  })
})
