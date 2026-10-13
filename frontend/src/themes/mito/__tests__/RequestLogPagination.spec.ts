import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import RequestLogPagination from '../RequestLogPagination.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key, locale: { value: 'en' } }) }))
let wrapper: VueWrapper
beforeEach(() => { localStorage.clear(); delete window.__APP_CONFIG__ })
afterEach(() => { wrapper?.unmount(); delete window.__APP_CONFIG__ })

describe('request log pagination', () => {
  it('uses configured sizes and persists both segmented and slider selections', async () => {
    window.__APP_CONFIG__ = { table_page_size_options: [15, 30, 60] } as typeof window.__APP_CONFIG__
    wrapper = mount(RequestLogPagination, { props: { page: 1, total: 300, pageSize: 30 } })
    const sizes = wrapper.findAll('.mito-page-size-segments button')
    expect(sizes.map(button => button.text())).toEqual(['15', '30', '60'])
    expect(sizes[1].attributes('aria-pressed')).toBe('true')
    await sizes[2].trigger('click')
    expect(wrapper.emitted('update:pageSize')).toEqual([[60]])
    expect(localStorage.getItem('table-page-size')).toBe('60')
    await wrapper.get('input[type="range"]').setValue('0')
    expect(wrapper.emitted('update:pageSize')).toEqual([[60], [15]])
  })

  it('keeps current and boundary pages reachable with gaps', async () => {
    wrapper = mount(RequestLogPagination, { props: { page: 10, total: 1000, pageSize: 20 } })
    expect(wrapper.get('[aria-current="page"]').text()).toBe('10')
    expect(wrapper.findAll('nav span').map(node => node.text())).toEqual(['…', '…'])
    const buttons = wrapper.findAll('nav button')
    expect(buttons.map(button => button.text())).toEqual(['pagination.previous', '1', '8', '9', '10', '11', '12', '50', 'pagination.next'])
    await buttons[0].trigger('click')
    await buttons.at(-1)!.trigger('click')
    expect(wrapper.emitted('update:page')).toEqual([[9], [11]])
  })

  it('disables unavailable pages and all controls while loading', async () => {
    wrapper = mount(RequestLogPagination, { props: { page: 1, total: 0, pageSize: 20 } })
    const buttons = wrapper.findAll('nav button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons.at(-1)!.attributes('disabled')).toBeDefined()
    await wrapper.setProps({ disabled: true })
    expect(wrapper.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  })
})
