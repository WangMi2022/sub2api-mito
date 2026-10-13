import { describe, expect, it, vi } from 'vitest'
import { h, ref, withDirectives, vShow } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'zh-CN' },
    t: (key: string) => key,
  }),
}))

import FilterSection from '../FilterSection.vue'

describe('Mito FilterSection', () => {
  it('starts collapsed, preserves filter values and selected counts, and can expand and collapse', async () => {
    const filter = ref('saved filter')
    const wrapper = mount(FilterSection, {
      attachTo: document.body,
      props: { selectedCount: 3 },
      slots: {
        default: ({ expanded, panelId }: { expanded: boolean; panelId: string }) =>
          withDirectives(h('section', { id: panelId, 'data-expanded': String(expanded) }, [
            h('input', {
              value: filter.value,
              onInput: (event: Event) => { filter.value = (event.target as HTMLInputElement).value },
            }),
          ]), [[vShow, expanded]]),
      },
      global: {
        stubs: {
          Icon: { template: '<span aria-hidden="true" />' },
        },
      },
    })

    const toggle = wrapper.get('button[aria-controls]')
    const panelId = toggle.attributes('aria-controls')
    const panel = wrapper.get('[data-expanded]')
    expect(panel.attributes('id')).toBe(panelId)

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.text()).toContain('3')
    expect(panel.attributes('data-expanded')).toBe('false')
    expect(panel.isVisible()).toBe(false)
    expect(wrapper.find('.mito-filter-section--collapsed').exists()).toBe(true)

    const input = panel.get('input')
    await input.setValue('updated filter')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(panel.isVisible()).toBe(true)
    expect(panel.get('input').element).toBe(input.element)
    expect(input.element.value).toBe('updated filter')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(panel.exists()).toBe(true)
    expect(panel.isVisible()).toBe(false)
    expect(input.element.value).toBe('updated filter')
    expect(toggle.text()).toContain('3')
    expect(wrapper.find('.mito-filter-section--collapsed').exists()).toBe(true)
    wrapper.unmount()
  })
})
