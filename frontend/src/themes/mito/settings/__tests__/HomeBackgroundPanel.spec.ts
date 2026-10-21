import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import HomeBackgroundPanel from '../HomeBackgroundPanel.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('homepage background appearance controls', () => {
  it('updates the preview and parent values immediately, and restores the original appearance', async () => {
    const wrapper = mount(HomeBackgroundPanel, {
      props: {
        options: [{ value: 'local', label: 'Local' }],
        storage: 'local', imageUrl: '/example.png', uploading: false, error: '', blur: 0, overlay: 100,
        'onUpdate:blur': (value: number) => wrapper.setProps({ blur: value }),
        'onUpdate:overlay': (value: number) => wrapper.setProps({ overlay: value })
      },
      global: { stubs: { Icon: true } }
    })
    await wrapper.get('#home-background-blur').setValue('8')
    await wrapper.get('#home-background-overlay').setValue('35')
    expect(wrapper.emitted('update:blur')?.at(-1)).toEqual([8])
    expect(wrapper.emitted('update:overlay')?.at(-1)).toEqual([35])
    const preview = wrapper.get('.mito-background-preview-stage').element as HTMLElement
    expect(preview.style.getPropertyValue('--mito-home-blur')).toBe('8px')
    expect(preview.style.getPropertyValue('--mito-home-overlay')).toBe('0.35')
    await wrapper.get('button').trigger('click')
    expect(preview.style.getPropertyValue('--mito-home-blur')).toBe('0px')
    expect(preview.style.getPropertyValue('--mito-home-overlay')).toBe('1')
    wrapper.unmount()
  })
})
